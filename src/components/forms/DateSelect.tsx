"use client";

import { useMemo, useState } from "react";
import { Select } from "./fields";

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

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        id={`${id}-day`}
        aria-label="Day"
        value={day}
        error={error}
        onChange={(e) => {
          setDay(e.target.value);
          emit({ day: e.target.value, month, year });
        }}
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>{Number(d)}</option>
        ))}
      </Select>

      <Select
        id={`${id}-month`}
        aria-label="Month"
        value={month}
        error={error}
        onChange={(e) => {
          setMonth(e.target.value);
          emit({ day, month: e.target.value, year });
        }}
      >
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>
        ))}
      </Select>

      <Select
        id={`${id}-year`}
        aria-label="Year"
        value={year}
        error={error}
        onChange={(e) => {
          setYear(e.target.value);
          emit({ day, month, year: e.target.value });
        }}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
    </div>
  );
}
