/**
 * Automatic work hours: which days are owed, and what the money adds up to.
 *
 * Pure module — no filesystem — so the rules can be read in one place and the
 * dashboard, the statement and the Admin Panel all count the same way.
 *
 * A member's day is added once it is over: when the eight-hour window they
 * chose on accepting has ended, in their own timezone. Nothing is added ahead
 * of time, so a day can still be marked off or changed before it counts, and
 * a server that was down catches up on every finished day it missed — each
 * date at most once.
 */
import { WINDOW_HOURS, offsetMinutes, timeToMinutes } from "@/lib/availability";
import {
  addDays,
  dayKeyOf,
  isPaidStatus,
  round2,
  type TeamSchedule,
  type WorkStatus,
} from "@/lib/teamShared";

/** The instant a wall-clock time on a date happens in a timezone. */
export function localInstant(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const mins = timeToMinutes(time);
  const naive = Date.UTC(y, m - 1, d, Math.floor(mins / 60), mins % 60);
  // Twice, so a date on the far side of a clock change uses that side's offset.
  let t = naive - offsetMinutes(timeZone, new Date(naive)) * 60_000;
  t = naive - offsetMinutes(timeZone, new Date(t)) * 60_000;
  return t;
}

/** When the work window that starts on `date` closes. */
export function windowEndsAt(date: string, s: Pick<TeamSchedule, "startTime" | "timeZone">): number {
  return localInstant(date, s.startTime, s.timeZone) + WINDOW_HOURS * 3_600_000;
}

export function windowStartsAt(date: string, s: Pick<TeamSchedule, "startTime" | "timeZone">): number {
  return localInstant(date, s.startTime, s.timeZone);
}

/** Today's date where the member is, "YYYY-MM-DD". */
export function localDate(timeZone: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export interface RateFrom {
  /** First day this rate applies to, "YYYY-MM-DD". */
  from: string;
  /** US dollars per hour. */
  rate: number;
}

/** The rate in force on a day. Changing a rate never reaches back. */
export function rateOn(rates: RateFrom[], date: string): number {
  const sorted = [...rates].sort((a, b) => a.from.localeCompare(b.from));
  let rate = sorted[0]?.rate ?? 0;
  for (const r of sorted) if (r.from <= date) rate = r.rate;
  return rate;
}

export interface AccrualMember {
  status: "active" | "paused" | "left";
  schedule: TeamSchedule;
  hoursPerDay: number;
  rates: RateFrom[];
  firstWorkDay: string;
  accruedThrough?: string;
  checkInRequired: boolean;
}

export interface AccrualContext {
  /** An entry for this date already exists (added by hand, or before). */
  hasEntry: (date: string) => boolean;
  dayOffApproved: (date: string) => boolean;
  checkedIn: (date: string) => boolean;
}

export interface PlannedEntry {
  date: string;
  hours: number;
  rate: number;
  status: WorkStatus;
}

/** Never walk further than this in one go, whatever the dates say. */
const MAX_DAYS_PER_RUN = 400;

/**
 * Every finished day since the last run, and what each one is worth.
 *
 * A day that is not one of their five, or falls while they are paused or have
 * left, is passed over and not added later: pausing someone stops the clock
 * rather than storing up days for when they come back.
 */
export function planAccrual(
  m: AccrualMember,
  ctx: AccrualContext,
  now: number,
): { entries: PlannedEntry[]; accruedThrough?: string } {
  const entries: PlannedEntry[] = [];
  let date = m.accruedThrough ? addDays(m.accruedThrough, 1) : m.firstWorkDay;
  let through = m.accruedThrough;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { entries, accruedThrough: through };

  for (let i = 0; i < MAX_DAYS_PER_RUN; i++) {
    if (windowEndsAt(date, m.schedule) > now) break;
    const scheduled = m.schedule.days.includes(dayKeyOf(date));
    if (m.status === "active" && scheduled && !ctx.hasEntry(date)) {
      const rate = rateOn(m.rates, date);
      if (ctx.dayOffApproved(date)) entries.push({ date, hours: 0, rate, status: "dayoff" });
      else if (m.checkInRequired && !ctx.checkedIn(date)) entries.push({ date, hours: 0, rate, status: "no_checkin" });
      else entries.push({ date, hours: m.hoursPerDay, rate, status: "worked" });
    }
    through = date;
    date = addDays(date, 1);
  }
  return { entries, accruedThrough: through };
}

export interface MoneyEntry {
  date: string;
  hours: number;
  rate: number;
  status: WorkStatus;
}

export function entryAmount(e: MoneyEntry): number {
  return isPaidStatus(e.status) ? round2(e.hours * e.rate) : 0;
}

export interface Totals {
  hours: number;
  earned: number;
  adjustments: number;
  paid: number;
  balance: number;
}

/** Earned from hours, plus bonuses less deductions, less what has been paid. */
export function totals(
  entries: MoneyEntry[],
  adjustments: { amount: number }[],
  payments: { amount: number }[],
): Totals {
  const paidEntries = entries.filter((e) => isPaidStatus(e.status));
  const hours = round2(paidEntries.reduce((s, e) => s + e.hours, 0));
  const earned = round2(paidEntries.reduce((s, e) => s + entryAmount(e), 0));
  const adj = round2(adjustments.reduce((s, a) => s + a.amount, 0));
  const paid = round2(payments.reduce((s, p) => s + p.amount, 0));
  return { hours, earned, adjustments: adj, paid, balance: round2(earned + adj - paid) };
}

/** Monday of the week a date is in. */
export function weekStart(date: string): string {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

/** Earnings per week for the last `weeks` weeks, oldest first, for the chart. */
export function weeklyEarnings(
  entries: MoneyEntry[],
  adjustments: { date: string; amount: number }[],
  today: string,
  weeks = 12,
): { week: string; amount: number; hours: number }[] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const out = Array.from({ length: weeks }, (_, i) => ({ week: addDays(first, 7 * i), amount: 0, hours: 0 }));
  const idx = (date: string) => Math.floor((Date.parse(`${weekStart(date)}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / (7 * 86_400_000));
  for (const e of entries) {
    const i = idx(e.date);
    if (i < 0 || i >= weeks) continue;
    out[i].amount = round2(out[i].amount + entryAmount(e));
    if (isPaidStatus(e.status)) out[i].hours = round2(out[i].hours + e.hours);
  }
  for (const a of adjustments) {
    const i = idx(a.date);
    if (i >= 0 && i < weeks) out[i].amount = round2(out[i].amount + a.amount);
  }
  return out;
}

/**
 * Whether "Start work" can be pressed now, and for which day: from an hour
 * before the window opens until it closes, on one of their days.
 */
export function checkInDay(s: TeamSchedule, now: number): string | null {
  const today = localDate(s.timeZone, new Date(now));
  // Yesterday too: a window that opens late in the evening is still running
  // after midnight.
  for (const date of [today, addDays(today, -1)]) {
    if (!s.days.includes(dayKeyOf(date))) continue;
    const start = windowStartsAt(date, s);
    if (now >= start - 3_600_000 && now < windowEndsAt(date, s)) return date;
  }
  return null;
}
