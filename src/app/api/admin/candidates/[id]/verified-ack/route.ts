import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate } from "@/lib/store";
import { sendVerifiedAckEmail } from "@/lib/candidateEmails";

/**
 * Tell a verified candidate with no voice recording that their information is
 * verified and we will be in touch about a place. See lib/verifiedAck.
 *
 * The work lives in candidateEmails, so this route and a paced batch send the
 * same message under the same guards.
 */

export const runtime = "nodejs";

/** Refusals that are about the candidate rather than about the mail server. */
const CONFLICT = new Set(["not_verified", "has_recording", "already_offered", "rejected", "assessment_failed"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await sendVerifiedAckEmail(id);

  if (!result.ok) {
    const status =
      result.reason === "not_found"
        ? 404
        : CONFLICT.has(result.reason)
          ? 409
          : result.reason === "no_email"
            ? 400
            : 502;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  const updated = await getCandidate(id);
  return NextResponse.json({
    ok: true,
    verifiedAckSentAt: updated?.verifiedAckSentAt,
    verifiedAcks: updated?.verifiedAcks,
    voiceStatus: updated?.voiceStatus,
    status: updated?.status,
  });
}
