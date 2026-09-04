/**
 * SERVER-ONLY store for visitor figures.
 *
 * Nothing raw is kept. A page view is folded straight into the counters for
 * the day it happened on, and the event itself is gone — there is no log of
 * who looked at what, only how many did. That is the whole design: a file of
 * per-day totals cannot leak a browsing history because it never held one.
 *
 * Two things this has to avoid, both of which would break the site rather than
 * just the numbers:
 *
 *   - **A write per view.** The candidate store rewrites its whole file on
 *     every change, which is fine a few times an hour and ruinous a few times
 *     a second. Views are counted in memory and flushed on a timer, so a busy
 *     minute is one write, not four hundred.
 *   - **Blocking a page load.** Nothing here is awaited by anything a visitor
 *     is waiting for, and every failure is swallowed. Losing a few counts to a
 *     crash costs a rounding error on a chart; losing a visit costs an
 *     application.
 *
 * The in-memory copy is the working authority and the file is its backup,
 * which assumes one server process — the same assumption the candidate store
 * already makes.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { dayKey, emptyDay, daysInRange, type DayStats } from "@/lib/analytics";
import { newSalt } from "@/lib/visitorId";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "analytics.json");

/** Long enough for "last year" to be a full year with room to spare. */
const KEEP_DAYS = 800;

/** One write per quarter-minute at most, however busy it gets. */
const FLUSH_MS = 15_000;

/**
 * Above this many visitors in one day, stop remembering which ones we have
 * seen. Views stay exact; the visitor count stops rising. A JSON file has
 * comfortably outlived its usefulness by then, and an unbounded list in memory
 * is how a server runs out of it.
 */
const MAX_TRACKED_VISITORS = 50_000;

interface StoreFile {
  days: Record<string, DayStats>;
  /** The current day's secret and the ids seen under it. Reset at midnight. */
  current: { day: string; salt: string; seen: string[] };
}

export interface ViewEvent {
  /** When it happened, so a flush that straddles midnight still files it right. */
  at: Date;
  hour: number;
  path: string;
  country: string;
  referrer: string;
  device: "mobile" | "desktop";
  /** Already hashed. A raw address must never reach this module. */
  visitor: string;
}

let state: StoreFile | null = null;
let loading: Promise<StoreFile> | null = null;
let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Serialized like the candidate store, so two flushes cannot interleave. */
let writeChain: Promise<unknown> = Promise.resolve();

function fresh(day: string): StoreFile {
  return { days: {}, current: { day, salt: newSalt(), seen: [] } };
}

/** Tolerant of a file written by an older shape, or of no file at all. */
function parse(raw: string, today: string): StoreFile {
  try {
    const data = JSON.parse(raw) as Partial<StoreFile>;
    const days: Record<string, DayStats> = {};
    for (const [key, value] of Object.entries(data.days ?? {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value) continue;
      const d = value as Partial<DayStats>;
      days[key] = {
        ...emptyDay(key),
        ...d,
        // A short or missing array would make the hourly chart throw.
        hours: Array.isArray(d.hours) && d.hours.length === 24 ? d.hours : new Array(24).fill(0),
        devices: { mobile: d.devices?.mobile ?? 0, desktop: d.devices?.desktop ?? 0 },
      };
    }
    const c = data.current;
    return {
      days,
      current:
        c && c.day === today && typeof c.salt === "string"
          ? { day: c.day, salt: c.salt, seen: Array.isArray(c.seen) ? c.seen : [] }
          : // A salt from another day must not be reused: keeping it would let
            // yesterday's ids be matched against today's.
            { day: today, salt: newSalt(), seen: [] },
    };
  } catch {
    return fresh(today);
  }
}

async function load(): Promise<StoreFile> {
  if (state) return state;
  if (loading) return loading;
  loading = (async () => {
    const today = dayKey(new Date());
    let file: StoreFile;
    try {
      file = parse(await fs.readFile(FILE, "utf8"), today);
    } catch {
      file = fresh(today);
    }
    state = file;
    return file;
  })();
  return loading;
}

/**
 * Roll over to a new day if one has started.
 *
 * The seen-set and the salt are dropped rather than archived — keeping either
 * would defeat the point of rotating them.
 */
function rollTo(file: StoreFile, day: string) {
  if (file.current.day === day) return;
  file.current = { day, salt: newSalt(), seen: [] };
  // Prune here rather than on a schedule: it is the one moment the set of days
  // actually changes, and it keeps the file from growing without limit.
  const cutoff = daysInRange(day, day)[0];
  for (const key of Object.keys(file.days)) {
    if (daysBefore(key, cutoff) > KEEP_DAYS) delete file.days[key];
  }
}

function daysBefore(key: string, today: string): number {
  const a = Date.parse(`${key}T12:00:00Z`);
  const b = Date.parse(`${today}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function bump(counts: Record<string, number>, key: string) {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
  // Never hold the process open for a counter.
  timer.unref?.();
}

/** Write the in-memory figures out. Safe to call at any time. */
export function flush(): Promise<void> {
  const run = async () => {
    if (!state || !dirty) return;
    dirty = false;
    const snapshot = JSON.stringify(state);
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(FILE, snapshot, "utf8");
    } catch {
      // Put the flag back so the next tick tries again rather than losing the
      // day's counts to one bad write.
      dirty = true;
    }
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => {});
  return p as Promise<void>;
}

/**
 * Count one page view.
 *
 * Returns whether this was the visitor's first view today, which is the only
 * moment worth spending a country lookup on.
 */
export async function recordView(event: ViewEvent): Promise<{ firstToday: boolean }> {
  const file = await load();
  const day = dayKey(event.at);
  rollTo(file, day);

  const stats = (file.days[day] ??= emptyDay(day));
  stats.views += 1;
  stats.hours[event.hour] = (stats.hours[event.hour] ?? 0) + 1;
  bump(stats.pages, event.path);
  bump(stats.referrers, event.referrer);
  if (event.country) bump(stats.countries, event.country);
  stats.devices[event.device] += 1;

  let firstToday = false;
  if (file.current.seen.length < MAX_TRACKED_VISITORS && !file.current.seen.includes(event.visitor)) {
    file.current.seen.push(event.visitor);
    stats.visitors += 1;
    firstToday = true;
  }

  dirty = true;
  schedule();
  return { firstToday };
}

/**
 * Attribute a visitor to a country after the fact.
 *
 * The lookup that produces this takes a moment, and a page view must not wait
 * for it, so the view is counted with no country and the country is added when
 * it arrives. Same day only — a late answer must not land on tomorrow.
 */
export async function attributeCountry(day: string, country: string): Promise<void> {
  const file = await load();
  const stats = file.days[day];
  if (!stats || !country) return;
  bump(stats.countries, country);
  dirty = true;
  schedule();
}

/** Today's secret, for hashing a visitor. Rotates itself when the day turns. */
export async function currentSalt(): Promise<string> {
  const file = await load();
  rollTo(file, dayKey(new Date()));
  return file.current.salt;
}

/**
 * The figures as they stand on disk, for reading rather than counting.
 *
 * Deliberately not the in-memory copy. Next bundles a route handler and a page
 * separately, so `/api/track` and `/admin` can end up holding one of these
 * modules each — and a dashboard reading its own instance's memory would show
 * whatever the file happened to contain the first time that page was rendered,
 * for as long as the server stayed up. It looked correct in isolation and went
 * quietly stale in use, which is the worst way for a number to be wrong.
 *
 * Reading the file costs one small read per dashboard load. Our own unflushed
 * counts are written out first, so nothing in hand is missed.
 */
async function snapshot(): Promise<StoreFile> {
  if (dirty) await flush();
  const today = dayKey(new Date());
  try {
    return parse(await fs.readFile(FILE, "utf8"), today);
  } catch {
    return fresh(today);
  }
}

/**
 * Every day in the range, missing ones filled in as zeroes.
 *
 * Filled rather than skipped so a chart shows a quiet Sunday as a gap in the
 * traffic instead of closing up and pretending the week was six days long.
 */
export async function readRange(from: string, to: string): Promise<DayStats[]> {
  const file = await snapshot();
  return daysInRange(from, to).map((day) => file.days[day] ?? emptyDay(day));
}

/** The first day anything was recorded, so the dashboard can say since when. */
export async function firstRecordedDay(): Promise<string | null> {
  const file = await snapshot();
  const keys = Object.keys(file.days).sort();
  return keys[0] ?? null;
}

/** Testing seam: drop the in-memory copy so the next read comes off disk. */
export function resetForTests() {
  state = null;
  loading = null;
  dirty = false;
}
