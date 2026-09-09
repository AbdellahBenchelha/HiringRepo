import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { isFinished, type BatchItem, type BatchState } from "@/lib/bulkEmail";

/**
 * SERVER-ONLY persistence for the current paced batch.
 *
 * On disk rather than in memory, because the whole point of the feature is
 * that the recruiter can walk away: a batch of fifty at a minute apart is the
 * best part of an hour, and a deploy or a restart in the middle of it must not
 * lose track of who has already been emailed. Each item is marked the moment
 * its message is away, so a resumed queue picks up exactly where it stopped
 * and nobody is written to twice.
 *
 * One batch at a time. Two running together would each keep their own pace and
 * the gap between emails — the only thing this feature exists to control —
 * would be whatever the two happened to add up to.
 *
 * Its own small file beside candidates.json, so a batch never rewrites the
 * file holding every application, and a batch stuck in a bad state is fixable
 * by deleting one file.
 */

const FILE = "bulk-email.json";

const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = () => path.join(dir(), FILE);

/** Writes are serialised, so a save cannot interleave with the worker's. */
let writeChain: Promise<unknown> = Promise.resolve();

export async function readBatch(): Promise<BatchState | null> {
  try {
    const raw = await fs.readFile(file(), "utf8");
    const data = JSON.parse(raw) as BatchState;
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

async function persist(batch: BatchState | null): Promise<void> {
  await fs.mkdir(dir(), { recursive: true });
  if (!batch) {
    await fs.rm(file(), { force: true });
    return;
  }
  await writeFileAtomic(file(), JSON.stringify(batch, null, 2));
}

/**
 * Read, change, write — with every other writer waiting.
 *
 * The worker and the admin panel both write here: one marking an item sent,
 * the other pausing or cancelling. Without this a pause could be overwritten
 * by a send that was already in flight, and the batch would carry on after
 * being told to stop.
 */
export function withBatch<T>(
  fn: (batch: BatchState | null) => { batch: BatchState | null; result: T },
): Promise<T> {
  const run = writeChain.then(async () => {
    const current = await readBatch();
    const { batch, result } = fn(current);
    await persist(batch);
    return result;
  });
  writeChain = run.catch(() => {});
  return run;
}

/** Start a batch, unless one is already running. */
export type StartResult =
  | { ok: true; batch: BatchState }
  /** Another batch is still going; two at once would each keep their own pace. */
  | { ok: false; error: string; batch?: BatchState };

export function startBatch(batch: BatchState): Promise<StartResult> {
  return withBatch<StartResult>((current) => {
    if (current && !isFinished(current)) {
      return { batch: current, result: { ok: false, error: "busy", batch: current } };
    }
    return { batch, result: { ok: true, batch } };
  });
}

/** Record what happened to one candidate, and finish the batch if that was the last. */
export function markItem(
  batchId: string,
  id: string,
  state: BatchItem["state"],
  reason?: string,
): Promise<BatchState | null> {
  return withBatch((current) => {
    if (!current || current.id !== batchId) return { batch: current, result: current };
    const items = current.items.map((item) =>
      item.id === id ? { ...item, state, reason, at: new Date().toISOString() } : item,
    );
    const done = items.every((i) => i.state !== "pending");
    const next: BatchState = {
      ...current,
      items,
      nextAt: undefined,
      status: done && current.status === "running" ? "done" : current.status,
      finishedAt: done ? new Date().toISOString() : current.finishedAt,
    };
    return { batch: next, result: next };
  });
}

/** Tell the panel when the next one is due, so it can count down honestly. */
export function setNextAt(batchId: string, nextAt: string | undefined): Promise<BatchState | null> {
  return withBatch((current) => {
    if (!current || current.id !== batchId) return { batch: current, result: current };
    const next = { ...current, nextAt };
    return { batch: next, result: next };
  });
}

export function setStatus(status: BatchState["status"]): Promise<BatchState | null> {
  return withBatch((current) => {
    if (!current) return { batch: current, result: null };
    const next: BatchState = {
      ...current,
      status,
      nextAt: status === "running" ? current.nextAt : undefined,
      finishedAt: status === "cancelled" ? new Date().toISOString() : current.finishedAt,
    };
    return { batch: next, result: next };
  });
}

/** Throw the record away. Only offered once a batch has finished. */
export function clearBatch(): Promise<boolean> {
  return withBatch((current) => {
    if (current && !isFinished(current)) return { batch: current, result: false };
    return { batch: null, result: true };
  });
}
