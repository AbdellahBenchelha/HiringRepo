import { sendAssessmentEmail, sendReminderEmail } from "@/lib/candidateEmails";
import { markItem, readBatch, setNextAt } from "@/lib/bulkEmailStore";
import { nextGapMs, type BatchState } from "@/lib/bulkEmail";

/**
 * SERVER-ONLY. Sends one candidate's email, waits, sends the next.
 *
 * A timer in the server process rather than a loop in the recruiter's browser.
 * A batch of fifty a minute apart is the best part of an hour, and the whole
 * reason for the feature is that they can start it and go and do something
 * else — a loop in a page dies the moment the laptop sleeps, halfway through,
 * with nothing to show for it.
 *
 * Every step is written to disk before the next is scheduled, so the only
 * thing a restart costs is the wait: on boot the queue is read back and any
 * unfinished batch continues, and each item is marked the moment its message
 * is away, so nobody is emailed twice.
 *
 * One timer per process. Two would each keep their own pace, and the gap
 * between emails — the only thing this exists to control — would become
 * whatever the two happened to add up to.
 */

let timer: NodeJS.Timeout | null = null;
let running = false;

/** Where links in the emails should point. */
function baseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function sendOne(batch: BatchState, id: string) {
  return batch.action === "assessment"
    ? sendAssessmentEmail(id, baseUrl())
    : sendReminderEmail(id, baseUrl());
}

function clear() {
  if (timer) clearTimeout(timer);
  timer = null;
}

/**
 * Do the next item, then arm the timer for the one after it.
 *
 * Reads the batch fresh every time rather than holding it in a closure: the
 * recruiter may have paused or cancelled while this was waiting, and a worker
 * acting on a snapshot would carry on sending after being told to stop.
 */
async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const batch = await readBatch();
    if (!batch || batch.status !== "running") {
      clear();
      return;
    }

    const next = batch.items.find((i) => i.state === "pending");
    if (!next) {
      clear();
      return;
    }

    let outcome: { ok: true } | { ok: false; reason: string };
    try {
      outcome = await sendOne(batch, next.id);
    } catch (err) {
      // A thrown error is still an answer about this candidate; the batch must
      // carry on to the rest rather than stopping on one bad address.
      outcome = { ok: false, reason: err instanceof Error ? err.message.slice(0, 120) : "failed" };
    }

    const after = await markItem(
      batch.id,
      next.id,
      outcome.ok ? "sent" : "failed",
      outcome.ok ? undefined : outcome.reason,
    );

    if (!after || after.status !== "running") {
      clear();
      return;
    }
    if (!after.items.some((i) => i.state === "pending")) {
      clear();
      // eslint-disable-next-line no-console
      console.log(`[bulk] batch ${after.id} finished`);
      return;
    }

    const gap = nextGapMs(after.paceSeconds);
    await setNextAt(after.id, new Date(Date.now() + gap).toISOString());
    clear();
    timer = setTimeout(() => void tick(), gap);
  } finally {
    running = false;
  }
}

/**
 * Make sure the timer is armed for whatever is on disk.
 *
 * Safe to call repeatedly — starting a batch, resuming one, or booting the
 * server all end here, and the first thing it does is throw away any timer
 * already waiting.
 */
export async function ensureWorker(): Promise<void> {
  const batch = await readBatch();
  clear();
  if (!batch || batch.status !== "running") return;
  if (!batch.items.some((i) => i.state === "pending")) return;

  // A resumed batch waits out whatever is left of its gap rather than firing
  // immediately: a restart in the middle of an hour-long run should not
  // collapse the pacing into a burst.
  const due = batch.nextAt ? new Date(batch.nextAt).getTime() - Date.now() : 0;
  const wait = Math.max(0, Math.min(due, batch.paceSeconds * 1000));
  timer = setTimeout(() => void tick(), wait);
  if (wait > 0) {
    // eslint-disable-next-line no-console
    console.log(`[bulk] batch ${batch.id} resuming in ${Math.round(wait / 1000)}s`);
  }
}

export function stopWorker(): void {
  clear();
}
