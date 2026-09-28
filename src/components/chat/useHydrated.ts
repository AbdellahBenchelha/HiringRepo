"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False on the server and during hydration, true afterwards.
 *
 * For what can only be right in the browser — a time in the reader's own time
 * zone, "waiting 12 minutes". Rendered on the server they come out in the
 * server's zone and at the server's moment, the browser renders something
 * else, and React reports the page as not matching what it was sent.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
