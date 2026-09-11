/**
 * Chasing an offer nobody has answered.
 *
 * An offer with no reply is the most expensive silence in the process: the
 * role is held open, nobody else is put forward for it, and the candidate may
 * simply have taken another job and not said so. So they are asked to answer
 * either way, with a deadline, and told what happens if they do not.
 *
 * Pure module — no filesystem, no node built-ins — so the route, the panel and
 * the table all decide "is this one still waiting?" from the same place.
 */
import type { OfferState } from "@/lib/offer";

/**
 * How long they get, from the reminder.
 *
 * Deliberately counted from the reminder rather than from the offer itself. A
 * reminder sent a week after the offer would otherwise hand somebody a
 * deadline that expired before they read the email, which is not a deadline —
 * it is a notice that we have already stopped waiting.
 */
export const OFFER_REPLY_HOURS = 48;

export interface OfferReminderState extends OfferState {
  offerReminderSentAt?: string;
  offerReminderCount?: number;
  /** Every reminder, oldest first. */
  offerReminders?: string[];
  /** When the current reminder's 48 hours run out. */
  offerReplyDeadline?: string;
}

/** An offer is out and they have said neither yes nor no. */
export function offerAwaitingReply(c: OfferReminderState): boolean {
  return !!c.offerSentAt && !c.offerAcceptedAt && !c.offerDeclinedAt;
}

/**
 * The deadline currently in force, or nothing.
 *
 * Stored rather than recomputed, because the answer has to survive the
 * arithmetic changing: somebody told "answer by Saturday" must not find the
 * date has moved because the constant above was edited afterwards.
 */
export function replyDeadline(c: OfferReminderState): string | undefined {
  if (!offerAwaitingReply(c)) return undefined;
  return c.offerReplyDeadline;
}

/** Has the deadline we gave them passed with no answer? */
export function replyOverdue(c: OfferReminderState, now: number = Date.now()): boolean {
  const deadline = replyDeadline(c);
  if (!deadline) return false;
  const at = Date.parse(deadline);
  return !Number.isNaN(at) && now > at;
}

/** The deadline a reminder sent now would set. */
export function deadlineFrom(sentAt: string | number): string {
  const from = typeof sentAt === "number" ? sentAt : Date.parse(sentAt);
  return new Date(from + OFFER_REPLY_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * The deadline in words, for the email.
 *
 * A date and a time, never "within 48 hours". The email is read whenever it is
 * read — half a day later, on a phone, in another country — and by then "48
 * hours" names no moment at all. The zone is said out loud for the same
 * reason: most of the people being written to are not in it.
 */
export function formatDeadline(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const date = at.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = at.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} at ${time} UK time`;
}
