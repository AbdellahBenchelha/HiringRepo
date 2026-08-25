import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { deleteCandidate, documentKeys } from "@/lib/store";
import { deleteObjects } from "@/lib/r2";

/** Permanently delete a candidate. No undo — the record holds personal data. */

export const runtime = "nodejs";

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
  // eslint-disable-next-line no-console
  console.log(`[admin] candidate ${id} deleted`);
  return NextResponse.json({ ok: true });
}
