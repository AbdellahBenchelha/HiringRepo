import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { deleteCandidate, documentKeys, getCandidate } from "@/lib/store";
import { toCandidateView } from "@/lib/candidateView";
import { requiredCountries } from "@/lib/verificationStore";
import { deleteObjects } from "@/lib/r2";
import { deleteSessionsForCandidate } from "@/lib/chatStore";

/**
 *   GET     one candidate, as View info shows them — for opening View info from
 *           somewhere that has only their id (the Live chat tab)
 *   DELETE  permanently delete a candidate. No undo — the record holds personal data.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const [c, required] = await Promise.all([getCandidate(id), requiredCountries()]);
  if (!c) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  // The same view the tables are given — nothing more (no SSN).
  return NextResponse.json(
    { ok: true, candidate: toCandidateView(c, baseUrl(req), required) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const removed = await deleteCandidate(id);
  if (!removed) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Their uploaded documents go too. Leaving CVs in the bucket after erasing
  // the person they belong to is exactly what the privacy policy promises not
  // to do, and nothing would ever point at them again.
  const keys = documentKeys(removed);
  if (keys.length) {
    await deleteObjects(keys);
    // eslint-disable-next-line no-console
    console.log(`[admin] deleted ${keys.length} document(s) for ${id}`);
  }
  // And their interview chats: a transcript is personal data like any other.
  await deleteSessionsForCandidate(id).catch(() => 0);
  // eslint-disable-next-line no-console
  console.log(`[admin] candidate ${id} deleted`);
  return NextResponse.json({ ok: true });
}
