"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { VERIFIED_ACK_REFUSAL, verifiedAckRefusal, type VerifiedAckState } from "@/lib/verifiedAck";
import type { CandidateView } from "@/lib/candidateView";

/**
 * "Tell them they're verified" — for a candidate whose ID is verified and who
 * has not sent a voice recording, because they would rather wait for the final
 * video interview. See lib/verifiedAck.
 *
 * Shown only where it could be sent, or where it already was (so the dates
 * stay on screen). Beside the "We have your recording" panel, which covers the
 * candidates who did send one.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function VerifiedAckButton({
  candidate,
  onSent,
}: {
  candidate: VerifiedAckState & Pick<CandidateView, "id" | "fullName" | "email" | "status">;
  onSent: (patch: Partial<CandidateView>) => void;
}) {
  const [history, setHistory] = useState<string[]>(
    candidate.verifiedAcks ?? (candidate.verifiedAckSentAt ? [candidate.verifiedAckSentAt] : []),
  );
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState("");

  const refusal = verifiedAckRefusal(candidate);
  // Not eligible and never sent: nothing to show (a recording, an unverified
  // ID, an offer — each has its own place on this tab).
  if (refusal && history.length === 0) return null;
  const hasEmail = !!candidate.email?.includes("@");
  const blocked = refusal ? `Not available — ${VERIFIED_ACK_REFUSAL[refusal] ?? refusal}.` : !hasEmail ? "No email address on file." : "";

  async function send() {
    if (busy) return;
    setBusy(true);
    setAsking(false);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/verified-ack`, {});
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        verifiedAckSentAt?: string;
        verifiedAcks?: string[];
        voiceStatus?: string;
        status?: CandidateView["status"];
      };
      if (data.ok) {
        setHistory(data.verifiedAcks ?? [...history, data.verifiedAckSentAt ?? new Date().toISOString()]);
        setResult("sent");
        onSent({
          verifiedAckSentAt: data.verifiedAckSentAt,
          verifiedAcks: data.verifiedAcks,
          voiceStatus: data.voiceStatus as CandidateView["voiceStatus"],
          status: data.status,
        });
      } else {
        setResult(
          res.status === 401
            ? "your admin session has expired — sign in again"
            : VERIFIED_ACK_REFUSAL[data.error ?? ""] ?? data.error ?? "failed",
        );
      }
    } catch {
      setResult("could not reach the server");
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mt-4 rounded-xl border border-navy-100 p-4" data-verified-ack>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-navy-800">
            &ldquo;Your information is verified&rdquo;{" "}
            <span className="text-xs font-normal text-navy-400">— no voice recording</span>
          </p>
          {!blocked ? (
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={busy}
              title="Email them that their information is verified and their place is kept until one is available"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              <Icon name="checkCircle" className="h-3.5 w-3.5" />
              {history.length ? "Send again" : "Tell them they’re verified"}
            </button>
          ) : null}
        </div>

        {history.length ? (
          <ol className="mt-2.5 space-y-1 text-xs text-navy-600">
            {history.map((at, i) => (
              <li key={at} className="flex gap-2">
                <span className="font-semibold text-navy-400">{i + 1}.</span>
                <span>{fmt(at)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1.5 text-xs text-navy-500">
            {blocked || "ID verified, no voice recording. Not sent yet."}
          </p>
        )}
        {history.length && blocked ? <p className="mt-2 text-xs text-navy-500">{blocked}</p> : null}

        {result === "sent" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
            <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Sent — they are now on the Waiting tab.
          </p>
        ) : result ? (
          <p role="alert" className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={asking}
        icon="checkCircle"
        title={history.length ? "Tell them again?" : "Tell them their information is verified?"}
        confirmLabel={busy ? "Sending…" : "Send it"}
        busy={busy}
        warning={history.length ? `They were told on ${fmt(history[history.length - 1])}.` : undefined}
        onCancel={() => setAsking(false)}
        onConfirm={() => void send()}
        body={
          <>
            An email goes to <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
            {candidate.email ? (
              <>
                {" "}at <span className="font-medium text-navy-800">{candidate.email}</span>
              </>
            ) : null}
            , confirming their identity documents are verified and their application is complete, that
            they will be invited to a final video interview when a place is available, and that their
            place is kept while they wait. It does not mention the voice recording.
            <br />
            <br />
            Their voice step becomes <strong className="text-navy-900">Skipped — final video interview</strong>{" "}
            (no more voice reminders; an offer can be sent without a recording), they move to{" "}
            <strong className="text-navy-900">Under Review</strong>, and they appear on the Waiting tab.
          </>
        }
      />
    </>
  );
}
