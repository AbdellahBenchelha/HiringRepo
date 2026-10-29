"use client";

import { useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { CopyButton } from "@/components/admin/CopyButton";

/** Show the member's current password on request. Each press is recorded. */
export function PasswordReveal({ memberId }: { memberId: string }) {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reveal() {
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/team/members/${memberId}`, { action: "password_reveal" });
      const data = (await res.json().catch(() => ({}))) as { password?: string; problems?: string[] };
      if (!res.ok || !data.password) setError(data.problems?.[0] ?? "Could not read it.");
      else setPassword(data.password);
    } catch {
      setError("No connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono font-semibold text-navy-900" data-password={password ? "full" : "hidden"}>
        {password ?? "••••••••••••"}
      </span>
      {password ? (
        <>
          <CopyButton text={password} label="Copy" title="Copy the password" />
          <button type="button" onClick={() => setPassword(null)} className="text-xs font-semibold text-navy-500 hover:text-navy-900">
            Hide
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={reveal}
          disabled={busy}
          className="rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50"
          data-password-show
        >
          {busy ? "…" : "Show"}
        </button>
      )}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
