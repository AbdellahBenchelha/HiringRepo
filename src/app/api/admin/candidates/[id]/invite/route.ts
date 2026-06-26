import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { recordInvitation } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const updated = await recordInvitation(id);
  if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, invitationSentAt: updated.invitationSentAt, status: updated.status });
}
