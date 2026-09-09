import { getCandidate, claimInterviewEmail, releaseInterviewEmail, recordReminder } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  interviewInviteHtml,
  interviewInviteSubject,
  interviewInviteText,
  reminderHtml,
  reminderSubject,
  reminderText,
} from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";
import { withSource } from "@/lib/followUp";

/**
 * The two emails a recruiter sends to somebody who has not sat the assessment.
 *
 * SERVER-ONLY. Extracted out of the per-candidate routes so the row buttons
 * and a paced batch run the same code rather than two copies of it: a batch
 * that reimplemented "send an invitation" would drift from the button within a
 * month, and the difference would only show up in somebody's inbox.
 *
 * Each function does the whole job for one candidate — the guards, the send,
 * and the bookkeeping — and reports what happened. Neither throws for an
 * ordinary refusal: "they have already finished" is an answer, not a fault,
 * and a batch has to keep going past it.
 */

export type SendOutcome =
  | { ok: true }
  /** Refused before anything was sent. */
  | { ok: false; reason: string };

/** Their assessment link, the same permanent one every message uses. */
function interviewUrl(baseUrl: string, id: string, source: "invite-email" | "reminder-email") {
  return withSource(`${baseUrl}/interview?c=${id}`, source);
}

/**
 * Send the assessment invitation.
 *
 * The claim is what makes this safe to call twice: it is the same one the
 * automatic path takes on submit, so a double click, a retried batch and a
 * resumed queue all lose the race rather than sending a second copy. It is
 * handed back if the email itself fails, so a genuine failure can be retried.
 */
export async function sendAssessmentEmail(id: string, baseUrl: string): Promise<SendOutcome> {
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, reason: "not_found" };

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) return { ok: false, reason: "no_email" };

  const claimed = await claimInterviewEmail(id);
  if (!claimed) return { ok: false, reason: "already_sent" };

  const position = candidate.position || undefined;
  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: interviewInviteSubject(position),
    html: interviewInviteHtml({
      fullName: candidate.fullName || "Candidate",
      interviewUrl: interviewUrl(baseUrl, id, "invite-email"),
      position,
    }),
    text: interviewInviteText({
      fullName: candidate.fullName || "Candidate",
      interviewUrl: interviewUrl(baseUrl, id, "invite-email"),
      position,
    }),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    await releaseInterviewEmail(id).catch(() => {});
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[admin] assessment email not sent to ${email}: ${reason}`);
    return { ok: false, reason };
  }
  return { ok: true };
}

/**
 * Chase somebody who has not finished their assessment.
 *
 * Refused once they have, because a reminder to somebody who is already done
 * is the message that makes a company look as though it is not paying
 * attention. Counted only when the message is actually away.
 */
export async function sendReminderEmail(id: string, baseUrl: string): Promise<SendOutcome> {
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, reason: "not_found" };
  if (candidate.interview) return { ok: false, reason: "already_completed" };

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) return { ok: false, reason: "no_email" };

  const position = candidate.position || undefined;
  const invite = {
    fullName: candidate.fullName || "Candidate",
    interviewUrl: interviewUrl(baseUrl, id, "reminder-email"),
    position,
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: reminderSubject(position),
    html: reminderHtml(invite),
    text: reminderText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[admin] reminder email not sent to ${email}: ${reason}`);
    return { ok: false, reason };
  }

  const updated = await recordReminder(id, "email");
  // eslint-disable-next-line no-console
  console.log(`[admin] reminder email sent to ${email} (${updated?.reminderEmailCount ?? 1})`);
  return { ok: true };
}
