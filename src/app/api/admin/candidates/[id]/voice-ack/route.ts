import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate } from "@/lib/store";
import { sendVoiceAckEmail } from "@/lib/candidateEmails";

/**
 * Tell a candidate their recording arrived and a decision is coming.
 *
 * The work lives in candidateEmails, so this route and a paced batch send the
 * same message under the same guards — and both leave the candidate in "Under
 * Review", which is precisely what the email has just told them.
 *
 * Refused for anybody it would be untrue to: no recording to acknowledge, an
 * offer already sent, or an assessment already marked failed. The last one
 * matters most — "we will be in touch about a place" to somebody already
 * judged unsuitable is not a holding message, it is a false one.
 */

export const runtime = "nodejs";

/** Refusals that are about the candidate rather than about the mail server. */
const CONFLICT = new Set(["no_recording", "already_offered", "assessment_failed"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await sendVoiceAckEmail(id);

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

  // Read back rather than trusting what was sent: the status change is part of
  // what happened, and the panel updates its row from this answer.
  const updated = await getCandidate(id);
  return NextResponse.json({
    ok: true,
    voiceAckSentAt: updated?.voiceAckSentAt,
    voiceAckCount: updated?.voiceAckCount,
    voiceAcks: updated?.voiceAcks,
    status: updated?.status,
  });
}
