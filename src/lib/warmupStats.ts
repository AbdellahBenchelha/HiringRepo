/**
 * SERVER-ONLY: everything the warm-up tab shows, assembled in one place.
 *
 * Two sources, deliberately kept apart in what they claim:
 *
 *   - Sends, bounces and complaints are *counted*. Every message increments a
 *     number as it leaves, and the webhook increments the other two. These are
 *     exact, and they are the ones the verdict turns on.
 *
 *   - Engagement is *estimated*. Opens are recorded against the candidate, not
 *     against the message that caused them, so the best available answer is
 *     "how many people opened something in this window, against how many
 *     messages went out in it". Opens lag their sends, so the figure is soft
 *     at the edges of a window and wrong on any single day. It is shown
 *     because the direction of it is genuinely informative, and labelled as
 *     approximate because the precision is not there.
 *
 * The one thing worth knowing about the engagement number is that it is better
 * than the industry equivalent, not worse: these are clicks on links, recorded
 * server-side when the page is fetched, not tracking pixels. Apple Mail
 * Privacy Protection and Gmail's image proxy fetch pixels on the recipient's
 * behalf and inflate an ordinary open rate with opens nobody performed. None
 * of that applies here — every one of these is a person who arrived.
 */
import { listCandidates } from "@/lib/store";
import { readWarmup, type WarmupConfig } from "@/lib/warmupStore";
import {
  allowanceOf,
  emptyDay,
  nextStage,
  rate,
  recentDays,
  stageAt,
  verdictFor,
  warmupDay,
  type Allowance,
  type DayCounts,
  type Verdict,
  type WarmupStage,
} from "@/lib/warmup";

/** How far back the tab draws. */
export const CHART_DAYS = 30;
/** The window the verdict is computed over. Long enough to have a sample. */
export const VERDICT_DAYS = 14;

export interface WindowTotals {
  days: number;
  sent: number;
  reactive: number;
  bounced: number;
  complained: number;
  overrides: number;
  bounceRate: number | null;
  complaintRate: number | null;
}

export interface WarmupStats {
  config: WarmupConfig;
  stage: WarmupStage;
  next: WarmupStage | null;
  stageIndex: number;
  daysAtStage: number;
  allowance: Allowance;
  /** Oldest first, one entry per day, gaps filled with zeroes. */
  chart: DayCounts[];
  window: WindowTotals;
  /** Approximate — see the note at the top of this file. */
  engagement: number | null;
  engagementOpeners: number;
  verdict: Verdict;
  /** Whether the bounce and complaint figures can be believed at all. */
  feedbackConfigured: boolean;
}

function totalsFor(days: DayCounts[]): WindowTotals {
  const sum = (pick: (d: DayCounts) => number) => days.reduce((n, d) => n + pick(d), 0);
  const sent = sum((d) => d.sent);
  const bounced = sum((d) => d.bounced);
  const complained = sum((d) => d.complained);
  return {
    days: days.length,
    sent,
    reactive: sum((d) => d.reactive),
    bounced,
    complained,
    overrides: sum((d) => d.overrides),
    bounceRate: rate(bounced, sent),
    complaintRate: rate(complained, sent),
  };
}

/** Whole days between two day keys, counting today as one. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/**
 * How many people opened something inside the window.
 *
 * Distinct people, not distinct opens: someone who follows three links in a
 * week is one person who is reading their email, and counting them three times
 * would turn one engaged candidate into a flattering rate.
 */
async function openersSince(since: string): Promise<number> {
  const candidates = await listCandidates();
  let n = 0;
  for (const c of candidates) {
    const opens = [
      c.interviewOpenedAt,
      c.lastOpenedAt,
      c.voiceOpenedAt,
      c.liveVerificationOpenedAt,
      c.liveVerificationLastOpenedAt,
      c.companyOpenedAt,
    ].filter((v): v is string => typeof v === "string" && !!v);
    if (opens.some((at) => at >= since)) n++;
  }
  return n;
}

export async function buildWarmupStats(): Promise<WarmupStats> {
  const data = await readWarmup();
  const today = warmupDay();
  const byDay = new Map(data.days.map((d) => [d.day, d]));

  const chart = recentDays(CHART_DAYS).map((day) => byDay.get(day) ?? emptyDay(day));
  const windowDays = recentDays(VERDICT_DAYS).map((day) => byDay.get(day) ?? emptyDay(day));
  const window = totalsFor(windowDays);

  // Midnight UTC of the first day in the window. Compared against ISO
  // timestamps as strings, which sorts correctly because both are ISO.
  const since = `${windowDays[0]?.day ?? today}T00:00:00.000Z`;
  const openers = await openersSince(since);
  const engagement = window.sent > 0 ? Math.min(1, openers / window.sent) : null;

  const daysAtStage = daysBetween(data.config.stageSince, today);

  return {
    config: data.config,
    stage: stageAt(data.config.stageIndex),
    next: nextStage(data.config.stageIndex),
    stageIndex: data.config.stageIndex,
    daysAtStage,
    allowance: allowanceOf(data.config.dailyCap, byDay.get(today)?.sent ?? 0),
    chart,
    window,
    engagement,
    engagementOpeners: openers,
    verdict: verdictFor({
      sent: window.sent,
      bounced: window.bounced,
      complained: window.complained,
      engagement,
      daysAtStage,
    }),
    feedbackConfigured: !!process.env.EMAIL_FEEDBACK_SECRET?.trim(),
  };
}
