"use client";

import { useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { formatIban } from "@/lib/teamShared";
import { CopyButton } from "@/components/admin/CopyButton";

/** Show the full IBAN on request. Each press is recorded on the member. */
export function BankReveal({ memberId, which, masked }: { memberId: string; which: "current" | "pending"; masked: string }) {
  const [iban, setIban] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reveal() {
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/team/members/${memberId}`, { action: "bank_reveal", which });
      const data = (await res.json().catch(() => ({}))) as { iban?: string; problems?: string[] };
      if (!res.ok || !data.iban) setError(data.problems?.[0] ?? "Could not read it.");
      else setIban(data.iban);
    } catch {
      setError("No connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono font-semibold text-navy-900" data-iban={iban ? "full" : "masked"}>
        {iban ? formatIban(iban) : masked}
      </span>
      {iban ? (
        <>
          <CopyButton text={iban} label="Copy" title="Copy the IBAN" />
          <button type="button" onClick={() => setIban(null)} className="text-xs font-semibold text-navy-500 hover:text-navy-900">
            Hide
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={reveal}
          disabled={busy}
          className="rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50"
        >
          {busy ? "…" : "Show"}
        </button>
      )}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
