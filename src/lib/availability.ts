/**
 * When a contractor is available, and the shape that availability must take.
 *
 * Pure module — no filesystem, no node built-ins — so the acceptance form, the
 * API route that stores the answer and the Admin Panel that reads it all share
 * one definition. The browser's copy is a courtesy to the candidate; the
 * server runs the same checks because a browser check is not a control.
 *
 * The rules are deliberately rigid, because the thing being agreed is a
 * schedule and a schedule that means two different things to two people is
 * worse than no schedule at all:
 *
 *   * the window is exactly eight hours. The candidate chooses when it starts,
 *     never how long it is — an eight-hour window with five hours of work in
 *     it leaves room for the work to move around inside the day, which is the
 *     entire reason for the gap;
 *   * exactly five days, any five. Weekends are somebody's ordinary week;
 *   * a timezone always travels with the times. "08:00" without one is the
 *     single most expensive ambiguity in remote work — it is how a person
 *     turns up an hour late to their own first day.
 */

/** The window a candidate commits to, in hours. Not negotiable, by design. */
export const WINDOW_HOURS = 8;

/** The most that will actually be worked inside that window, in hours. */
export const MAX_HOURS_PER_DAY = 5;

/** Exactly this many days, chosen from the seven. */
export const REQUIRED_DAYS = 5;

/** 5 days × 5 hours. The ceiling on anything weekly, everywhere. */
export const MAX_HOURS_PER_WEEK = MAX_HOURS_PER_DAY * REQUIRED_DAYS;

/** Where the company keeps time, for showing both sides of a window. */
export const COMPANY_TIME_ZONE = "Europe/London";
export const COMPANY_TIME_LABEL = "UK time";

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

/**
 * The starts on offer, every half hour from early to late.
 *
 * A list rather than a free text box: "8h30", "8.30am" and "0830" are all the
 * same intention and none of them parse, and the person typing is on a phone.
 */
export const START_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 20 * 60; m += 30) out.push(minutesToTime(m));
  return out;
})();

export interface Availability {
  /** "HH:MM", 24-hour, in `timeZone`. */
  startTime: string;
  /** Always startTime + WINDOW_HOURS. Stored so nothing has to recompute it. */
  endTime: string;
  /** IANA zone, e.g. "Africa/Casablanca". */
  timeZone: string;
  /** Exactly REQUIRED_DAYS keys, in week order. */
  days: DayKey[];
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** The end of the window that starts at `startTime`. */
export function endTimeFor(startTime: string): string {
  return minutesToTime(timeToMinutes(startTime) + WINDOW_HOURS * 60);
}

/** True when the window runs past midnight, which the display has to admit. */
export function crossesMidnight(startTime: string): boolean {
  return timeToMinutes(startTime) + WINDOW_HOURS * 60 >= 1440;
}

/**
 * How far ahead of UTC a zone is right now, in minutes.
 *
 * Derived by asking Intl what the wall clock reads there and comparing, which
 * is the only way to get this right across daylight saving without shipping a
 * timezone database.
 */
export function offsetMinutes(timeZone: string, at: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    );
    return Math.round((asUtc - at.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/** "UTC+01:00" for a zone, as people expect to see it written. */
export function offsetLabel(timeZone: string, at: Date = new Date()): string {
  const mins = offsetMinutes(timeZone, at);
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** The same instant's wall-clock time, read in another zone. */
export function timeIn(time: string, from: string, to: string, at: Date = new Date()): string {
  return minutesToTime(timeToMinutes(time) + offsetMinutes(to, at) - offsetMinutes(from, at));
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string" || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Every zone this runtime knows, for the picker. Short fallback if unavailable. */
export function knownTimeZones(): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  if (typeof supported === "function") {
    try {
      const list = supported("timeZone");
      if (Array.isArray(list) && list.length) return list;
    } catch {
      /* fall through to the short list */
    }
  }
  return [
    "Africa/Casablanca", "Africa/Lagos", "Africa/Cairo", "Africa/Nairobi",
    "Africa/Johannesburg", "Europe/London", "Europe/Paris", "Europe/Bucharest",
    "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Manila",
    "America/New_York", "America/Sao_Paulo", "UTC",
  ];
}

/** Whatever zone the browser believes it is in, as the starting point. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || COMPANY_TIME_ZONE;
  } catch {
    return COMPANY_TIME_ZONE;
  }
}

/** Week order, so "Fri, Mon, Sat" is never stored or shown. */
export function sortDays(days: string[]): DayKey[] {
  return DAY_KEYS.filter((d) => days.includes(d));
}

/**
 * Validate what the candidate sent and return it normalised.
 *
 * The end time is recomputed rather than trusted: it is the half of the window
 * the candidate never chose, so accepting theirs would let a crafted request
 * store a window of any length at all.
 */
export function validateAvailability(
  input: unknown,
): { ok: true; availability: Availability } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  const raw = (input ?? {}) as Record<string, unknown>;

  const startTime = typeof raw.startTime === "string" ? raw.startTime.trim() : "";
  if (!START_TIMES.includes(startTime)) {
    problems.push("Choose the time your availability starts.");
  }

  const timeZone = typeof raw.timeZone === "string" ? raw.timeZone.trim() : "";
  if (!isValidTimeZone(timeZone)) {
    problems.push("Choose your timezone.");
  }

  const rawDays = Array.isArray(raw.days) ? raw.days : [];
  const days = sortDays(
    [...new Set(rawDays.filter((d): d is string => typeof d === "string"))],
  );
  if (days.length !== REQUIRED_DAYS) {
    problems.push(`Choose exactly ${REQUIRED_DAYS} days you are available.`);
  }

  if (problems.length) return { ok: false, problems };
  return {
    ok: true,
    availability: { startTime, endTime: endTimeFor(startTime), timeZone, days },
  };
}

/** "08:00 – 16:00" for a window. */
export function formatWindow(a: Pick<Availability, "startTime" | "endTime">): string {
  return `${a.startTime} – ${a.endTime}`;
}

/** "Mon, Tue, Wed, Thu, Fri". */
export function formatDays(days: string[]): string {
  return sortDays(days).join(", ");
}

/** One line for a row in the Admin Panel. */
export function formatAvailability(a: Availability): string {
  return `${formatWindow(a)} ${a.timeZone} · ${formatDays(a.days)}`;
}

/** The same window read from the office, for a recruiter comparing diaries. */
export function windowInCompanyTime(a: Availability, at: Date = new Date()): string {
  return `${timeIn(a.startTime, a.timeZone, COMPANY_TIME_ZONE, at)} – ${timeIn(
    a.endTime,
    a.timeZone,
    COMPANY_TIME_ZONE,
    at,
  )}`;
}
