/**
 * Where a candidate came from when they opened their assessment, and what the
 * recruiter should do about them next.
 *
 * Pure module — no filesystem, no node built-ins — so the store, the API route
 * and the Admin Panel table can all share one definition.
 *
 * Attribution is carried in the link itself (?s=…) and recorded by the
 * assessment page's browser beacon, never server-side. Pasting a link into
 * WhatsApp makes it fetch the URL to build a preview; a server-side record
 * would credit the preview bot with the open. Bots do not run JavaScript.
 */

export const OPEN_SOURCES = [
  "invite-email",
  "invite-whatsapp",
  "reminder-email",
  "reminder-whatsapp",
  /**
   * The copy of the link sent to the recruiter's own Telegram. Opens from it
   * are discarded rather than recorded — a recruiter checking a link is not a
   * candidate sitting the assessment, and counting it would mark someone as
   * engaged who has never seen the page.
   */
  "recruiter",
  /** Typed, bookmarked, or a link whose tag we no longer recognise. */
  "direct",
] as const;

export type OpenSource = (typeof OPEN_SOURCES)[number];

export function isOpenSource(v: unknown): v is OpenSource {
  return typeof v === "string" && (OPEN_SOURCES as readonly string[]).includes(v);
}

/** Sources that do not represent the candidate opening their assessment. */
export function isCandidateOpen(s?: OpenSource): boolean {
  return s !== "recruiter";
}

/** Tag an assessment link so the open it produces can be attributed. */
export function withSource(link: string, source: OpenSource): string {
  return `${link}${link.includes("?") ? "&" : "?"}s=${source}`;
}

/** Reads as a sentence in the table: "opened from the reminder email". */
export const SOURCE_LABEL: Record<OpenSource, string> = {
  "invite-email": "invitation email",
  "invite-whatsapp": "WhatsApp invitation",
  "reminder-email": "reminder email",
  "reminder-whatsapp": "WhatsApp reminder",
  recruiter: "recruiter link",
  direct: "link",
};

/** The subset that means "they came back because we chased them". */
export function isReminderSource(s?: string): boolean {
  return s === "reminder-email" || s === "reminder-whatsapp";
}

/** Whole days between two instants, floored. Same day reads as 0. */
export function daysSince(iso?: string, now = Date.now()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((now - then) / 86_400_000);
}

export function agoLabel(iso?: string, now = Date.now()): string {
  const d = daysSince(iso, now);
  if (d === null) return "";
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

/**
 * Everything the follow-up column needs about one candidate.
 *
 * Only the fields that matter here, so this works against a table row as
 * happily as against a stored record.
 */
export interface FollowUpInput {
  interviewCompleted?: boolean;
  interviewEmailSentAt?: string;
  formCompleted?: boolean;
  reminderEmailSentAt?: string;
  reminderEmailCount?: number;
  reminderWhatsAppSentAt?: string;
  reminderWhatsAppCount?: number;
  lastOpenedAt?: string;
  lastOpenSource?: string;
}

export type FollowUpKind =
  /** Finished the assessment. Nothing to chase. */
  | "done"
  /** Not at the chasing stage yet — never invited, and the form is complete. */
  | "none"
  /** Invited or stalled mid-form, and no reminder has gone out. */
  | "needs"
  /** Reminded, and they have not been back since. */
  | "waiting"
  /** Reminded, and they opened the assessment afterwards. It worked. */
  | "responded";

export interface FollowUpState {
  kind: FollowUpKind;
  /** Short text for the table cell. */
  label: string;
  /** Longer text for the cell's title attribute. */
  detail: string;
  /** Days since the last reminder, for sorting and for colour. */
  daysWaiting: number | null;
  reminderCount: number;
  lastReminderAt?: string;
}

/**
 * Which follow-up bucket a candidate is in.
 *
 * The question this answers is "who should I chase today", so the ordering is
 * by how much attention each state needs, not by how far along the candidate
 * is. A reminder that produced an open is a success and drops out of the way;
 * one that produced nothing after several days rises to the top.
 */
export function followUpState(c: FollowUpInput, now = Date.now()): FollowUpState {
  const emailCount = c.reminderEmailCount ?? 0;
  const waCount = c.reminderWhatsAppCount ?? 0;
  const reminderCount = emailCount + waCount;

  const times = [c.reminderEmailSentAt, c.reminderWhatsAppSentAt].filter(Boolean) as string[];
  const lastReminderAt = times.length
    ? times.reduce((a, b) => (a > b ? a : b))
    : undefined;

  const base = { reminderCount, lastReminderAt, daysWaiting: daysSince(lastReminderAt, now) };

  if (c.interviewCompleted) {
    return { ...base, kind: "done", label: "Completed", detail: "Assessment completed." };
  }

  // Nobody to chase until they have either been invited or stalled in the form.
  const chaseable = !!c.interviewEmailSentAt || c.formCompleted === false;
  if (!chaseable && !reminderCount) {
    return { ...base, kind: "none", label: "—", detail: "Not at the follow-up stage yet." };
  }

  if (!lastReminderAt) {
    return {
      ...base,
      kind: "needs",
      label: "Not reminded",
      detail: "Invited, but no reminder has been sent yet.",
    };
  }

  // Did they come back after the last reminder? Either the open is tagged as
  // coming from a reminder, or it simply happened afterwards — a candidate who
  // opens the day after being chased counts, however they got there.
  const openedAfter =
    !!c.lastOpenedAt &&
    (c.lastOpenedAt > lastReminderAt || isReminderSource(c.lastOpenSource));

  const ago = agoLabel(lastReminderAt, now);
  const times_ = reminderCount > 1 ? ` ×${reminderCount}` : "";

  if (openedAfter) {
    const via = isOpenSource(c.lastOpenSource) ? SOURCE_LABEL[c.lastOpenSource] : "link";
    return {
      ...base,
      kind: "responded",
      label: "Opened after reminder",
      detail: `Reminded ${ago}${times_}, then opened the assessment from the ${via}.`,
    };
  }

  return {
    ...base,
    kind: "waiting",
    label: `Reminded${times_} · ${ago}`,
    detail: `${reminderCount} reminder${reminderCount === 1 ? "" : "s"} sent, last ${ago}. No assessment open since.`,
  };
}

export const FOLLOW_UP_FILTERS = [
  { value: "all", label: "All" },
  { value: "needs", label: "Needs a reminder" },
  { value: "waiting", label: "Reminded, no response" },
  { value: "responded", label: "Opened after reminder" },
] as const;

export type FollowUpFilter = (typeof FOLLOW_UP_FILTERS)[number]["value"];
