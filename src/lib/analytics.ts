/**
 * Periods, day keys and daily figures — the arithmetic behind the dashboard.
 *
 * Pure: no filesystem, no node built-ins, no network, so the store, the page
 * and the tests all agree on what "last month" means rather than each working
 * it out again.
 *
 * Everything here is expressed in **day keys** ("2026-09-03"), never in
 * timestamps. A day is a local thing — it begins and ends at the business's
 * midnight, not at UTC's — and once a date has been reduced to a key in the
 * right timezone, every range, comparison and total is plain string and
 * integer work with no clock left in it to get wrong.
 */
import { siteConfig } from "@/config/site";

export const TZ = siteConfig.timeZone;

/** What one day of traffic looked like. */
export interface DayStats {
  /** "YYYY-MM-DD" in site time. */
  day: string;
  views: number;
  /**
   * Distinct visitors *that day*.
   *
   * Deliberately not comparable across days: the identifier is rebuilt from a
   * salt that changes at midnight, so the same person is a different number
   * tomorrow. That is what lets this run without a cookie — and it means a
   * multi-day visitor total is a sum of daily figures, counting a returning
   * visitor once per day they came. `totalsOf` says so; the dashboard repeats
   * it in words. A number that quietly means something else is worse than no
   * number at all.
   */
  visitors: number;
  /** Views per hour of the local day, 24 entries. Visitors are not split by hour. */
  hours: number[];
  pages: Record<string, number>;
  countries: Record<string, number>;
  referrers: Record<string, number>;
  devices: { mobile: number; desktop: number };
}

export function emptyDay(day: string): DayStats {
  return {
    day,
    views: 0,
    visitors: 0,
    hours: new Array(24).fill(0),
    pages: {},
    countries: {},
    referrers: {},
    devices: { mobile: 0, desktop: 0 },
  };
}

/* ------------------------------------------------------------------ *
 * Day keys
 * ------------------------------------------------------------------ */

/**
 * The local calendar day an instant falls on.
 *
 * en-CA formats as "YYYY-MM-DD", which is the key format, so this is one
 * formatter rather than three parts glued together.
 */
export function dayKey(at: Date, timeZone: string = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** The local hour (0–23) an instant falls in. */
export function hourOf(at: Date, timeZone: string = TZ): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).format(at);
  // "24" appears in some locales for midnight; fold it back to 0.
  return Number(h) % 24;
}

/**
 * Shift a day key by whole days.
 *
 * Anchored at midday UTC so that adding a day cannot land on the wrong side of
 * a daylight-saving shift — the key is a calendar date, and this keeps it one.
 */
export function addDays(key: string, days: number): string {
  const at = new Date(`${key}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** Every day key from `from` to `to`, inclusive. */
export function daysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push(d);
    if (out.length > 4000) break; // a decade; a runaway range is a bug, not a query
  }
  return out;
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${key.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export function addMonths(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${at.toISOString().slice(0, 7)}-01`;
}

/* ------------------------------------------------------------------ *
 * Periods
 * ------------------------------------------------------------------ */

export type PeriodId =
  | "today"
  | "yesterday"
  | "7d"
  | "month"
  | "lastMonth"
  | "90d"
  | "year"
  | "lastYear"
  | "custom";

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "90d", label: "Last 90 days" },
  { id: "year", label: "This year" },
  { id: "lastYear", label: "Last year" },
];

export interface Range {
  from: string;
  to: string;
}

export function isPeriodId(v: unknown): v is PeriodId {
  return typeof v === "string" && (v === "custom" || PERIODS.some((p) => p.id === v));
}

/**
 * Turn a period into a pair of day keys.
 *
 * "Last 7 days" includes today, which is what someone checking at lunchtime
 * expects — a week ending yesterday would ignore the morning they are asking
 * about. "This month" and "This year" run to today rather than to the end of
 * the period, so they never count days that have not happened.
 */
export function resolvePeriod(id: PeriodId, today: string, custom?: Partial<Range>): Range {
  switch (id) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: startOfMonth(today), to: today };
    case "lastMonth": {
      const prev = addMonths(startOfMonth(today), -1);
      return { from: prev, to: endOfMonth(prev) };
    }
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "lastYear": {
      const y = Number(today.slice(0, 4)) - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    case "custom": {
      const from = validKey(custom?.from) ?? today;
      const to = validKey(custom?.to) ?? today;
      // Accept the two dates in either order rather than returning nothing.
      return from <= to ? { from, to } : { from: to, to: from };
    }
  }
}

function validKey(v: string | undefined): string | null {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/**
 * The equal-length window immediately before this one, for the change figures.
 *
 * Equal length rather than "the previous calendar month": comparing the first
 * nine days of September against the whole of August would show a collapse
 * every month, on the 9th of every month.
 */
export function previousRange(range: Range): Range {
  const length = daysInRange(range.from, range.to).length;
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

/** How the trend chart should bucket a range. */
export function granularityOf(range: Range): "hour" | "day" | "month" {
  const days = daysInRange(range.from, range.to).length;
  if (days === 1) return "hour";
  return days <= 120 ? "day" : "month";
}

/* ------------------------------------------------------------------ *
 * Totals
 * ------------------------------------------------------------------ */

export interface Totals {
  views: number;
  /** Summed daily figures — a returning visitor counts once per day. */
  visitors: number;
  days: number;
  pages: Record<string, number>;
  countries: Record<string, number>;
  referrers: Record<string, number>;
  devices: { mobile: number; desktop: number };
}

function addInto(target: Record<string, number>, source: Record<string, number>) {
  for (const [k, v] of Object.entries(source)) target[k] = (target[k] ?? 0) + v;
}

export function totalsOf(days: readonly DayStats[]): Totals {
  const out: Totals = {
    views: 0,
    visitors: 0,
    days: days.length,
    pages: {},
    countries: {},
    referrers: {},
    devices: { mobile: 0, desktop: 0 },
  };
  for (const d of days) {
    out.views += d.views;
    out.visitors += d.visitors;
    addInto(out.pages, d.pages);
    addInto(out.countries, d.countries);
    addInto(out.referrers, d.referrers);
    out.devices.mobile += d.devices.mobile;
    out.devices.desktop += d.devices.desktop;
  }
  return out;
}

/** The biggest `n` entries, largest first, for a breakdown list. */
export function topEntries(counts: Record<string, number>, n = 8): { key: string; count: number }[] {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, n);
}

/**
 * Change against the previous period, as a percentage.
 *
 * Null where there is nothing to compare against: growth from zero is not
 * "+100%", it is a first day, and printing a number there invents a trend out
 * of an empty week.
 */
export function delta(now: number, before: number): number | null {
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export function ratio(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}
