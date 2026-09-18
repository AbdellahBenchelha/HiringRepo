/**
 * SERVER-ONLY persistence for the sending warm-up.
 *
 * Its own small file beside candidates.json, for the reason the other settings
 * files are: a counter that ticks on every message must never rewrite the file
 * holding every application.
 *
 * One process only, like the rest of the store. Writes are serialised through
 * a chain here, which is what makes "add one to today" safe when two messages
 * finish at the same moment — but it is in-process serialisation, so a second
 * Railway instance would keep a second counter and the cap would quietly
 * double. That is a property of the whole JSON store, not of this file, and it
 * is the one place where it would be actively misleading rather than merely
 * lossy, so it is worth saying out loud.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import {
  allowanceOf,
  emptyDay,
  stageAt,
  warmupDay,
  WARMUP_STAGES,
  type Allowance,
  type DayCounts,
  type EmailKind,
} from "@/lib/warmup";

const FILE = "warmup.json";

/** Three months is enough to see a ramp and short enough to stay small. */
const KEEP_DAYS = 90;

export interface WarmupConfig {
  /** The live cap. Editable, so a bad week can be held rather than climbed. */
  dailyCap: number;
  /** Which rung of the default curve the cap came from, for the tab's display. */
  stageIndex: number;
  /** When this stage started, so "days at this volume" is real. */
  stageSince: string;
  startedOn: string;
  updatedAt?: string;
}

export interface WarmupData {
  config: WarmupConfig;
  days: DayCounts[];
}

const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = () => path.join(dir(), FILE);

function defaultConfig(): WarmupConfig {
  const today = warmupDay();
  return { dailyCap: WARMUP_STAGES[0].cap, stageIndex: 0, stageSince: today, startedOn: today };
}

function normalise(raw: unknown): WarmupData {
  const data = (raw ?? {}) as Partial<WarmupData>;
  const cfg = (data.config ?? {}) as Partial<WarmupConfig>;
  const today = warmupDay();
  // Built field by field rather than spread, so a row written by an older
  // version — which carried bounce and complaint counters — is read as the
  // fields that still exist and loses the rest on the next write, instead of
  // carrying dead numbers forward forever.
  const days = Array.isArray(data.days)
    ? data.days
        .filter((d): d is DayCounts => !!d && typeof d.day === "string")
        .map((d) => ({
          day: d.day,
          sent: typeof d.sent === "number" ? d.sent : 0,
          reactive: typeof d.reactive === "number" ? d.reactive : 0,
          overrides: typeof d.overrides === "number" ? d.overrides : 0,
        }))
    : [];
  return {
    config: {
      dailyCap:
        typeof cfg.dailyCap === "number" && cfg.dailyCap > 0
          ? Math.floor(cfg.dailyCap)
          : WARMUP_STAGES[0].cap,
      stageIndex:
        typeof cfg.stageIndex === "number"
          ? Math.max(0, Math.min(Math.floor(cfg.stageIndex), WARMUP_STAGES.length - 1))
          : 0,
      stageSince: typeof cfg.stageSince === "string" ? cfg.stageSince : today,
      startedOn: typeof cfg.startedOn === "string" ? cfg.startedOn : today,
      updatedAt: typeof cfg.updatedAt === "string" ? cfg.updatedAt : undefined,
    },
    days,
  };
}

export async function readWarmup(): Promise<WarmupData> {
  try {
    return normalise(JSON.parse(await fs.readFile(file(), "utf8")));
  } catch {
    return { config: defaultConfig(), days: [] };
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Read, change, write — with every other writer waiting.
 *
 * Every message that leaves passes through here, so without the chain two
 * sends finishing together would both read "7", both write "8", and the day's
 * count would drift below the truth exactly when volume is highest.
 */
function withWarmup<T>(fn: (data: WarmupData) => { data: WarmupData; result: T }): Promise<T> {
  const run = writeChain.then(async () => {
    const current = await readWarmup();
    const { data, result } = fn(current);
    // Drop anything past the window before writing, so the file cannot grow
    // without bound on a long-running deployment.
    const kept = [...data.days].sort((a, b) => a.day.localeCompare(b.day)).slice(-KEEP_DAYS);
    await fs.mkdir(dir(), { recursive: true });
    await writeFileAtomic(file(), JSON.stringify({ ...data, days: kept }, null, 2));
    return result;
  });
  writeChain = run.catch(() => {});
  return run;
}

/** Today's row, created on demand. */
function touchDay(data: WarmupData, day: string): DayCounts {
  const found = data.days.find((d) => d.day === day);
  if (found) return found;
  const fresh = emptyDay(day);
  data.days.push(fresh);
  return fresh;
}

/**
 * One message left. Counted whatever kind it was.
 *
 * Reactive mail is counted but never blocked, so the tab describes everything
 * that actually went out rather than only the part that was throttled.
 */
export function recordSend(kind: EmailKind): Promise<DayCounts> {
  return withWarmup((data) => {
    const day = touchDay(data, warmupDay());
    day.sent += 1;
    if (kind === "reactive") day.reactive += 1;
    return { data, result: { ...day } };
  });
}

/** The cap was knowingly exceeded. Recorded so the history does not flatter. */
export function recordOverride(): Promise<DayCounts> {
  return withWarmup((data) => {
    const day = touchDay(data, warmupDay());
    day.overrides += 1;
    return { data, result: { ...day } };
  });
}

export async function currentAllowance(): Promise<Allowance> {
  const data = await readWarmup();
  const today = data.days.find((d) => d.day === warmupDay());
  return allowanceOf(data.config.dailyCap, today?.sent ?? 0);
}

/**
 * Would a campaign send be refused right now?
 *
 * For the callers that write to the candidate's record *before* sending —
 * because the page the email points at has to be able to read the link back
 * out, and a candidate who opens it immediately must not beat the write. That
 * ordering is right, but it means a refused send leaves a row saying the thing
 * was sent when nothing left, which is worse than either outcome on its own:
 * nobody goes looking for an email the panel says already arrived.
 *
 * Asking first costs one small file read and keeps the record honest. It is
 * advisory — sendEmail still decides — so the worst a race can do is let one
 * message through, never write a false timestamp.
 */
export async function campaignBlocked(): Promise<boolean> {
  return (await currentAllowance()).remaining <= 0;
}

/** Change the cap by hand, leaving the stage where it is. */
export function setDailyCap(cap: number): Promise<WarmupConfig> {
  return withWarmup((data) => {
    const next: WarmupConfig = {
      ...data.config,
      dailyCap: Math.max(1, Math.floor(cap)),
      updatedAt: new Date().toISOString(),
    };
    return { data: { ...data, config: next }, result: next };
  });
}

/**
 * Move to the next rung, resetting the clock on "days at this volume".
 *
 * The clock reset is the point: stepping up and immediately being told you may
 * step up again would turn the whole curve into a single afternoon.
 */
export function stepUpStage(): Promise<WarmupConfig> {
  return withWarmup((data) => {
    const index = Math.min(data.config.stageIndex + 1, WARMUP_STAGES.length - 1);
    const next: WarmupConfig = {
      ...data.config,
      stageIndex: index,
      dailyCap: stageAt(index).cap,
      stageSince: warmupDay(),
      updatedAt: new Date().toISOString(),
    };
    return { data: { ...data, config: next }, result: next };
  });
}

/** Drop back a rung, for a week that wants holding rather than climbing. */
export function stepDownStage(): Promise<WarmupConfig> {
  return withWarmup((data) => {
    const index = Math.max(data.config.stageIndex - 1, 0);
    const next: WarmupConfig = {
      ...data.config,
      stageIndex: index,
      dailyCap: stageAt(index).cap,
      stageSince: warmupDay(),
      updatedAt: new Date().toISOString(),
    };
    return { data: { ...data, config: next }, result: next };
  });
}
