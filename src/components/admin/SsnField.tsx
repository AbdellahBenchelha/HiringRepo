"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * A candidate's Social Security Number, hidden until asked for.
 *
 * Two reasons it does not simply print. The number is not in the profile's
 * data at all — it is fetched from its own route when Show is pressed, so it
 * never travels with a table of forty people. And even once fetched it is
 * hidden again by the next click, because an admin panel is read on shared
 * screens and in open-plan rooms, and an SSN sitting in a details grid is
 * there for as long as the tab is.
 *
 * Only rendered for somebody the question was asked of. For everybody else
 * there is no row: an empty "SSN —" against a candidate in Morocco is a field
 * that looks missing rather than inapplicable.
 */
export function SsnField({
  candidateId,
  hasSsn,
  asked,
}: {
  candidateId: string;
  /** Whether one is on file. The number itself is never passed in. */
  hasSsn: boolean;
  /**
   * Whether the question has been reached yet — it is asked when an offer is
   * accepted, not on the application.
   *
   * Without it, a US candidate who applied this morning would be shown as
   * having failed to provide something nobody has asked them for, which is
   * the sort of thing that gets chased.
   */
  asked: boolean;
}) {
  const [ssn, setSsn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!hasSsn) {
    return asked ? (
      <span className="text-amber-700">
        Not provided
        <span className="mt-0.5 block text-xs font-normal text-navy-400">
          Asked of US candidates when they accept their offer.
        </span>
      </span>
    ) : (
      <span className="text-navy-400">
        Not asked yet
        <span className="mt-0.5 block text-xs font-normal text-navy-400">
          US candidates are asked when they accept their offer.
        </span>
      </span>
    );
  }

  async function reveal() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}/ssn`);
      const data = (await res.json()) as { ok?: boolean; ssn?: string; error?: string };
      if (data.ok && data.ssn) setSsn(data.ssn);
      else setError(data.error === "no_ssn" ? "Not on file." : "Could not read it.");
    } catch {
      setError("Could not read it.");
    }
    setBusy(false);
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-mono tracking-wide">{ssn || "•••-••-••••"}</span>
      <button
        type="button"
        onClick={() => (ssn ? setSsn("") : void reveal())}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full border border-navy-200 px-2.5 py-0.5 text-[11px] font-bold text-navy-600 transition hover:bg-navy-50 disabled:opacity-50"
      >
        <Icon name={ssn ? "close" : "search"} className="h-3 w-3" />
        {busy ? "…" : ssn ? "Hide" : "Show"}
      </button>
      {error ? <span className="text-xs font-medium text-amber-700">{error}</span> : null}
    </span>
  );
}
