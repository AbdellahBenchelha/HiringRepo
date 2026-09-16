/**
 * The sending warm-up: how much mail may leave today, and whether it is safe
 * to send more tomorrow.
 *
 * Pure module — no filesystem, no node built-ins — so the send path, the
 * worker, the API routes and the tab all agree on one definition of "today"
 * and one definition of "healthy".
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
export function nextResetAt(at: Date | number = Date.now()): string {
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
  { label: "Full volume", cap: 1000, note: "Warmed. Keep watching bounces anyway." },
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

export interface DayCounts {
  day: string;
  /** Messages accepted by ZeptoMail. */
  sent: number;
  reactive: number;
  /** Times the cap was knowingly exceeded. Kept so the numbers stay honest. */
  overrides: number;
  /** Reported back by the webhook, not guessed here. */
  bounced: number;
  complained: number;
}

export function emptyDay(day: string): DayCounts {
  return { day, sent: 0, reactive: 0, overrides: 0, bounced: 0, complained: 0 };
}

/** ------------------------------------------------------------------------ */
/** Health                                                                    */
/** ------------------------------------------------------------------------ */

/**
 * The lines that matter.
 *
 * Bounces and complaints are the two numbers mailbox providers act on, and
 * both are unforgiving: a few percent of hard bounces reads as a list bought
 * or scraped rather than earned, and complaints are counted in tenths of a
 * percent because one person in a thousand pressing "spam" is already unusual
 * for mail somebody asked for.
 */
export const BOUNCE_WARN = 0.02;
export const BOUNCE_STOP = 0.05;
export const COMPLAINT_WARN = 0.001;
export const COMPLAINT_STOP = 0.003;

/**
 * Engagement worth ramping on.
 *
 * Higher than a marketing benchmark on purpose. These are people who applied
 * for a job and are waiting to hear back — if only a quarter of them open, the
 * mail is probably not reaching them rather than not interesting them.
 */
export const ENGAGEMENT_GOOD = 0.3;
export const ENGAGEMENT_POOR = 0.15;

/**
 * Below this many sends in the window, a rate is noise.
 *
 * One bounce out of six is 17%, which would read as a catastrophe and mean
 * nothing at all. The tab says "not enough data yet" instead of rendering a
 * frightening number nobody should act on.
 */
export const MIN_SAMPLE = 50;

export interface HealthInput {
  sent: number;
  bounced: number;
  complained: number;
  /** Approximate: opens lag the sends that caused them. See the tab's note. */
  engagement: number | null;
  daysAtStage: number;
}

export type VerdictLevel = "ramp" | "hold" | "stop" | "unknown";

export interface Verdict {
  level: VerdictLevel;
  headline: string;
  /** Plain sentences, shown as a list. Always says why. */
  reasons: string[];
  bounceRate: number | null;
  complaintRate: number | null;
}

export function rate(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export function percent(value: number | null, digits = 1): string {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

/**
 * Turn the numbers into the one thing a person actually needs: whether to send
 * more tomorrow than today.
 *
 * Deliberately conservative. "Stop" is reached on either of the two hard
 * signals alone, because a domain that has started bouncing does not get
 * better by sending more, and a reputation lost over a bad week takes months
 * to rebuild.
 */
export function verdictFor(input: HealthInput): Verdict {
  const bounceRate = rate(input.bounced, input.sent);
  const complaintRate = rate(input.complained, input.sent);
  const reasons: string[] = [];

  if (input.sent < MIN_SAMPLE) {
    return {
      level: "unknown",
      headline: "Not enough data yet",
      reasons: [
        `Only ${input.sent} ${input.sent === 1 ? "message has" : "messages have"} gone out in this window. ` +
          `Rates start meaning something at about ${MIN_SAMPLE}.`,
        "Keep to the current cap until there is something to read.",
      ],
      bounceRate,
      complaintRate,
    };
  }

  if (bounceRate !== null && bounceRate >= BOUNCE_STOP) {
    reasons.push(
      `${percent(bounceRate)} of messages bounced — at or above ${percent(BOUNCE_STOP, 0)}, providers ` +
        `treat the list as unearned. Stop and clean it before sending again.`,
    );
  }
  if (complaintRate !== null && complaintRate >= COMPLAINT_STOP) {
    reasons.push(
      `${percent(complaintRate, 2)} marked it as spam — ${percent(COMPLAINT_STOP, 1)} is the level at ` +
        `which a sending domain starts being filtered outright.`,
    );
  }
  if (reasons.length) {
    return { level: "stop", headline: "Stop and investigate", reasons, bounceRate, complaintRate };
  }

  if (bounceRate !== null && bounceRate >= BOUNCE_WARN) {
    reasons.push(
      `${percent(bounceRate)} bounced, over the ${percent(BOUNCE_WARN, 0)} line. Old addresses on the ` +
        `re-send list are the likely cause — verify them before going wider.`,
    );
  }
  if (complaintRate !== null && complaintRate >= COMPLAINT_WARN) {
    reasons.push(
      `${percent(complaintRate, 2)} marked it as spam, over the ${percent(COMPLAINT_WARN, 1)} line.`,
    );
  }
  if (input.engagement !== null && input.engagement < ENGAGEMENT_POOR) {
    reasons.push(
      `Only ${percent(input.engagement)} opened anything. For mail people are waiting for, that ` +
        `usually means it is not reaching them.`,
    );
  }
  if (reasons.length) {
    return {
      level: "hold",
      headline: "Hold at this volume",
      reasons,
      bounceRate,
      complaintRate,
    };
  }

  if (input.daysAtStage < MIN_DAYS_PER_STAGE) {
    return {
      level: "hold",
      headline: "Healthy — hold a little longer",
      reasons: [
        `Nothing wrong: ${percent(bounceRate)} bounced and ${percent(complaintRate, 2)} complained.`,
        `${input.daysAtStage} of ${MIN_DAYS_PER_STAGE} days at this volume. Providers read consistency ` +
          `over days, so the wait is the point.`,
      ],
      bounceRate,
      complaintRate,
    };
  }

  reasons.push(`${percent(bounceRate)} bounced and ${percent(complaintRate, 2)} complained — both well inside the lines.`);
  if (input.engagement !== null) {
    reasons.push(
      input.engagement >= ENGAGEMENT_GOOD
        ? `${percent(input.engagement)} opened something, which is what earns the inbox.`
        : `${percent(input.engagement)} opened something — acceptable, but worth watching as volume rises.`,
    );
  }
  reasons.push(`${input.daysAtStage} days held at this volume.`);
  return { level: "ramp", headline: "Safe to step up", reasons, bounceRate, complaintRate };
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
