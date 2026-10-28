/**
 * SERVER-ONLY. Checking what the Admin Panel sends about a member.
 */
import { DAY_KEYS, START_TIMES, endTimeFor, isValidTimeZone, sortDays } from "@/lib/availability";
import { isValidEmail } from "@/lib/validation";
import { BANK_IDS, MAX_HOURS_PER_DAY, isBankId, type BankId, type TeamSchedule } from "@/lib/teamShared";

export function readSchedule(raw: unknown, problems: string[]): TeamSchedule | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const days = sortDays(Array.isArray(r.days) ? r.days.filter((d): d is string => typeof d === "string") : []);
  const startTime = typeof r.startTime === "string" ? r.startTime : "";
  const timeZone = typeof r.timeZone === "string" ? r.timeZone.trim() : "";
  if (!days.length || days.some((d) => !(DAY_KEYS as readonly string[]).includes(d))) problems.push("Choose the work days.");
  if (!START_TIMES.includes(startTime)) problems.push("Choose the start time.");
  if (!isValidTimeZone(timeZone)) problems.push("Choose the timezone.");
  if (problems.length) return null;
  return { days, startTime, endTime: endTimeFor(startTime), timeZone };
}

export function readMoney(v: unknown, opts: { min?: number; max?: number } = {}): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  if (!Number.isFinite(n)) return null;
  if (opts.min !== undefined && n < opts.min) return null;
  if (opts.max !== undefined && n > opts.max) return null;
  return Math.round(n * 100) / 100;
}

export function readHours(v: unknown): number | null {
  return readMoney(v, { min: 0, max: MAX_HOURS_PER_DAY });
}

export function readDate(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : null;
}

export function readBanks(v: unknown): BankId[] {
  return Array.isArray(v) ? BANK_IDS.filter((b) => v.includes(b) && isBankId(b)) : [];
}

export function readText(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** "+44 7700 900123" — digits, spaces and a leading +, 7 to 20 characters. */
export function readPhone(v: unknown): string | null {
  const s = readText(v, 30);
  if (!s) return "";
  return /^\+?[0-9][0-9 ()-]{5,22}$/.test(s) ? s : null;
}

export function readEmail(v: unknown): string | null {
  const s = readText(v, 200);
  if (!s) return "";
  return isValidEmail(s) ? s : null;
}
