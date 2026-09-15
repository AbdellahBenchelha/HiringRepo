"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Fetch the table's rows again without reloading the page.
 *
 * These tables are read once when the page renders and then filtered in the
 * browser, which is what makes them quick — but it also means somebody who
 * leaves a tab open all morning is looking at this morning's list. Reloading
 * fixes that and throws away everything they had set up: the filters, the
 * hidden countries, the page they were on, the rows they had ticked.
 *
 * So this asks the server for the same page again and lets React swap the new
 * rows into the tree that is already there. Client state survives untouched —
 * that is the whole point — and there is no navigation, no scroll jump and no
 * white flash.
 *
 * Edits made since the page loaded are cleared when the new rows land, through
 * `onRefreshed`. Those patches exist to keep a row honest until the server
 * catches up; once it has caught up they are the stale copy, and a patch
 * sitting on top of fresher data is exactly the disagreement this button is
 * pressed to resolve.
 */
export function RefreshButton({
  onRefreshed,
  className = "",
}: {
  /** Called once the new rows have arrived. Drop any local edits here. */
  onRefreshed?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [at, setAt] = useState<Date | null>(null);

  // Held in a ref so an inline arrow from the caller does not re-arm the
  // effect on every render.
  const done = useRef(onRefreshed);
  done.current = onRefreshed;
  const was = useRef(false);

  useEffect(() => {
    if (was.current && !pending) {
      setAt(new Date());
      done.current?.();
    }
    was.current = pending;
  }, [pending]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        title="Fetch the latest rows without losing your filters"
        className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-3.5 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-60"
      >
        <Icon name="rotate" className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Refreshing…" : "Refresh"}
      </button>
      {at && !pending ? (
        <span className="text-xs text-navy-400">
          Updated{" "}
          {at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : null}
    </div>
  );
}
