"use client";

import type { useRouter } from "next/navigation";

/**
 * Re-render the page from the server after something was saved.
 *
 * Twice: a refresh asked for in the first moments after a page has opened,
 * while the router is still settling, can be dropped — the save is made, the
 * screen does not show it. The second, a second later, costs one small
 * request and makes sure what is on screen is what was saved.
 */
export function refreshAfterSave(router: ReturnType<typeof useRouter>): void {
  router.refresh();
  setTimeout(() => router.refresh(), 1000);
}
