"use client";

import { useMemo, useState, type ReactNode } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DateSelectProps {
  /** Base id; the three selects become `${id}-day`, `${id}-month`, `${id}-year`. */
  id: string;
  /** Current value as "YYYY-MM-DD", or "" when incomplete. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Youngest / oldest ages to offer in the year list. */
  minAge?: number;
  maxAge?: number;
}

function parse(value: string): { year: string; month: string; day: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? { year: m[1], month: m[2], day: m[3] } : { year: "", month: "", day: "" };
}

/** A single captioned dropdown with a custom chevron. */
function Cell({
  id,
  label,
  value,
  error,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  error?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
        {label}
      </span>
      <div className="relative">
        <select
          id={id}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={`select appearance-none pr-9 ${value ? "" : "text-navy-400"} ${
            error ? "input-invalid" : ""
          }`}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-navy-400">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

/**
 * Date of birth picker rendered as three dropdowns (day, month, year).
 * Emits a "YYYY-MM-DD" string once all three are chosen, otherwise "".
 */
export function DateSelect({ id, value, onChange, error, minAge = 14, maxAge = 90 }: DateSelectProps) {
  const initial = parse(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const list: string[] = [];
    for (let y = now - minAge; y >= now - maxAge; y--) list.push(String(y));
    return list;
  }, [minAge, maxAge]);

  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")),
    [],
  );

  function emit(next: { day: string; month: string; year: string }) {
    onChange(next.day && next.month && next.year ? `${next.year}-${next.month}-${next.day}` : "");
  }

  const invalid = Boolean(error);

  return (
    <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-2.5">
      <Cell
        id={`${id}-day`}
        label="Day"
        value={day}
        error={invalid}
        onChange={(v) => {
          setDay(v);
          emit({ day: v, month, year });
        }}
      >
        <option value="">—</option>
        {days.map((d) => (
          <option key={d} value={d}>{Number(d)}</option>
        ))}
      </Cell>

      <Cell
        id={`${id}-month`}
        label="Month"
        value={month}
        error={invalid}
        onChange={(v) => {
          setMonth(v);
          emit({ day, month: v, year });
        }}
      >
        <option value="">—</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>
        ))}
      </Cell>

      <Cell
        id={`${id}-year`}
        label="Year"
        value={year}
        error={invalid}
        onChange={(v) => {
          setYear(v);
          emit({ day, month, year: v });
        }}
      >
        <option value="">—</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Cell>
    </div>
  );
}
