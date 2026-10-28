import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { getMember, mutateMember } from "@/lib/teamStore";
import { MAX_DOCUMENT_BYTES, storeTeamFile } from "@/lib/teamFiles";
import { deleteObject } from "@/lib/r2";
import { newId } from "@/lib/id";

/**
 * Documents shared with one member — a signed agreement, a letter — which
 * appear on their Documents page.
 *
 *   POST   form { file, name? }   add one (PDF or image, up to 10 MB)
 *   DELETE ?doc=<id>              remove one
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  if (!(await getMember(id))) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_DOCUMENT_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, problems: ["The file is larger than 10 MB."] }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, problems: ["Choose a file."] }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ ok: false, problems: ["Choose a file."] }, { status: 400 });
  const stored = await storeTeamFile(id, file, "document");
  if (!stored.ok) return NextResponse.json({ ok: false, problems: [stored.problem] }, { status: 400 });
  const label = typeof form.get("name") === "string" ? String(form.get("name")).trim().slice(0, 80) : "";
  await mutateMember(id, (m) => {
    m.documents = [
      { id: newId(8), key: stored.key, name: label || stored.name, type: stored.type, size: stored.size, at: new Date().toISOString(), by },
      ...(m.documents ?? []),
    ];
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const docId = req.nextUrl.searchParams.get("doc");
  const member = await getMember(id);
  const doc = member?.documents?.find((d) => d.id === docId);
  if (!member || !doc) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await mutateMember(id, (m) => {
    m.documents = (m.documents ?? []).filter((d) => d.id !== docId);
  });
  await deleteObject(doc.key);
  return NextResponse.json({ ok: true });
}
