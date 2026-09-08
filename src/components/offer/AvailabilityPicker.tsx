"use client";

import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/forms/fields";
import {
  COMPANY_TIME_LABEL,
  COMPANY_TIME_ZONE,
  DAY_KEYS,
  DAY_LABELS,
  MAX_HOURS_PER_DAY,
  REQUIRED_DAYS,
  START_TIMES,
  WINDOW_HOURS,
  crossesMidnight,
  detectTimeZone,
  endTimeFor,
  knownTimeZones,
  offsetLabel,
  timeIn,
  type Availability,
  type DayKey,
} from "@/lib/availability";

/**
 * When the candidate will be available.
 *
 * Two choices, both shaped so the rule cannot be broken rather than merely
 * stated: the start of an eight-hour window (the end follows from it, so no
 * one can offer six hours or twelve), and exactly five days out of seven.
 *
 * The gap between the eight-hour window and the five hours of work inside it
 * is the part people misread, so it is answered where the choice is made and
 * not in a footnote further down the page: the window is when we may call on
 * you, five hours is what you will actually work.
 *
 * The chosen window is echoed back in words as it is built — "You will be
 * available 08:00 – 16:00" — because a schedule agreed by clicking two
 * controls should be readable as a sentence before it is agreed to.
 */

export interface AvailabilityValue {
  startTime: string;
  timeZone: string;
  days: DayKey[];
}

export function toAvailability(v: AvailabilityValue): Availability {
  return { ...v, endTime: endTimeFor(v.startTime) };
}

export function AvailabilityPicker({
  value,
  onChange,
}: {
  value: AvailabilityValue;
  onChange: (next: AvailabilityValue) => void;
}) {
  // Filled in after mount: the server has no timezone to detect, and guessing
  // one during the render would make the markup disagree with itself.
  const [zones, setZones] = useState<string[]>([]);
  useEffect(() => {
    setZones(knownTimeZones());
    if (!value.timeZone) onChange({ ...value, timeZone: detectTimeZone() });
    // Once, on mount. Re-running on every keystroke elsewhere would fight the
    // candidate for control of a select they have already used.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endTime = endTimeFor(value.startTime);
  const overnight = crossesMidnight(value.startTime);
  const chosen = value.days.length;

  // What the same window reads as in the office. Only worth showing when the
  // two differ — telling somebody in London that their 08:00 is 08:00 in
  // London is noise.
  const inCompanyTime = useMemo(() => {
    if (!value.timeZone || value.timeZone === COMPANY_TIME_ZONE) return null;
    const start = timeIn(value.startTime, value.timeZone, COMPANY_TIME_ZONE);
    if (start === value.startTime) return null;
    return `${start} – ${timeIn(endTime, value.timeZone, COMPANY_TIME_ZONE)}`;
  }, [value.startTime, value.timeZone, endTime]);

  function toggleDay(day: DayKey) {
    const has = value.days.includes(day);
    if (!has && chosen >= REQUIRED_DAYS) return;
    onChange({
      ...value,
      days: has ? value.days.filter((d) => d !== day) : DAY_KEYS.filter((d) => d === day || value.days.includes(d)),
    });
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-navy-900">When will you be available?</h2>
      <p className="mt-1 text-sm text-navy-500">
        Choose the {WINDOW_HOURS}-hour window you can be reached in, and the {REQUIRED_DAYS} days of
        the week you will work. This becomes the schedule in your agreement.
      </p>

      {/* The sentence people actually read. Assembled from the two controls
          below so it is never out of step with them. */}
      <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm font-bold text-navy-900">
          You will be available {value.startTime} – {endTime}
          {overnight ? " (ending the next day)" : ""}
          {chosen === REQUIRED_DAYS ? (
            <>
              {" "}
              on {value.days.map((d) => DAY_LABELS[d]).join(", ")}
            </>
          ) : null}
          .
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-navy-600">
          The window is {WINDOW_HOURS} hours. You will work at most{" "}
          <strong className="text-navy-900">{MAX_HOURS_PER_DAY} hours a day</strong> inside it — the
          rest is room for the work to fall where it falls.
          {inCompanyTime ? ` That is ${inCompanyTime} ${COMPANY_TIME_LABEL}.` : ""}
        </p>
      </div>

      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field
          label="Available from"
          htmlFor="availability-start"
          required
          hint={`The window always runs for ${WINDOW_HOURS} hours from here.`}
        >
          <select
            id="availability-start"
            className="select"
            value={value.startTime}
            onChange={(e) => onChange({ ...value, startTime: e.target.value })}
          >
            {START_TIMES.map((t) => (
              <option key={t} value={t}>
                {t} – {endTimeFor(t)}
                {crossesMidnight(t) ? " (next day)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Your timezone"
          htmlFor="availability-tz"
          required
          hint={
            value.timeZone
              ? `Detected from your device — ${offsetLabel(value.timeZone)}. Change it if it is wrong.`
              : "So we know which 08:00 you mean."
          }
        >
          <select
            id="availability-tz"
            className="select"
            value={value.timeZone}
            onChange={(e) => onChange({ ...value, timeZone: e.target.value })}
          >
            {/* The detected zone is kept as an option even before the full
                list arrives, so the field is never briefly empty. */}
            {value.timeZone && !zones.includes(value.timeZone) ? (
              <option value={value.timeZone}>{value.timeZone.replace(/_/g, " ")}</option>
            ) : null}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="label mb-0">
            Days you will work<span className="text-red-600"> *</span>
          </p>
          <p
            className={`text-xs font-bold ${
              chosen === REQUIRED_DAYS ? "text-green-700" : "text-navy-500"
            }`}
          >
            {chosen} of {REQUIRED_DAYS} chosen
          </p>
        </div>
        <p className="mt-1 mb-2.5 text-xs text-navy-500">
          Any {REQUIRED_DAYS} days, including weekends if they suit you better.
        </p>

        {/* Buttons rather than tick boxes: seven of them have to fit on a
            phone, and the count is the thing being controlled. Once five are
            chosen the rest go quiet instead of disappearing — a day that
            vanishes looks broken, one that is clearly unavailable explains
            itself. */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAY_KEYS.map((day) => {
            const on = value.days.includes(day);
            const full = !on && chosen >= REQUIRED_DAYS;
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={on}
                disabled={full}
                title={full ? `Unselect a day first — ${REQUIRED_DAYS} is the maximum` : DAY_LABELS[day]}
                className={`rounded-xl border-2 px-2 py-3 text-sm font-bold transition ${
                  on
                    ? "border-brand-500 bg-brand-50 text-navy-900"
                    : full
                      ? "cursor-not-allowed border-navy-100 text-navy-300"
                      : "border-navy-200 text-navy-700 hover:border-navy-300"
                }`}
              >
                {day}
                <span className="sr-only"> {DAY_LABELS[day]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
