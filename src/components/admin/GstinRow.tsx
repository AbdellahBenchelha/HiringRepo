"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { CopyButton } from "@/components/admin/CopyButton";
import { isValidGstin, normaliseGstin } from "@/lib/pan";
import type { CandidateView } from "@/lib/candidateView";

/**
 * The GSTIN line in View info: the number (with Copy), or "Not provided" with
 * a way to ask for it by email — and a pencil to type in the one they send
 * back by reply. Checked here the same way the offer page checks it.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function GstinRow({
  candidate,
  onChange,
}: {
  candidate: CandidateView;
  onChange?: (patch: Partial<CandidateView>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const gstin = candidate.gstin;
  const requests = candidate.gstinRequests ?? [];
  const last = requests[requests.length - 1];
  const recent = !!last && Date.now() - Date.parse(last) < 24 * 60 * 60 * 1000;
  const hasEmail = !!candidate.email?.includes("@");
  const typed = normaliseGstin(value);
  const typedError = typed && !isValidGstin(typed) ? "This doesn't look like a valid GSTIN — please check it." : "";

  async function save() {
    if (busy || !isValidGstin(typed)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/gstin`, { action: "set", gstin: typed });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; gstin?: string; gstinAddedAt?: string; gstinAddedBy?: string;
      };
      if (data.ok) {
        onChange?.({ gstin: data.gstin, gstinAddedAt: data.gstinAddedAt, gstinAddedBy: data.gstinAddedBy });
        setEditing(false);
        setMessage({ ok: true, text: "GSTIN saved." });
      } else {
        setMessage({ ok: false, text: data.error === "invalid_gstin" ? "Not saved — that GSTIN is not valid." : "Not saved — try again." });
      }
    } catch {
      setMessage({ ok: false, text: "Not saved — could not reach the server." });
    }
    setBusy(false);
  }

  async function request() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/gstin`, { action: "request" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; gstinRequests?: string[] };
      if (data.ok) {
        onChange?.({ gstinRequests: data.gstinRequests });
        setMessage({ ok: true, text: "GSTIN request emailed." });
      } else {
        setMessage({
          ok: false,
          text: `Not sent (${
            data.error === "warmup_limit"
              ? "today's sending limit is reached"
              : data.error === "no_email"
                ? "no email address on file"
                : data.error === "already_has_gstin"
                  ? "they already have a GSTIN"
                  : data.error ?? "failed"
          }).`,
        });
      }
    } catch {
      setMessage({ ok: false, text: "Not sent — could not reach the server." });
    }
    setBusy(false);
    setAsking(false);
  }

  return (
    <div className="mt-3 border-t border-navy-100 pt-3" data-gstin>
      {editing ? (
        <div>
          <label htmlFor={`gstin-${candidate.id}`} className="text-sm font-semibold text-navy-800">
            {gstin ? "Correct the GSTIN" : "Add the GSTIN they sent"}
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id={`gstin-${candidate.id}`}
              value={value}
              autoFocus
              maxLength={20}
              spellCheck={false}
              autoComplete="off"
              placeholder="15 characters"
              onChange={(e) => setValue(normaliseGstin(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
                if (e.key === "Escape") setEditing(false);
              }}
              className={`w-56 rounded-lg border-2 px-3 py-1.5 font-mono text-sm tracking-wider text-navy-900 focus:outline-none ${
                typedError ? "border-red-300" : "border-navy-200 focus:border-brand-400"
              }`}
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !isValidGstin(typed)}
              className="rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-100"
            >
              Cancel
            </button>
          </div>
          <p className={`mt-1 text-xs ${typedError ? "font-medium text-red-700" : "text-navy-400"}`}>
            {typedError || (typed ? `${typed.length} / 15` : "Paste it from their reply — spaces and small letters are fixed for you.")}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-navy-700">
            <span className="font-semibold text-navy-800">GSTIN:</span>
            {gstin ? (
              <span className="font-mono tracking-wider text-navy-900">{gstin}</span>
            ) : (
              <span className="text-navy-400">Not provided (optional)</span>
            )}
            <button
              type="button"
              onClick={() => {
                setValue(gstin ?? "");
                setEditing(true);
                setMessage(null);
              }}
              aria-label={gstin ? "Edit GSTIN" : "Add GSTIN"}
              title={gstin ? "Edit GSTIN" : "Add GSTIN"}
              className="rounded-md p-1 text-navy-400 transition hover:bg-navy-100 hover:text-navy-700"
            >
              <Icon name="pencil" className="h-3.5 w-3.5" />
            </button>
          </p>
          <div className="flex items-center gap-2">
            {gstin ? (
              <CopyButton text={gstin} title="Copy GSTIN" />
            ) : (
              <button
                type="button"
                onClick={() => setAsking(true)}
                disabled={!hasEmail || busy}
                title={hasEmail ? "Email them asking for their GSTIN" : "No email on file"}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
              >
                <Icon name="mail" className="h-3.5 w-3.5" />
                {requests.length ? "Request again" : "Request GSTIN"}
              </button>
            )}
          </div>
        </div>
      )}

      {gstin && candidate.gstinAddedAt ? (
        <p className="mt-1 text-xs text-navy-400">
          Added from a reply{candidate.gstinAddedBy ? ` by ${candidate.gstinAddedBy}` : ""} on {fmt(candidate.gstinAddedAt)}.
        </p>
      ) : null}

      {requests.length ? (
        <div className="mt-2 text-xs text-navy-500">
          <p className="font-semibold">GSTIN requests sent</p>
          <ol className="mt-0.5 space-y-0.5">
            {requests.map((at, i) => (
              <li key={at} className="flex gap-2">
                <span className="font-semibold text-navy-400">{i + 1}.</span>
                <span>{fmt(at)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {message ? (
        <p className={`mt-2 text-xs font-medium ${message.ok ? "text-green-700" : "text-amber-700"}`}>{message.text}</p>
      ) : null}

      <ConfirmDialog
        open={asking}
        icon="mail"
        title={requests.length ? "Ask for the GSTIN again?" : "Request their GSTIN?"}
        confirmLabel={busy ? "Sending…" : "Send email"}
        busy={busy}
        warning={recent ? `A request already went out on ${fmt(last)}.` : undefined}
        onCancel={() => setAsking(false)}
        onConfirm={() => void request()}
        body={
          <>
            An email goes to <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
            {candidate.email ? (
              <>
                {" "}at <span className="font-medium text-navy-800">{candidate.email}</span>
              </>
            ) : null}
            , with the subject &ldquo;Action Required: GSTIN Needed to Finalize Your Agreement&rdquo;.
            They reply with their GSTIN, and you add it here with the pencil.
          </>
        }
      />
    </div>
  );
}
