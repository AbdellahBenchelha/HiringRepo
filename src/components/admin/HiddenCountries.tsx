"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Taking whole countries off a table.
 *
 * Unlike the other filters this one is a standing decision rather than a
 * question about the list in front of you: somebody who does not recruit from
 * a country does not want to hide it again after every reload. It is kept in
 * the browser rather than on the record — it is one recruiter's view of a
 * table, not a fact about the candidates, and nobody is rejected by it.
 *
 * Shared by the Candidates and Interviews tabs, which keep their own lists
 * under their own keys. The same countries are rarely wanted on both: one tab
 * is about who has applied, the other about who is being taken through the
 * steps after an interview.
 *
 * Three parts, because they sit in three places — the state, the picker that
 * goes among the filters, and the chips that have to stay visible underneath
 * them. A filter that quietly removes people is the one that must say so, or
 * the tab looks empty for no reason a week later.
 */

export function useHiddenCountries(storageKey: string) {
  const [hidden, setHidden] = useState<string[]>([]);

  /**
   * Restored on mount rather than in the initial state, because the server
   * rendered this table with no browser to read: reading storage during the
   * first render would make the markup disagree with itself.
   */
  const restored = useRef(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(saved)) {
        setHidden(saved.filter((v): v is string => typeof v === "string"));
      }
    } catch {
      /* A damaged value is no reason to show a broken table. */
    }
    restored.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(hidden));
    } catch {
      /* Private browsing, a full quota — the filter still works for this visit. */
    }
  }, [hidden, storageKey]);

  /**
   * Memoised as a whole, and every function inside it kept stable.
   *
   * Not a tidiness point: the tables list this in the dependencies of the
   * effect that sends you back to page one whenever the list changes. A fresh
   * object on every render is a changed dependency on every render, so that
   * effect fires constantly and page two snaps back to page one the instant
   * you reach it.
   */
  const hide = useCallback(
    (name: string) =>
      setHidden((prev) => (!name || prev.includes(name) ? prev : [...prev, name].sort())),
    [],
  );
  const show = useCallback((name: string) => setHidden((prev) => prev.filter((x) => x !== name)), []);
  const showAll = useCallback(() => setHidden([]), []);

  return useMemo(() => {
    const set = new Set(hidden);
    return {
      hidden,
      isHidden: (country?: string) => !!country && set.has(country),
      hide,
      show,
      showAll,
    };
  }, [hidden, hide, show, showAll]);
}

/**
 * The picker, among the other filters.
 *
 * Choosing here takes a country out of the table rather than narrowing to it.
 * It stays a picker rather than a list of tick boxes because most of the time
 * nothing is hidden, and an empty list of ticks would take the same room as
 * all the rest.
 */
export function HideCountryPicker({
  countries,
  hidden,
  onHide,
}: {
  countries: string[];
  hidden: string[];
  onHide: (name: string) => void;
}) {
  const available = countries.filter((c) => !hidden.includes(c));
  return (
    <label className="block">
      <span className="label">Hide countries</span>
      <select
        id="hide-country"
        className="select"
        value=""
        onChange={(e) => onHide(e.target.value)}
      >
        <option value="">
          {hidden.length ? `Hiding ${hidden.length} — hide another…` : "Choose a country to hide…"}
        </option>
        {available.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

/** What is hidden and how many rows it is costing. Renders nothing when empty. */
export function HiddenCountryChips({
  hidden,
  count,
  noun,
  onShow,
  onShowAll,
}: {
  hidden: string[];
  /** Rows this is keeping off the table, counted by the caller. */
  count: number;
  /** "candidate", "interview" — whatever the rows are. */
  noun: string;
  onShow: (name: string) => void;
  onShowAll: () => void;
}) {
  if (!hidden.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3">
      <span className="text-xs font-bold uppercase tracking-wide text-navy-500">Hidden</span>
      {hidden.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onShow(c)}
          title={`Show ${c} again`}
          className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          {c}
          <span aria-hidden className="text-navy-400">
            &times;
          </span>
          <span className="sr-only">Show again</span>
        </button>
      ))}
      <span className="text-xs text-navy-500">
        {count} {noun}
        {count === 1 ? "" : "s"} kept off this table
      </span>
      <button
        type="button"
        onClick={onShowAll}
        className="rounded-full px-3 py-1 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
      >
        Show all countries
      </button>
    </div>
  );
}
