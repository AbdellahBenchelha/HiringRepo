"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MAX_PAN_REASON, PAN_REUPLOAD_REASONS, panReuploadMessage, panReuploadPending } from "@/lib/pan";
import type { CandidateView } from "@/lib/candidateView";

/**
 * "Ask to re-upload PAN" — for somebody in India who already accepted and
 * sent a card that will not do: no back, a scan or e-PAN, or an unreadable
 * photo. Emails them a personal link (14 days) to a page that takes a photo of
 * the physical card, front and back. See lib/pan, "Re-upload".
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const ERRORS: Record<string, string> = {
  warmup_limit: "today's sending limit is reached",
  no_email: "no email address on file",
  too_soon: "one was sent less than a minute ago",
  not_accepted: "they have not accepted an offer",
  no_reason: "choose a reason or write one",
};

export function PanReuploadControl({
  candidate,
  onChange,
}: {
  candidate: CandidateView;
  onChange?: (patch: Partial<CandidateView>) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<string>(PAN_REUPLOAD_REASONS[0].value);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const requests = candidate.panReuploadRequests ?? [];
  const pending = panReuploadPending(candidate);
  const last = requests[requests.length - 1];
  const recent = !!last && Date.now() - Date.parse(last.at) < 24 * 60 * 60 * 1000;
  const hasEmail = !!candidate.email?.includes("@");
  const message = panReuploadMessage(reason, custom);

  async function send() {
    if (busy) return;
    if (!message) {
      setResult(ERRORS.no_reason);
      setAsking(false);
      return;
    }
    setBusy(true);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/pan`, {
        action: "request-reupload",
        reason,
        custom,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        panReuploadRequestedAt?: string;
        panReuploadReason?: string;
        panReuploadRequests?: CandidateView["panReuploadRequests"];
      };
      if (data.ok) {
        setResult("sent");
        onChange?.({
          panReuploadRequestedAt: data.panReuploadRequestedAt,
          panReuploadReason: data.panReuploadReason,
          panReuploadRequests: data.panReuploadRequests,
        });
      } else {
        setResult(res.status === 401 ? "your admin session has expired — sign in again" : ERRORS[data.error ?? ""] ?? data.error ?? "failed");
      }
    } catch {
      setResult("could not reach the server");
    }
    setBusy(false);
    setAsking(false);
  }

  return (
    <div className="mt-4 border-t border-navy-100 pt-3" data-pan-reupload-admin>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs">
          {pending ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-800" data-pan-reupload-status="requested">
              Re-upload requested {fmt(candidate.panReuploadRequestedAt)}
            </span>
          ) : candidate.panReuploadedAt ? (
            <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 font-bold text-green-800" data-pan-reupload-status="done">
              Re-uploaded {fmt(candidate.panReuploadedAt)}
            </span>
          ) : (
            <span className="text-navy-500">Front missing, no back, a scan or an e-PAN? Ask them for a photo of the card.</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setResult("");
            setAsking(true);
          }}
          disabled={!hasEmail || busy}
          title={hasEmail ? "Email them a link to send a photo of the physical card, front and back" : "No email on file"}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
        >
          <Icon name="mail" className="h-3.5 w-3.5" />
          {requests.length ? "Ask again to re-upload PAN" : "Ask to re-upload PAN"}
        </button>
      </div>

      {result === "sent" ? (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
          <Icon name="checkCircle" className="h-3.5 w-3.5" /> Re-upload request emailed.
        </p>
      ) : result ? (
        <p role="alert" className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
      ) : null}

      {requests.length ? (
        <div className="mt-2 text-xs text-navy-600">
          <p className="font-semibold text-navy-500">Re-upload requests</p>
          <ol className="mt-1 space-y-0.5">
            {requests.map((r, i) => (
              <li key={r.at} className="flex flex-wrap gap-x-2">
                <span className="font-semibold text-navy-400">{i + 1}.</span>
                <span>
                  {fmt(r.at)}
                  {r.by ? ` by ${r.by}` : ""} — {r.reason}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <ConfirmDialog
        open={asking}
        icon="mail"
        title="Ask them to re-upload their PAN card?"
        confirmLabel={busy ? "Sending…" : "Send email"}
        busy={busy}
        warning={recent ? `A re-upload request already went out on ${fmt(last?.at)}.` : undefined}
        onCancel={() => setAsking(false)}
        onConfirm={() => void send()}
        body={
          <div className="space-y-3">
            <p>
              An email goes to <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
              {candidate.email ? <> at <span className="font-medium text-navy-800">{candidate.email}</span></> : null}{" "}
              with a personal link (valid 14 days) to send a photo of their physical PAN card, front and
              back. You get a Telegram message when they do.
            </p>
            <label className="block text-left">
              <span className="text-xs font-bold text-navy-700">Reason they will see</span>
              <select
                id="pan-reupload-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"
              >
                {PAN_REUPLOAD_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
                <option value="custom">Write my own reason…</option>
              </select>
            </label>
            {reason === "custom" ? (
              <textarea
                id="pan-reupload-custom"
                value={custom}
                maxLength={MAX_PAN_REASON}
                rows={3}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="e.g. The number on the card is covered by your finger."
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-900"
              />
            ) : null}
            {message ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
                &ldquo;{message}&rdquo;
              </p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
