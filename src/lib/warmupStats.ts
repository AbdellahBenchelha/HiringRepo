/**
 * SERVER-ONLY: everything the warm-up tab shows, assembled in one place.
 *
 * The tab answers two questions and no others: how much may still go out
 * today, and how much has gone out lately. Bounces, complaints, opens and
 * clicks were shown here once and are not any more — ZeptoMail reports all of
 * that properly, and a second copy computed from a webhook was one more thing
 * to keep honest for no gain.
 *
 * So what is left is sends, which this application is the only thing that can
 * count at the moment a message leaves.
 */
import { readWarmup, type WarmupConfig } from "@/lib/warmupStore";
import {
  allowanceOf,
  nextStage,
  previousMonth,
  recentDays,
  stageAt,
  warmupDay,
  warmupMonth,
  type Allowance,
  type WarmupStage,
} from "@/lib/warmup";

/** Including today, so "last 7 days" means the week you are standing in. */
const RECENT_DAYS = 7;

export interface SendTotals {
  today: number;
  yesterday: number;
  last7: number;
  thisMonth: number;
  lastMonth: number;
}

export interface WarmupStats {
  config: WarmupConfig;
  stage: WarmupStage;
  next: WarmupStage | null;
  stageIndex: number;
  daysAtStage: number;
  allowance: Allowance;
  totals: SendTotals;
}

/** Whole days between two day keys, counting today as one. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

export async function buildWarmupStats(): Promise<WarmupStats> {
  const data = await readWarmup();
  const today = warmupDay();
  const byDay = new Map(data.days.map((d) => [d.day, d]));

  const sentOn = (day: string) => byDay.get(day)?.sent ?? 0;
  const sumOf = (days: string[]) => days.reduce((n, d) => n + sentOn(d), 0);
  // Months are summed by matching the day key's prefix rather than by walking
  // a calendar, so a month is however many days the store actually holds for
  // it — right on the first of the month, and right across a leap day.
  const sumMonth = (month: string) =>
    data.days.reduce((n, d) => (warmupMonth(d.day) === month ? n + d.sent : n), 0);

  const week = recentDays(RECENT_DAYS);
  const thisMonth = warmupMonth(today);

  return {
    config: data.config,
    stage: stageAt(data.config.stageIndex),
    next: nextStage(data.config.stageIndex),
    stageIndex: data.config.stageIndex,
    daysAtStage: daysBetween(data.config.stageSince, today),
    allowance: allowanceOf(data.config.dailyCap, sentOn(today)),
    totals: {
      today: sentOn(today),
      // Taken from the day list rather than by subtracting 24 hours, which
      // lands on the wrong day twice a year when the clocks change.
      yesterday: sentOn(recentDays(2)[0]),
      last7: sumOf(week),
      thisMonth: sumMonth(thisMonth),
      lastMonth: sumMonth(previousMonth(thisMonth)),
    },
  };
}
