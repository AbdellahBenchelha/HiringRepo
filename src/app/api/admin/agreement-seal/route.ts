import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { getSealSettings, isSealKind, loadSealImage, removeSealImage, saveSealImage, MAX_SEAL_BYTES } from "@/lib/agreementSeal";

/**
 * The signature and stamp printed on the final agreement — see
 * lib/agreementSeal. Admin only.
 *
 *   GET  ?file=signature|stamp   the image, to show in Settings
 *   POST multipart kind, file    upload (replaces the one before)
 *   POST { action: "remove", kind }
 */

export const runtime = "nodejs";

function view(s: Awaited<ReturnType<typeof getSealSettings>>) {
  const one = (k: "signature" | "stamp") => (s[k] ? { uploadedAt: s[k]!.uploadedAt, by: s[k]!.by } : null);
  return { signature: one("signature"), stamp: one("stamp") };
}

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const kind = req.nextUrl.searchParams.get("file");
  if (!isSealKind(kind)) return NextResponse.json({ ok: true, ...view(await getSealSettings()) });
  const img = await loadSealImage(kind);
  if (!img) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return new NextResponse(Buffer.from(img.bytes), {
    headers: { "Content-Type": img.type, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";

  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, problems: ["The upload did not arrive."] }, { status: 400 });
    }
    const kind = form.get("kind");
    const file = form.get("file");
    if (!isSealKind(kind) || !(file instanceof File) || !file.size) {
      return NextResponse.json({ ok: false, problems: ["Choose an image to upload."] }, { status: 400 });
    }
    if (file.size > MAX_SEAL_BYTES) {
      return NextResponse.json({ ok: false, problems: ["The image is larger than 5 MB."] }, { status: 400 });
    }
    const result = await saveSealImage(kind, new Uint8Array(await file.arrayBuffer()), by);
    if (!result.ok) return NextResponse.json({ ok: false, problems: [result.error] }, { status: 400 });
    // eslint-disable-next-line no-console
    console.log(`[agreement] ${kind} image updated by ${by}`);
    return NextResponse.json({ ok: true, ...view(result.settings) });
  }

  let body: { action?: unknown; kind?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (body.action === "remove" && isSealKind(body.kind)) {
    const settings = await removeSealImage(body.kind);
    // eslint-disable-next-line no-console
    console.log(`[agreement] ${body.kind} image removed by ${by}`);
    return NextResponse.json({ ok: true, ...view(settings) });
  }
  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
