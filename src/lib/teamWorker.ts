/**
 * SERVER-ONLY. The timer that adds members' finished work days.
 *
 * Every ten minutes, and once at start-up so a deploy catches up straight
 * away. Each run only adds days that are over and not yet counted, so running
 * it more often, twice, or after a long outage gives the same result.
 */
import { accrueAll } from "@/lib/teamStore";

const EVERY_MS = 10 * 60 * 1000;

const g = globalThis as unknown as { __teamWorker?: ReturnType<typeof setInterval> };

async function run() {
  try {
    const added = await accrueAll();
    // eslint-disable-next-line no-console
    if (added) console.log(`[team] added ${added} work day${added === 1 ? "" : "s"}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[team] could not add work days:", err);
  }
}

export function ensureTeamWorker(): void {
  if (g.__teamWorker) return;
  g.__teamWorker = setInterval(() => void run(), EVERY_MS);
  // Never keep the process alive just for this.
  g.__teamWorker.unref?.();
  void run();
}
