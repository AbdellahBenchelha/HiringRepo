"use client";

import { useMemo, useState } from "react";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Stepping through candidates inside the open profile dialog.
 *
 * Reviewing a shortlist means opening the same dialog twenty times, and closing
 * it between each one is the whole cost. This gives every table Previous/Next
 * without each of them re-deriving the two things that are easy to get wrong.
 *
 * The first is that the dialog holds an **id**, not a copy of the candidate.
 * A copy stops updating the moment anything else on the row changes it — which
 * is exactly how the offer form used to stay hidden after the voice assessment
 * was marked as passed. Everything is looked up fresh from the live list.
 *
 * The second is which list you are walking. Position and stepping use the
 * filtered, sorted list — "4 of 31" has to mean the 31 you filtered down to,
 * and Next has to follow the order on screen. The lookup, though, uses the
 * unfiltered list: changing someone's status while a status filter is active
 * drops them out of the results, and the dialog you are reading must not
 * vanish underneath you because of an edit you just made in it.
 */
export function useProfileNav(
  /** Every candidate the table knows about, with edits applied. */
  all: readonly CandidateView[],
  /** The filtered and sorted list, in the order shown. */
  ordered: readonly CandidateView[],
  pageSize: number,
  setPage: (page: number) => void,
) {
  const [openId, setOpenId] = useState<string | null>(null);

  const profile = useMemo(
    () => (openId ? (all.find((c) => c.id === openId) ?? null) : null),
    [all, openId],
  );

  // -1 once they no longer match the filters, which disables stepping rather
  // than guessing at a position they no longer have.
  const index = useMemo(
    () => (openId ? ordered.findIndex((c) => c.id === openId) : -1),
    [ordered, openId],
  );

  function step(delta: number) {
    const next = ordered[index + delta];
    if (!next) return;
    setOpenId(next.id);
    // Move the table to the page the new candidate is on, so closing the
    // dialog leaves you looking at the row you just read rather than back
    // where you started.
    setPage(Math.floor((index + delta) / pageSize) + 1);
  }

  return {
    profile,
    open: (c: CandidateView) => setOpenId(c.id),
    close: () => setOpenId(null),
    /** Undefined when there is nothing to step through, which hides the controls. */
    nav:
      index >= 0 && ordered.length > 1
        ? {
            index,
            total: ordered.length,
            onPrev: () => step(-1),
            onNext: () => step(1),
          }
        : undefined,
  };
}
