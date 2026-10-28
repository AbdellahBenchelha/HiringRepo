"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminPost } from "@/lib/adminClient";
import { WORK_STATUSES, WORK_STATUS_LABEL, formatDay, formatHours, formatUsd, isPaidStatus, round2, type WorkStatus } from "@/lib/teamShared";
import { refreshAfterSave } from "@/lib/refreshAfterSave";

export interface EntryRowData {
  id: string;
  date: string;
  hours: number;
  rate: number;
  status: WorkStatus;
  source: "auto" | "admin";
  note?: string;
  editedBy?: string;
}

/** One work day in the Admin Panel: read, or change its hours, rate, status and note. */
export function EntryRow({ e }: { e: EntryRowData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(String(e.hours));
  const [rate, setRate] = useState(String(e.rate));
  const [status, setStatus] = useState<WorkStatus>(e.status);
  const [note, setNote] = useState(e.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await adminPost("/api/admin/team/work", body);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { problems?: string[] };
        setError(d.problems?.[0] ?? "Could not save.");
        return false;
      }
      refreshAfterSave(router);
      return true;
    } catch {
      setError("No connection.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const amount = isPaidStatus(e.status) ? round2(e.hours * e.rate) : 0;

  if (!editing) {
    return (
      <tr className="border-t border-navy-100" data-entry={e.date}>
        <td className="px-3 py-2">{formatDay(e.date)}</td>
        <td className="px-3 py-2">
          <span className="font-semibold text-navy-800">{WORK_STATUS_LABEL[e.status]}</span>
          <span className="ml-2 text-xs text-navy-400">{e.source === "auto" ? "automatic" : "added by hand"}</span>
          {e.note ? <p className="text-xs text-navy-500">{e.note}</p> : null}
        </td>
        <td className="px-3 py-2 text-right">{formatHours(e.hours)}</td>
        <td className="px-3 py-2 text-right">{formatUsd(e.rate)}</td>
        <td className="px-3 py-2 text-right font-semibold">{formatUsd(amount)}</td>
        <td className="px-3 py-2 text-right">
          <span className="inline-flex gap-2">
            {e.status === "no_checkin" ? (
              <button type="button" disabled={busy} onClick={() => post({ action: "approve_entry", id: e.id })} className="text-xs font-semibold text-green-700 hover:underline">
                Pay this day
              </button>
            ) : null}
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-navy-600 hover:underline">
              Edit
            </button>
            {e.source === "admin" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => window.confirm("Delete this entry?") && post({ action: "delete_entry", id: e.id })}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Delete
              </button>
            ) : null}
          </span>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-navy-100 bg-brand-50/40">
      <td className="px-3 py-2">{formatDay(e.date)}</td>
      <td className="px-3 py-2">
        <select value={status} onChange={(x) => setStatus(x.target.value as WorkStatus)} className="select py-1 text-xs" aria-label="Status">
          {WORK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WORK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input value={note} onChange={(x) => setNote(x.target.value)} placeholder="Note (shown to the member)" className="input mt-1 py-1 text-xs" />
      </td>
      <td className="px-3 py-2 text-right">
        <input value={hours} onChange={(x) => setHours(x.target.value)} type="number" step="0.25" min="0" max="12" className="input w-20 py-1 text-right text-xs" aria-label="Hours" />
      </td>
      <td className="px-3 py-2 text-right">
        <input value={rate} onChange={(x) => setRate(x.target.value)} type="number" step="0.01" min="0" className="input w-24 py-1 text-right text-xs" aria-label="Rate" />
      </td>
      <td />
      <td className="px-3 py-2 text-right">
        <span className="inline-flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (await post({ action: "edit_entry", id: e.id, hours: Number(hours), rate: Number(rate), status, note })) setEditing(false);
            }}
            className="text-xs font-semibold text-green-700 hover:underline"
          >
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-navy-500 hover:underline">
            Cancel
          </button>
        </span>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </td>
    </tr>
  );
}
