"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminPost } from "@/lib/adminClient";
import { MAX_PHONE_MESSAGE } from "@/lib/teamShared";

/**
 * Type in a message that arrived on a member's work number. It lands in
 * their Phone inbox at once, and they get an email that something came.
 */
export function PhoneSendPanel({ members }: { members: { id: string; fullName: string; phoneNumber: string }[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [sender, setSender] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const chosen = members.find((m) => m.id === memberId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminPost("/api/admin/team/phone", { memberId, sender, body });
      const d = (await res.json().catch(() => ({}))) as { problems?: string[] };
      if (!res.ok) {
        setMsg({ ok: false, text: d.problems?.join(" ") ?? "Could not send." });
        return;
      }
      setBody("");
      setMsg({ ok: true, text: `Sent to ${chosen?.fullName}.` });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "No connection." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-phone-send>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ps-member" className="mb-1 block text-xs font-semibold text-navy-600">
            Member (number)
          </label>
          <select id="ps-member" value={memberId} onChange={(e) => setMemberId(e.target.value)} className="select py-2 text-sm">
            <option value="">Choose…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} — {m.phoneNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ps-sender" className="mb-1 block text-xs font-semibold text-navy-600">
            From (who sent it)
          </label>
          <input id="ps-sender" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="e.g. Amazon, or +1 555 0100" className="input py-2 text-sm" />
        </div>
      </div>
      <div>
        <label htmlFor="ps-body" className="mb-1 block text-xs font-semibold text-navy-600">
          Message
        </label>
        <textarea id="ps-body" value={body} maxLength={MAX_PHONE_MESSAGE} onChange={(e) => setBody(e.target.value)} className="textarea text-sm" />
      </div>
      {msg ? <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p> : null}
      <button type="submit" disabled={busy || !memberId} className="btn-primary">
        {busy ? "Sending…" : "Send to their inbox"}
      </button>
    </form>
  );
}
