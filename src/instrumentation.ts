/**
 * Runs once when the server starts.
 *
 * A paced batch of fifty emails at a minute apart is the best part of an hour,
 * and a deploy inside that window would otherwise leave half a batch on disk
 * that nothing was going to finish. Anything still marked running is picked up
 * here; each item was marked the moment its message was away, so a resumed
 * batch continues rather than starting again, and nobody is emailed twice.
 */
export async function register() {
  // The edge runtime has no filesystem and no timers worth the name; this only
  // belongs in the node process that actually sends.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureWorker } = await import("@/lib/bulkEmailWorker");
    await ensureWorker();
  } catch (err) {
    // Never stop the server booting over a queue: everything else on the site
    // has to keep working whether or not a batch can be resumed.
    // eslint-disable-next-line no-console
    console.warn("[bulk] could not resume a batch on start:", err);
  }
}
