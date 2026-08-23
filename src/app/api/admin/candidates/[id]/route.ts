import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { deleteCandidate } from "@/lib/store";

/** Permanently delete a candidate. No undo — the record holds personal data. */

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const removed = await deleteCandidate(id);
  if (!removed) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  // eslint-disable-next-line no-console
  console.log(`[admin] candidate ${id} deleted`);
  return NextResponse.json({ ok: true });
}
