import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import { clearPanDocuments, getCandidate } from "@/lib/store";
import { deleteObjects } from "@/lib/r2";

/**
 * Recruiter actions on a candidate's PAN card. One so far:
 *
 *   clear   delete both sides from storage, keep that they said they had one
 *
 * The card is only ever sent by the candidate, from the offer page — there is
 * nothing to request from here. See lib/pan.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const session = await getAdminSession();
  const { id } = await ctx.params;

  let body: { action?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (body.action !== "clear") {
    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  if (!(await getCandidate(id))) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const keys = await clearPanDocuments(id);
  if (keys.length) await deleteObjects(keys).catch(() => {});
  const updated = await getCandidate(id);
  // eslint-disable-next-line no-console
  console.log(`[pan] ${id} PAN card cleared by ${session?.u ?? "admin"} (${keys.length})`);
  return NextResponse.json({ ok: true, removed: keys.length, panDeletedAt: updated?.panDeletedAt });
}
