"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";

/**
 * Pick the countries a rule applies to.
 *
 * A search box over 197 countries rather than a long scroll, and the selected
 * ones lifted to the top as removable chips — the list you have chosen is the
 * thing you came to check, and it should not be scattered through an alphabet.
 *
 * Shared by every country-scoped setting, so they behave identically. Two
 * pickers that look the same but respond differently is worse than two that
 * look different.
 */
export function CountryListEditor({
  countries,
  initial,
  isDefault,
  updatedAt,
  endpoint,
  heading,
  description,
  chipsLabel,
  emptyText,
}: {
  countries: string[];
  initial: string[];
  isDefault: boolean;
  updatedAt?: string;
  /** Admin API path this saves to. */
  endpoint: string;
  heading: string;
  description: string;
  /** Heading above the chosen countries. */
  chipsLabel: string;
  /** Shown instead of chips when nothing is selected — say what that means. */
  emptyText: string;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [saved, setSaved] = useState<string[]>(initial);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify([...selected].sort()) !== JSON.stringify([...saved].sort()),
    [selected, saved],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return countries.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [countries, query]);

  function toggle(country: string) {
    setSelected((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country].sort(),
    );
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(endpoint, { countries: selected });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setSaved(selected);
        setJustSaved(true);
        window.setTimeout(() => setJustSaved(false), 4000);
      } else {
        setError(`Could not save (${data.error ?? "unknown"}).`);
      }
    } catch {
      setError("Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <section className="card p-5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900">{heading}</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-navy-500">{description}</p>
        </div>
        {dirty ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Unsaved changes
          </span>
        ) : justSaved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <Icon name="checkCircle" className="h-3.5 w-3.5" /> Saved
          </span>
        ) : isDefault ? (
          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-500">
            Default
          </span>
        ) : updatedAt ? (
          <span className="text-xs text-navy-400">
            Edited{" "}
            {new Date(updatedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : null}
      </header>

      {/* What is currently on the list. */}
      <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{chipsLabel}</p>
        {selected.length === 0 ? (
          <p className="mt-2 text-sm text-navy-500">{emptyText}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                title={`Remove ${c}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                {c}
                <Icon name="close" className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add one. */}
      <div className="mt-4">
        <label className="label" htmlFor="country-search">
          Add a country
        </label>
        <input
          id="country-search"
          className="input"
          placeholder="Start typing a country name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {matches.length ? (
          <ul className="mt-2 divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-200">
            {matches.map((c) => {
              const on = selected.includes(c);
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => {
                      toggle(c);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-navy-50"
                  >
                    <span className={on ? "font-semibold text-brand-800" : "text-navy-800"}>{c}</span>
                    <span className="text-xs text-navy-400">{on ? "Already added" : "Add"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="btn-primary !px-5 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save countries"}
        </button>
        {dirty ? (
          <button
            type="button"
            onClick={() => setSelected(saved)}
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy-600 transition hover:bg-navy-100"
          >
            Undo
          </button>
        ) : null}
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
