/**
 * The sending warm-up: how much mail may leave today, and how much already has.
 *
 * Pure module — no filesystem, no node built-ins — so the send path, the
 * worker, the API routes and the tab all agree on one definition of "today".
 *
 * It counts sends and nothing else. Bounces, complaints, opens and clicks are
 * ZeptoMail's reporting and are read there; this exists to hold the volume
 * down while a new domain earns its reputation, which is the one thing
 * ZeptoMail cannot do from outside the application.
 *
 * Why this exists at all: workroute.co.uk is a new sending domain with no
 * history. Mailbox providers decide where a new domain's mail lands mostly by
 * watching how it behaves over its first few weeks — a steady, engaged trickle
 * earns the inbox, and a sudden blast of a hundred to a stale list earns the
 * spam folder more or less permanently. SPF, DKIM and DMARC are the entry
 * ticket, and they are already in place; this is the part that comes after.
 */

/** ------------------------------------------------------------------------ */
/** The day                                                                   */
/** ------------------------------------------------------------------------ */

/**
 * Which day a moment belongs to, for counting purposes.
 *
 * Europe/London, to match the registered company, rather than UTC or the
 * server's idea of local time. A cap that resets at a time nobody can predict
 * is a cap nobody trusts, and Railway's container clock is UTC regardless of
 * where anyone is sitting. Through the summer that means the day rolls over at
 * 01:00 UTC, which is the point: it rolls over at midnight *in London*, every
 * day of the year, without anyone having to think about it.
 */
export const WARMUP_TIME_ZONE = "Europe/London";

/** en-CA renders as YYYY-MM-DD, which sorts as a string and needs no padding. */
const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: WARMUP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function warmupDay(at: Date | number = Date.now()): string {
  return DAY_FORMAT.format(typeof at === "number" ? new Date(at) : at);
}

/** The n days ending today, oldest first, as day keys. */
export function recentDays(n: number, at: Date | number = Date.now()): string[] {
  const end = typeof at === "number" ? at : at.getTime();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(warmupDay(end - i * 86_400_000));
  return days;
}

/**
 * When the allowance next resets, as an instant.
 *
 * Computed by walking forward in hours rather than by constructing a midnight:
 * the day boundary in London is 00:00 or 01:00 UTC depending on the time of
 * year, and hard-coding either is wrong for half of it.
 */
function nextResetAt(at: Date | number = Date.now()): string {
  const start = typeof at === "number" ? at : at.getTime();
  const today = warmupDay(start);
  for (let h = 1; h <= 30; h++) {
    const t = start + h * 3_600_000;
    if (warmupDay(t) !== today) {
      // Step back to the minute to avoid reporting a reset up to an hour late.
      for (let m = 59; m >= 0; m--) {
        const back = t - m * 60_000;
        if (warmupDay(back) !== today) return new Date(back).toISOString();
      }
      return new Date(t).toISOString();
    }
  }
  return new Date(start + 86_400_000).toISOString();
}

/** ------------------------------------------------------------------------ */
/** The curve                                                                 */
/** ------------------------------------------------------------------------ */

export interface WarmupStage {
  label: string;
  cap: number;
  /** What this stage is for, shown on the tab so the number is not magic. */
  note: string;
}

/**
 * The ramp, as defaults.
 *
 * Roughly doubling each week is the shape every deliverability guide agrees
 * on; the exact numbers matter far less than never jumping. These are only
 * starting points — the cap is stored separately and can be edited, because a
 * list that is bouncing wants a week held at the same volume, not the next
 * rung.
 */
export const WARMUP_STAGES: readonly WarmupStage[] = [
  { label: "Week 1", cap: 20, note: "The first impression. Your most engaged people only." },
  { label: "Week 2", cap: 50, note: "Still small enough that one bad day is recoverable." },
  { label: "Week 3", cap: 100, note: "Roughly one full bulk batch a day." },
  { label: "Week 4", cap: 200, note: "Normal working volume for a list this size." },
  { label: "Week 5", cap: 400, note: "Only if engagement has held the whole way up." },
  { label: "Full volume", cap: 1000, note: "Warmed. Keep an eye on ZeptoMail's bounce report anyway." },
];

/** How many days to hold a stage before the next is offered. */
export const MIN_DAYS_PER_STAGE = 5;

export function stageAt(index: number): WarmupStage {
  return WARMUP_STAGES[Math.max(0, Math.min(index, WARMUP_STAGES.length - 1))];
}

export function nextStage(index: number): WarmupStage | null {
  return index + 1 < WARMUP_STAGES.length ? WARMUP_STAGES[index + 1] : null;
}

/** ------------------------------------------------------------------------ */
/** What gets counted                                                         */
/** ------------------------------------------------------------------------ */

/**
 * Campaign mail is sent because someone decided to send it; reactive mail is
 * sent because a candidate just did something and is waiting for the reply.
 *
 * Only campaign mail is ever held back. Blocking the acknowledgement someone
 * gets for applying would cost a candidate to protect a number, and it would
 * be backwards on its own terms: mail to a person who is looking at your site
 * right now is the mail most likely to be opened, which is exactly the mail
 * that earns a new domain its reputation. Reactive sends are still counted, so
 * the statistics describe everything that actually left.
 */
export type EmailKind = "campaign" | "reactive";

/**
 * What a day counted.
 *
 * Sends only. Bounces and complaints were recorded here once, and read back as
 * a health verdict on the tab — a second, worse copy of reporting ZeptoMail
 * already does properly. The counters are gone rather than merely hidden,
 * because a number nobody reads is a number nobody notices going wrong.
 */
export interface DayCounts {
  day: string;
  /** Messages accepted by ZeptoMail. */
  sent: number;
  reactive: number;
  /** Times the cap was knowingly exceeded. Kept so the numbers stay honest. */
  overrides: number;
}

export function emptyDay(day: string): DayCounts {
  return { day, sent: 0, reactive: 0, overrides: 0 };
}

/** ------------------------------------------------------------------------ */
/** Totals                                                                    */
/** ------------------------------------------------------------------------ */

/**
 * The month a day belongs to, as `YYYY-MM`.
 *
 * Sliced off the day key rather than computed from a Date, so the month
 * boundary lands wherever the day boundary landed and the two can never
 * disagree about which side of midnight in London something fell.
 */
export function warmupMonth(day: string): string {
  return day.slice(0, 7);
}

/** The month before a `YYYY-MM` key. String arithmetic, so no clock is involved. */
export function previousMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m > 1
    ? `${year}-${String(m - 1).padStart(2, "0")}`
    : `${year - 1}-12`;
}

/** ------------------------------------------------------------------------ */
/** The cap                                                                   */
/** ------------------------------------------------------------------------ */

export interface Allowance {
  cap: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export function allowanceOf(cap: number, usedToday: number, at?: Date | number): Allowance {
  return {
    cap,
    used: usedToday,
    remaining: Math.max(0, cap - usedToday),
    resetsAt: nextResetAt(at),
  };
}

/**
 * What a batch of this size would do to today's allowance.
 *
 * Returned rather than thrown, because every caller wants to say something
 * different about it: the selection bar warns and offers to go ahead anyway,
 * and the worker simply stops.
 */
export interface CapCheck {
  allowed: number;
  over: number;
  wouldExceed: boolean;
}

export function checkAgainstCap(count: number, allowance: Allowance): CapCheck {
  const allowed = Math.min(count, allowance.remaining);
  return { allowed, over: count - allowed, wouldExceed: count > allowance.remaining };
}
