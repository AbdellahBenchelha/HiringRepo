"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { countries } from "@/config/countries";

/**
 * Accessible searchable country picker (combobox).
 * Type to filter the full country list; pick with mouse or keyboard.
 */
export function CountrySelect({
  id,
  value,
  onChange,
  error,
  placeholder = "Search and select a country",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    if (!dirty) return countries;
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.toLowerCase().startsWith(q));
  }, [query, dirty]);

  // Close when clicking/tapping outside.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, listId]);

  function openList() {
    setOpen(true);
    setDirty(false);
    setQuery(value);
    const idx = value ? countries.indexOf(value) : 0;
    setActiveIndex(idx >= 0 ? idx : 0);
  }

  function commit(country: string) {
    onChange(country);
    setOpen(false);
    setDirty(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) return openList();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) return openList();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (open && filtered[activeIndex]) {
          e.preventDefault();
          commit(filtered[activeIndex]);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  const display = open ? query : value;

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        className={`input pr-10 ${error ? "input-invalid" : ""}`}
        onFocus={openList}
        onChange={(e) => {
          setQuery(e.target.value);
          setDirty(true);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={onKeyDown}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 transition-transform ${
          open ? "rotate-180" : ""
        }`}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-navy-200 bg-white py-1 shadow-card"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-navy-500">No countries found</li>
          ) : (
            filtered.map((c, i) => {
              const selected = c === value;
              const active = i === activeIndex;
              return (
                <li
                  key={c}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(i)}
                  // onMouseDown fires before the input blur, so the value commits reliably.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(c);
                  }}
                  className={`flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm ${
                    active ? "bg-brand-50 text-brand-800" : "text-navy-700"
                  }`}
                >
                  <span>{c}</span>
                  {selected ? (
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-brand-600">
                      <path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
