/**
 * SERVER-ONLY: everything the warm-up tab shows, assembled in one place.
 *
 * The tab answers two questions and no others: how much may still go out
 * today, and whether tomorrow's allowance should be larger. Per-message
 * reporting — who bounced, who opened what, the shape of the last month — is
 * ZeptoMail's job, and it does it better than a second copy here would.
 *
 * So the counts below exist to support the verdict, not to be read. They are
 * still worth gathering: the verdict has to be computed from something, and
 * sends, bounces and complaints are the something. Sends are counted as they
 * leave and the other two arrive by webhook, so both are exact. Engagement is
 * estimated — opens are recorded against the candidate rather than against the
 * message that caused them, so the honest question is "how many people opened
 * anything in this window, against how many messages went out in it", and the
 * answer is soft at the edges.
 */
import { listCandidates } from "@/lib/store";
import { readWarmup, type WarmupConfig } from "@/lib/warmupStore";
import {
  allowanceOf,
  nextStage,
  recentDays,
  stageAt,
  verdictFor,
  warmupDay,
  type Allowance,
  type Verdict,
  type WarmupStage,
} from "@/lib/warmup";

/** The window the verdict is computed over. Long enough to have a sample. */
const VERDICT_DAYS = 14;

export interface WarmupStats {
  config: WarmupConfig;
  stage: WarmupStage;
  next: WarmupStage | null;
  stageIndex: number;
  daysAtStage: number;
  allowance: Allowance;
  verdict: Verdict;
  /** Whether the bounce and complaint figures behind the verdict can be believed. */
  feedbackConfigured: boolean;
  /**
   * The raw counts the verdict was computed from, over the same window.
   *
   * Not here to be read as reporting — ZeptoMail does that better. They are
   * here so that when the tab and the console disagree, the tab can say by how
   * much and offer to clear what it has, rather than asserting a rate with
   * nothing behind it.
   */
  recorded: { sent: number; bounced: number; softBounced: number; complained: number };
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

  const days = recentDays(VERDICT_DAYS);
  const sum = (pick: (day: string) => number) => days.reduce((n, d) => n + pick(d), 0);
  const sent = sum((d) => byDay.get(d)?.sent ?? 0);
  const bounced = sum((d) => byDay.get(d)?.bounced ?? 0);
  const softBounced = sum((d) => byDay.get(d)?.softBounced ?? 0);
  const complained = sum((d) => byDay.get(d)?.complained ?? 0);

  // Midnight UTC of the first day in the window, compared against ISO
  // timestamps as strings — which sorts correctly because both are ISO.
  const openers = await openersSince(`${days[0] ?? today}T00:00:00.000Z`);
  const engagement = sent > 0 ? Math.min(1, openers / sent) : null;

  const daysAtStage = daysBetween(data.config.stageSince, today);

  return {
    config: data.config,
    stage: stageAt(data.config.stageIndex),
    next: nextStage(data.config.stageIndex),
    stageIndex: data.config.stageIndex,
    daysAtStage,
    allowance: allowanceOf(data.config.dailyCap, byDay.get(today)?.sent ?? 0),
    // Soft bounces are deliberately not passed: the thresholds the verdict
    // reads against are hard-bounce thresholds, and a full mailbox is not
    // evidence about how a list was built.
    verdict: verdictFor({ sent, bounced, complained, engagement, daysAtStage }),
    feedbackConfigured: !!process.env.EMAIL_FEEDBACK_SECRET?.trim(),
    recorded: { sent, bounced, softBounced, complained },
  };
}
