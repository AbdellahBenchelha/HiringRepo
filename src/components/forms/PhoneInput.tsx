"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { phoneCountries, flagEmoji, type PhoneCountry } from "@/config/phoneCountries";

/** Default country shown before the applicant picks one (company HQ). */
const DEFAULT_ISO = "gb";

function defaultCountry(): PhoneCountry {
  return phoneCountries.find((c) => c.iso2 === DEFAULT_ISO) ?? phoneCountries[0];
}

/** Split an existing "+44 123…" value back into a country + national number. */
function parseValue(value: string): { country: PhoneCountry; national: string } {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) return { country: defaultCountry(), national: trimmed };
  const match = [...phoneCountries]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => trimmed.startsWith(c.dial));
  if (!match) return { country: defaultCountry(), national: trimmed.replace(/^\+/, "").trim() };
  return { country: match, national: trimmed.slice(match.dial.length).trim() };
}

/**
 * International phone field: a searchable country code selector (flag + dial
 * code) combined with a national-number input. Emits the full international
 * number ("+44 7700 900000") through onChange.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const initial = useMemo(() => parseValue(value), []); // parse once on mount
  const [country, setCountry] = useState<PhoneCountry>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  function emit(c: PhoneCountry, nat: string) {
    const n = nat.trim();
    onChange(n ? `${c.dial} ${n}` : "");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return phoneCountries;
    return phoneCountries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso2.includes(q),
    );
  }, [query]);

  // Close when clicking/tapping outside.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // When opening, reset the search and focus it.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, listId]);

  function selectCountry(c: PhoneCountry) {
    setCountry(c);
    setOpen(false);
    emit(c, national);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (filtered[activeIndex]) {
          e.preventDefault();
          selectCountry(filtered[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-stretch overflow-hidden rounded-xl border bg-white shadow-sm transition focus-within:ring-2 ${
          error
            ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-200"
            : "border-navy-200 focus-within:border-brand-500 focus-within:ring-brand-200"
        }`}
      >
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country calling code: ${country.name} ${country.dial}`}
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 border-r border-navy-200 px-3 text-navy-800 transition hover:bg-navy-50"
        >
          <span className="text-lg leading-none">{flagEmoji(country.iso2)}</span>
          <span className="text-sm font-medium">{country.dial}</span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-3.5 w-3.5 text-navy-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="7700 900000"
          value={national}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            setNational(e.target.value);
            emit(country, e.target.value);
          }}
          className="w-full bg-transparent px-3.5 py-2.5 text-navy-900 placeholder:text-navy-300 focus:outline-none"
        />
      </div>

      {open ? (
        <div className="absolute z-20 mt-1.5 w-full min-w-[18rem] overflow-hidden rounded-xl border border-navy-200 bg-white shadow-card">
          <div className="border-b border-navy-100 p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Search country or code"
              aria-label="Search country"
              className="input"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-2 text-sm text-navy-500">No countries found</li>
            ) : (
              filtered.map((c, i) => {
                const selected = c.iso2 === country.iso2;
                const active = i === activeIndex;
                return (
                  <li
                    key={c.iso2}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCountry(c);
                    }}
                    className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm ${
                      active ? "bg-brand-50" : ""
                    }`}
                  >
                    <span className="text-lg leading-none">{flagEmoji(c.iso2)}</span>
                    <span className={`flex-1 ${selected ? "font-medium text-brand-800" : "text-navy-700"}`}>
                      {c.name}
                    </span>
                    <span className="text-navy-400">{c.dial}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
