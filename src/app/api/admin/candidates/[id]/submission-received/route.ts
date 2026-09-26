import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordSubmissionAck } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { verificationStatus } from "@/lib/verification";
import { submissionAwaitingReview } from "@/lib/submissionAck";
import { sendEmail } from "@/lib/email";
import {
  submissionReceivedHtml,
  submissionReceivedSubject,
  submissionReceivedText,
} from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";

/**
 * Tell a candidate their submission arrived and is under review.
 *
 * By hand, from the ID check tab, never automatically: whether it is worth
 * saying — and whether "one to three business days" is true this week — is a
 * recruiter's call. Refused unless something is actually waiting for review,
 * for the reasons in lib/submissionAck.
 *
 * Recorded only once the email is accepted. A record saying they were told,
 * for an email that never left, is the worst version of this: the panel shows
 * it done and nobody sends it again.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const verification = verificationStatus(candidate, await requiredCountries());
  if (!submissionAwaitingReview(verification, candidate)) {
    return NextResponse.json({ ok: false, error: "nothing_to_review" }, { status: 409 });
  }

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  const payload = { fullName: candidate.fullName || "Candidate" };
  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: submissionReceivedSubject(),
    html: submissionReceivedHtml(payload),
    text: submissionReceivedText(payload),
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[submission-ack] not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  const updated = await recordSubmissionAck(id);
  // eslint-disable-next-line no-console
  console.log(`[submission-ack] sent to ${email} (${updated?.submissionAckCount ?? 1})`);
  return NextResponse.json({
    ok: true,
    submissionAckSentAt: updated?.submissionAckSentAt,
    submissionAckCount: updated?.submissionAckCount,
    submissionAcks: updated?.submissionAcks,
  });
}
