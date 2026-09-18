/**
 * When something last happened to a candidate.
 *
 * The tables were ordered by when people applied, which is the one date that
 * never changes again. So somebody who applied in June and finished their
 * assessment this morning sat where June put them — several pages down, behind
 * everyone who applied more recently and has done nothing since. The only way
 * to reach them was to search for their name, which means knowing in advance
 * who you are looking for, which is the opposite of what a list is for.
 *
 * This is the other date: the most recent thing on their record, whoever did
 * it. A new application counts as activity, so ordering by this still puts new
 * applicants at the top — it adds the people who have moved without taking
 * anyone away.
 *
 * Pure, and shared, so the two tables cannot disagree about who is recent.
 */

/** Every timestamp a candidate carries, whoever wrote it. */
export interface ActivityInput {
  createdAt?: string;
  submittedAt?: string;
  invitationSentAt?: string;
  interviewEmailSentAt?: string;
  interviewOpenedAt?: string;
  lastOpenedAt?: string;
  interviewCompletedAt?: string;
  reminderEmailSentAt?: string;
  reminderWhatsAppSentAt?: string;
  voiceRequestedAt?: string;
  voiceOpenedAt?: string;
  voiceReminderSentAt?: string;
  voiceAckSentAt?: string;
  verificationConsentAt?: string;
  verificationRequestedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  identityReuploadRequestedAt?: string;
  identityReminderSentAt?: string;
  liveVerificationSentAt?: string;
  liveVerificationOpenedAt?: string;
  liveVerificationLastOpenedAt?: string;
  liveVerificationStartedAt?: string;
  liveVerificationLinkChangedAt?: string;
  offerSentAt?: string;
  offerReminderSentAt?: string;
  offerAcceptedAt?: string;
  offerDeclinedAt?: string;
  confirmedDetailsAt?: string;
  companyRequestedAt?: string;
  companyOpenedAt?: string;
  companyDetailsAt?: string;
}

/**
 * The fields, in one list.
 *
 * Written out rather than inferred from the object, because a candidate view
 * carries plenty of strings that are not dates — a name, an email, a position
 * — and "the largest string on the record" would sort by whichever of those
 * happened to come last in the alphabet.
 */
const FIELDS: readonly (keyof ActivityInput)[] = [
  "createdAt",
  "submittedAt",
  "invitationSentAt",
  "interviewEmailSentAt",
  "interviewOpenedAt",
  "lastOpenedAt",
  "interviewCompletedAt",
  "reminderEmailSentAt",
  "reminderWhatsAppSentAt",
  "voiceRequestedAt",
  "voiceOpenedAt",
  "voiceReminderSentAt",
  "voiceAckSentAt",
  "verificationConsentAt",
  "verificationRequestedAt",
  "verifiedAt",
  "rejectedAt",
  "identityReuploadRequestedAt",
  "identityReminderSentAt",
  "liveVerificationSentAt",
  "liveVerificationOpenedAt",
  "liveVerificationLastOpenedAt",
  "liveVerificationStartedAt",
  "liveVerificationLinkChangedAt",
  "offerSentAt",
  "offerReminderSentAt",
  "offerAcceptedAt",
  "offerDeclinedAt",
  "confirmedDetailsAt",
  "companyRequestedAt",
  "companyOpenedAt",
  "companyDetailsAt",
];

/**
 * The newest of them, as an ISO string, or an empty string for a record with
 * no dates at all.
 *
 * Compared as strings: these are all ISO-8601 in UTC, which sorts the same way
 * as the instants they name, and parsing thirty dates per row for every
 * comparison in a sort is work worth not doing.
 */
export function lastActivityAt(c: ActivityInput): string {
  let latest = "";
  for (const field of FIELDS) {
    const at = c[field];
    if (typeof at === "string" && at > latest) latest = at;
  }
  return latest;
}

/**
 * How long ago, in words a recruiter can scan.
 *
 * Deliberately coarse. The question this column answers is "has anything
 * happened here lately", and a row that says "4 minutes ago" against one that
 * says "3 days ago" answers it; the exact minute does not.
 */
export function agoInWords(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return "—";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "—";
  const mins = Math.max(0, Math.floor((now - at) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(days / 365)}y ago`;
}
