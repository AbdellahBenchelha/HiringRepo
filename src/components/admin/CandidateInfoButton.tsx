"use client";

import { Icon } from "@/components/Icon";

/**
 * The button that opens a row's profile.
 *
 * It used to own the dialog as well, one instance per row. That worked until
 * the dialog needed Previous and Next: a row's own island can only ever see
 * that row, so there was no next candidate to step to. The dialog now belongs
 * to the table, which knows the whole filtered list, and this is just the
 * button that asks for it.
 */
export function CandidateInfoButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-2.5 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-navy-50"
    >
      <Icon name="users" className="h-3.5 w-3.5" />
      View info
    </button>
  );
}
