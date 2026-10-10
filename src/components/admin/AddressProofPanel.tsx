"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { currentDocument, type CandidateDocument } from "@/lib/documents";
import {
  ADDRESS_REASK_REASONS,
  ADDRESS_STATUS_LABEL,
  MAX_ADDRESS_REASON,
  addressDiffers,
  addressDocTypeLabel,
  addressOnFile,
  addressReaskMessage,
  type AddressProofStatus,
} from "@/lib/addressProof";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Proof of address — a recent bill or bank statement, PDF only — asked for as
 * the last step before the final agreement. See lib/addressProof.
 *
 * Optional and separate: the agreement can go out without it, and approving it
 * changes nothing else. Everything here is a button somebody presses: the
 * request, a reminder, approval, or a request for a new document with the
 * reason the candidate will read. Earlier documents stay listed under the
 * current one.
 */

const STYLE: Record<AddressProofStatus, { chip: string; icon: IconName }> = {
  not_asked: { chip: "bg-navy-100 text-navy-600", icon: "home" },
  asked: { chip: "bg-amber-100 text-amber-800", icon: "clock" },
  received: { chip: "bg-blue-100 text-blue-800", icon: "document" },
  approved: { chip: "bg-green-100 text-green-800", icon: "checkCircle" },
};

const EVENT_LABEL = { request: "Request", reminder: "Reminder", reask: "New document asked" } as const;

const ERRORS: Record<string, string> = {
  warmup_limit: "today's sending limit is reached — try again after it resets, or raise the cap on the Warm-up tab",
  no_email: "no email address on file",
  too_soon: "the same email went less than a minute ago",
  not_accepted: "they have not accepted an offer",
  already_received: "they have already sent one",
  not_waiting: "they are not waiting to upload",
  no_document: "there is no document to replace",
  no_reason: "choose a reason or write one",
  nothing_to_approve: "there is no new document to approve",
  fake_recipient: "the email address is not a real mailbox",
};

function fmt(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

type Patch = Partial<CandidateView>;

export function AddressProofPanel({
  candidate,
  onOpenDocument,
  onChange,
}: {
  candidate: CandidateView;
  onOpenDocument: (doc: CandidateDocument) => void;
  onChange: (patch: Patch) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"request" | "reminder" | null>(null);
  const [reasking, setReasking] = useState(false);
  const [reason, setReason] = useState<string>(ADDRESS_REASK_REASONS[0].value);
  const [custom, setCustom] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const status = candidate.addressProofStatus ?? "not_asked";
  // Silent for anybody who has not accepted and was never asked: the email
  // says the agreement is ready, which is only true after acceptance.
  if (status === "not_asked" && !candidate.offerAcceptedAt) return null;

  const style = STYLE[status];
  const events = candidate.addressProofEvents ?? [];
  const submissions = candidate.addressProofSubmissions ?? [];
  const latest = submissions.at(-1);
  const docs = (candidate.documents ?? []).filter((d) => d.kind === "addressProof" && d.status !== "blocked" && d.key);
  const current = currentDocument(docs, "addressProof");
  const earlier = docs.filter((d) => d !== current).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const blocked = (candidate.documents ?? []).filter((d) => d.kind === "addressProof" && d.status === "blocked");
  const onFileNow = addressOnFile(candidate);
  const lastEvent = events.at(-1);
  const recentEvent = !!lastEvent && Date.now() - Date.parse(lastEvent.at) < 24 * 60 * 60 * 1000;
  const reminders = events.filter((e) => e.kind === "reminder").length;
  const hasEmail = !!candidate.email?.includes("@");
  const reaskMessage = addressReaskMessage(reason, custom);
  const submissionFor = (d: CandidateDocument) => submissions.find((s) => s.key === d.key);

  async function act(action: "request" | "reminder" | "reask" | "approve" | "unapprove") {
    if (busy) return;
    if (action === "reask" && !reaskMessage) {
      setResult({ ok: false, text: ERRORS.no_reason });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/address-proof`, {
        action,
        ...(action === "reask" ? { reason, custom } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { ok?: boolean; error?: string };
      if (!data.ok) {
        const why = res.status === 401 ? "your admin session has expired — sign in again" : ERRORS[data.error ?? ""] ?? data.error ?? "failed";
        setResult({ ok: false, text: `Not done (${why}).` });
        return;
      }
      const patch: Patch = {};
      for (const key of [
        "addressProofRequestedAt", "addressProofReason", "addressProofEvents", "addressProofSubmittedAt",
        "addressProofSubmissions", "addressProofApprovedAt", "addressProofApprovedBy", "addressProofStatus",
      ] as const) {
        (patch as Record<string, unknown>)[key] = data[key] ?? undefined;
      }
      onChange(patch);
      setResult({
        ok: true,
        text: {
          request: "Request emailed.",
          reminder: "Reminder emailed.",
          reask: "New document requested — their page is open again.",
          approve: "Approved.",
          unapprove: "Approval undone.",
        }[action],
      });
      if (action === "reask") {
        setReasking(false);
        setCustom("");
      }
    } catch {
      setResult({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const btn = "inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

  return (
    <section className="mt-6 rounded-2xl border border-navy-100 bg-white p-5" data-address-panel={status}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy-500">
            <Icon name="home" className="h-4 w-4" />
            Proof of address
          </h3>
          <p className="mt-1.5 text-sm text-navy-600">
            Optional last step before the final agreement — a bill or bank statement (PDF).
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.chip}`} data-address-status>
          <Icon name={style.icon} className="h-3.5 w-3.5" />
          {ADDRESS_STATUS_LABEL[status]}
        </span>
      </div>

      {/* What we asked */}
      {candidate.addressProofRequestedAt ? (
        <div className="mt-4 rounded-xl border border-cream-300 bg-cream-100 p-3.5 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            {candidate.addressProofReason ? "New document asked" : "Asked"} {fmt(candidate.addressProofRequestedAt)}
            {reminders ? ` · ${reminders} reminder${reminders === 1 ? "" : "s"}` : ""}
          </p>
          {candidate.addressProofReason ? (
            <p className="mt-1.5 leading-relaxed text-navy-700">{candidate.addressProofReason}</p>
          ) : null}
        </div>
      ) : null}

      {/* What came back */}
      {latest && (status === "received" || status === "approved") ? (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4" data-address-received>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-navy-400">Document</dt>
                <dd className="mt-0.5 font-semibold text-navy-900" data-address-doc-type>
                  {addressDocTypeLabel(latest.type)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-navy-400">Received</dt>
                <dd className="mt-0.5 text-navy-900">{fmt(latest.at)}</dd>
              </div>
            </dl>
            {current ? (
              <button
                type="button"
                onClick={() => onOpenDocument(current)}
                className={`${btn} border border-navy-200 bg-white text-navy-800 hover:bg-navy-50`}
                data-address-open
              >
                <Icon name="document" className="h-4 w-4" />
                Open PDF
              </button>
            ) : null}
          </div>
          <AddressCompare given={latest.address} onFile={latest.onFile || onFileNow} />
        </div>
      ) : null}

      {status === "approved" ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-700" data-address-approved>
          <Icon name="checkCircle" className="h-4 w-4" />
          Approved {fmt(candidate.addressProofApprovedAt)}
          {candidate.addressProofApprovedBy ? ` by ${candidate.addressProofApprovedBy}` : ""}.
        </p>
      ) : null}

      {blocked.length ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
          {blocked.length === 1 ? "One upload was" : `${blocked.length} uploads were`} refused by the file check
          {blocked.at(-1)?.reason ? ` — ${blocked.at(-1)?.reason}` : ""}.
        </p>
      ) : null}

      {/* Ask for a new document */}
      {reasking ? (
        <div className="mt-4 rounded-xl border-2 border-brand-200 bg-brand-50/40 p-4" data-address-reask-form>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-500">Why is a new document needed?</p>
          <div className="mt-2 space-y-1.5">
            {[...ADDRESS_REASK_REASONS, { value: "custom", label: "Write my own reason" }].map((r) => (
              <label key={r.value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name={`address-reask-${candidate.id}`}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-brand-600"
                  data-address-reason={r.value}
                />
                <span className="text-navy-700">{r.label}</span>
              </label>
            ))}
          </div>
          {reason === "custom" ? (
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
              maxLength={MAX_ADDRESS_REASON}
              placeholder="Shown to the candidate exactly as written."
              className="mt-2 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
              data-address-custom
            />
          ) : null}
          {reaskMessage ? (
            <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-navy-600">
              They will read: &ldquo;{reaskMessage}&rdquo;
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !hasEmail}
              onClick={() => void act("reask")}
              className={`${btn} bg-brand-500 text-navy-900 hover:bg-brand-400`}
              data-address-reask-send
            >
              {busy ? "Sending…" : "Send email"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setReasking(false)}
              className={`${btn} border border-navy-200 bg-white text-navy-700 hover:bg-navy-50`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "not_asked" ? (
            <button
              type="button"
              disabled={busy || !hasEmail}
              title={hasEmail ? "Email them the request with their personal link" : "No email on file"}
              onClick={() => setConfirm("request")}
              className={`${btn} bg-navy-900 text-white hover:bg-navy-800`}
              data-address-action="request"
            >
              <Icon name="mail" className="h-4 w-4" />
              Send request
            </button>
          ) : null}
          {status === "asked" ? (
            <button
              type="button"
              disabled={busy || !hasEmail}
              onClick={() => setConfirm("reminder")}
              className={`${btn} bg-navy-900 text-white hover:bg-navy-800`}
              data-address-action="reminder"
            >
              <Icon name="mail" className="h-4 w-4" />
              Send reminder
            </button>
          ) : null}
          {status === "received" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("approve")}
              className={`${btn} bg-green-600 text-white hover:bg-green-700`}
              data-address-action="approve"
            >
              <Icon name="check" className="h-4 w-4" />
              Approve
            </button>
          ) : null}
          {status === "received" || status === "approved" ? (
            <button
              type="button"
              disabled={busy || !hasEmail}
              onClick={() => {
                setResult(null);
                setReasking(true);
              }}
              className={`${btn} border border-red-200 bg-white text-red-700 hover:bg-red-50`}
              data-address-action="reask"
            >
              Ask for a new document
            </button>
          ) : null}
          {status === "approved" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("unapprove")}
              className={`${btn} border border-navy-200 bg-white text-navy-600 hover:bg-navy-50`}
              data-address-action="unapprove"
            >
              Undo approval
            </button>
          ) : null}
        </div>
      )}

      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`mt-3 flex items-center gap-1 text-xs font-medium ${result.ok ? "text-green-700" : "text-amber-700"}`}
          data-address-result={result.ok ? "ok" : "error"}
        >
          {result.ok ? <Icon name="checkCircle" className="h-3.5 w-3.5" /> : null}
          {result.text}
        </p>
      ) : null}

      {/* History */}
      {events.length ? (
        <div className="mt-4 text-xs text-navy-600">
          <p className="font-semibold text-navy-500">Emails</p>
          <ol className="mt-1 space-y-0.5">
            {events.map((e, i) => (
              <li key={e.at} className="flex gap-x-2">
                <span className="shrink-0 font-semibold text-navy-400">{i + 1}.</span>
                <span className="min-w-0">
                  {EVENT_LABEL[e.kind]} · {fmt(e.at)}
                  {e.by ? ` by ${e.by}` : ""}
                  {e.reason ? ` — ${e.reason}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {earlier.length ? (
        <div className="mt-3 text-xs text-navy-600" data-address-earlier>
          <p className="font-semibold text-navy-500">Earlier documents</p>
          <ul className="mt-1 space-y-1">
            {earlier.map((d) => {
              const s = submissionFor(d);
              return (
                <li key={d.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenDocument(d)}
                    className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  >
                    {d.filename}
                  </button>
                  <span>
                    {fmt(d.uploadedAt)}
                    {s ? ` · ${addressDocTypeLabel(s.type)} · ${s.address}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        icon="mail"
        title={confirm === "reminder" ? "Send a proof of address reminder?" : "Ask for proof of address?"}
        confirmLabel={busy ? "Sending…" : "Send email"}
        busy={busy}
        warning={recentEvent ? `An email about this already went out on ${fmt(lastEvent?.at)}.` : undefined}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void act(confirm)}
        body={
          <p>
            An email goes to <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
            {candidate.email ? <> at <span className="font-medium text-navy-800">{candidate.email}</span></> : null}{" "}
            {confirm === "reminder"
              ? "reminding them to upload their proof of address. Same link as before."
              : "saying their agreement is ready and asking for a proof of address, with a personal link that never expires."}{" "}
            You get a Telegram message when they upload.
          </p>
        }
      />
    </section>
  );
}

/** The address they typed, and ours beside it when the two differ. */
function AddressCompare({ given, onFile }: { given: string; onFile: string }) {
  const differs = addressDiffers(given, onFile);
  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className={differs ? "rounded-lg border-2 border-amber-300 bg-amber-50 p-3" : ""} data-address-given={differs ? "changed" : "same"}>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          Address they gave{differs ? " — different from ours" : ""}
        </p>
        <p className={`mt-0.5 break-words ${differs ? "font-semibold text-amber-900" : "text-navy-900"}`}>{given}</p>
      </div>
      {differs ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Address on file</p>
          <p className="mt-0.5 break-words text-navy-700">{onFile}</p>
        </div>
      ) : null}
    </div>
  );
}
