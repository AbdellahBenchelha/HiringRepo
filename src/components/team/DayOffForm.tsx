"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { problemOf, teamPost } from "@/lib/teamClient";

/** Ask for one of your work days off. */
export function DayOffForm({ min }: { min: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const res = await teamPost("/api/team/work", { action: "dayoff", date, reason });
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      setDate("");
      setReason("");
      setDone(true);
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end" noValidate>
      <div>
        <label htmlFor="dayoff-date" className="label">
          Day
        </label>
        <input id="dayoff-date" type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="dayoff-reason" className="label">
          Reason (optional)
        </label>
        <input
          id="dayoff-reason"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          placeholder="e.g. medical appointment"
        />
      </div>
      <button type="submit" disabled={busy || !date} className="btn-primary">
        {busy ? "Sending…" : "Ask for the day off"}
      </button>
      {error ? (
        <p role="alert" className="field-error sm:col-span-3">
          {error}
        </p>
      ) : null}
      {done ? <p className="text-sm text-green-700 sm:col-span-3">Sent. You will get an email with the answer.</p> : null}
    </form>
  );
}
