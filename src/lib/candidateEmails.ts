import {
  getCandidate,
  claimInterviewEmail,
  releaseInterviewEmail,
  recordReminder,
  recordVoiceRequest,
  recordVoiceReminder,
} from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  interviewInviteHtml,
  interviewInviteSubject,
  interviewInviteText,
  reminderHtml,
  reminderSubject,
  reminderText,
  voiceAssessmentHtml,
  voiceAssessmentSubject,
  voiceAssessmentText,
  voiceReminderHtml,
  voiceReminderSubject,
  voiceReminderText,
} from "@/lib/emailTemplates";
import { voiceRecordingNeeded } from "@/lib/voice";
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

/**
 * Asking for a recording has an outcome the others do not: the request can be
 * on the record while the email is not away. The row button reports both, so
 * this carries both rather than collapsing them into a single boolean.
 */
export type VoiceRequestOutcome =
  | { ok: true; found: true; voiceRequestedAt?: string; voiceStatus?: string }
  | { ok: false; found: false; reason: string }
  | { ok: false; found: true; reason: string; voiceRequestedAt?: string; voiceStatus?: string };

export type VoiceReminderOutcome =
  | { ok: true; voiceReminderSentAt?: string; voiceReminderCount?: number }
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

/**
 * Ask for the voice assessment: the script, the instructions and their link.
 *
 * The request is recorded first and kept even when the email fails. That
 * timestamp is what opens the step on the candidate's own page, and undoing it
 * because a mail server was briefly unreachable would close a step the
 * recruiter has decided is open. The caller is told the message did not go, so
 * nobody is left waiting on an email that never existed.
 */
export async function sendVoiceAssessmentEmail(
  id: string,
  baseUrl: string,
): Promise<VoiceRequestOutcome> {
  const updated = await recordVoiceRequest(id);
  if (!updated) return { ok: false, found: false, reason: "not_found" };

  const state = {
    found: true as const,
    voiceRequestedAt: updated.voiceRequestedAt,
    voiceStatus: updated.voiceStatus,
  };

  const email = (updated.email || "").trim();
  if (!email.includes("@")) return { ok: false, ...state, reason: "no_email" };

  const invite = {
    fullName: updated.fullName || "Candidate",
    email,
    position: updated.position || undefined,
    // Their own assessment link. The recording step appears on it, so there is
    // no second address for them to trust and nothing to match up here.
    recordUrl: `${baseUrl}/interview?c=${id}`,
  };

  const result = await sendEmail({
    to: email,
    toName: updated.fullName || undefined,
    subject: voiceAssessmentSubject(),
    html: voiceAssessmentHtml(invite),
    text: voiceAssessmentText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[voice-assessment] ${id} requested but email not sent: ${reason}`);
    return { ok: false, ...state, reason };
  }
  return { ok: true, ...state };
}

/**
 * Chase a recording that was asked for and has not arrived.
 *
 * Deliberately does not touch `voiceRequestedAt`: that timestamp against the
 * newest recording is what decides whether the step is open, and refreshing it
 * here would reopen it for somebody who had already answered — the reminder
 * becoming the thing that undid their work.
 */
export async function sendVoiceReminderEmail(
  id: string,
  baseUrl: string,
): Promise<VoiceReminderOutcome> {
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, reason: "not_found" };
  if (!candidate.voiceRequestedAt) return { ok: false, reason: "not_requested" };
  if (!voiceRecordingNeeded(candidate)) return { ok: false, reason: "already_received" };

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) return { ok: false, reason: "no_email" };

  const invite = {
    fullName: candidate.fullName || "Candidate",
    email,
    position: candidate.position || undefined,
    // Tagged, so an open from this email is credited to it and the recruiter
    // can see whether chasing them worked.
    recordUrl: withSource(`${baseUrl}/interview?c=${id}`, "reminder-email"),
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: voiceReminderSubject(),
    html: voiceReminderHtml(invite),
    text: voiceReminderText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[voice] reminder not sent to ${email}: ${reason}`);
    return { ok: false, reason };
  }

  // Counted only once the message is actually away. A count that includes
  // failures reads as "chased three times, no response" about somebody who was
  // never reached at all.
  const updated = await recordVoiceReminder(id);
  // eslint-disable-next-line no-console
  console.log(`[voice] reminder sent to ${email} (${updated?.voiceReminderCount ?? 1})`);
  return {
    ok: true,
    voiceReminderSentAt: updated?.voiceReminderSentAt,
    voiceReminderCount: updated?.voiceReminderCount,
  };
}
