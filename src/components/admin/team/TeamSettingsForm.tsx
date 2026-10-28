"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminPost } from "@/lib/adminClient";
import type { PaydaySchedule } from "@/lib/teamShared";
import { refreshAfterSave } from "@/lib/refreshAfterSave";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Payday, team rules and mailbox instructions. */
export function TeamSettingsForm({
  initial,
}: {
  initial: { payday: PaydaySchedule; rulesText: string; mailboxUrl: string; mailboxHelp: string };
}) {
  const router = useRouter();
  const [kind, setKind] = useState(initial.payday.kind);
  const [weekday, setWeekday] = useState(initial.payday.kind === "weekly" ? initial.payday.weekday : 5);
  const [anchor, setAnchor] = useState(initial.payday.kind === "biweekly" ? initial.payday.anchor : new Date().toISOString().slice(0, 10));
  const [day, setDay] = useState(initial.payday.kind === "monthly" ? initial.payday.day : 5);
  const [rulesText, setRules] = useState(initial.rulesText);
  const [mailboxUrl, setMailboxUrl] = useState(initial.mailboxUrl);
  const [mailboxHelp, setMailboxHelp] = useState(initial.mailboxHelp);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payday: PaydaySchedule =
      kind === "weekly" ? { kind, weekday } : kind === "biweekly" ? { kind, anchor } : { kind: "monthly", day };
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminPost("/api/admin/team/settings", { action: "settings", payday, rulesText, mailboxUrl, mailboxHelp });
      const d = (await res.json().catch(() => ({}))) as { problems?: string[] };
      setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: d.problems?.[0] ?? "Could not save." });
      if (res.ok) refreshAfterSave(router);
    } catch {
      setMsg({ ok: false, text: "No connection." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" data-team-settings>
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-bold text-navy-900">Payday</legend>
        <select value={kind} onChange={(e) => setKind(e.target.value as PaydaySchedule["kind"])} className="select py-2 text-sm" aria-label="How often">
          <option value="weekly">Every week</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="monthly">Every month</option>
        </select>
        {kind === "weekly" ? (
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="select py-2 text-sm" aria-label="Weekday">
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        ) : kind === "biweekly" ? (
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} className="input py-2 text-sm" aria-label="One of the paydays" />
        ) : (
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="select py-2 text-sm" aria-label="Day of the month">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Day {d}
              </option>
            ))}
          </select>
        )}
        <p className="self-center text-xs text-navy-400">Members see “Next payday” on their dashboard.</p>
      </fieldset>

      <div>
        <label htmlFor="ts-mailbox-url" className="mb-1 block text-sm font-bold text-navy-900">
          Mailbox sign-in link
        </label>
        <input
          id="ts-mailbox-url"
          value={mailboxUrl}
          onChange={(e) => setMailboxUrl(e.target.value)}
          placeholder="e.g. https://mail.zoho.eu"
          className="input py-2 text-sm"
        />
        <label htmlFor="ts-mailbox-help" className="mb-1 mt-3 block text-xs font-semibold text-navy-600">
          How to open the mailbox (shown on their Profile)
        </label>
        <textarea
          id="ts-mailbox-help"
          value={mailboxHelp}
          onChange={(e) => setMailboxHelp(e.target.value)}
          placeholder="e.g. Sign in with your @workroute.team address and the temporary password we sent you, then choose your own."
          className="textarea text-sm"
        />
      </div>

      <div>
        <label htmlFor="ts-rules" className="mb-1 block text-sm font-bold text-navy-900">
          Team rules
        </label>
        <p className="mb-2 text-xs text-navy-400">Members read these and confirm, as a getting-started step. Leave empty to skip the step.</p>
        <textarea id="ts-rules" value={rulesText} onChange={(e) => setRules(e.target.value)} className="textarea min-h-[14rem] text-sm" />
      </div>

      {msg ? <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
