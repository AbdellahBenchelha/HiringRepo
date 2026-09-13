"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { CandidateStatus } from "@/lib/candidateStatus";

/**
 * Telling one candidate their recording arrived and a decision is coming.
 *
 * Sits beside the recording it is about. The dates are kept for the same
 * reason every other send here keeps them: somebody writing three weeks later
 * to ask whether they have been forgotten is really asking when they last
 * heard from us, and that has to be answerable.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export interface VoiceAckTarget {
  id: string;
  fullName: string;
  email?: string;
  status: CandidateStatus;
  voiceStatus?: string;
  voiceAckSentAt?: string;
  voiceAckCount?: number;
  voiceAcks?: string[];
  offerSentAt?: string;
  /** Whether there is a recording to acknowledge at all. */
  hasRecording: boolean;
}

export function VoiceAckButton({
  candidate,
  onSent,
}: {
  candidate: VoiceAckTarget;
  onSent: (patch: {
    voiceAckSentAt?: string;
    voiceAckCount?: number;
    voiceAcks?: string[];
    status?: CandidateStatus;
    awaitingDecision?: boolean;
  }) => void;
}) {
  const [history, setHistory] = useState<string[]>(
    candidate.voiceAcks ?? (candidate.voiceAckSentAt ? [candidate.voiceAckSentAt] : []),
  );
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState("");

  // Nothing to acknowledge and nothing acknowledged: no panel at all.
  if (!candidate.hasRecording && history.length === 0) return null;

  const hasEmail = !!candidate.email?.includes("@");
  const offered = !!candidate.offerSentAt;
  const failed = candidate.voiceStatus === "Voice Assessment Failed";
  /** Why the button is not offered, in the words a person would use. */
  const blocked = offered
    ? "They already have an offer — this would be behind the news."
    : failed
      ? "Marked as failing the assessment. That needs a decline, not a holding message."
      : !hasEmail
        ? "No email address on file."
        : "";

  async function send() {
    if (busy) return;
    setBusy(true);
    setAsking(false);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/voice-ack`, {});
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        voiceAckSentAt?: string;
        voiceAckCount?: number;
        voiceAcks?: string[];
        status?: CandidateStatus;
      };
      if (data.ok) {
        setHistory(data.voiceAcks ?? [...history, data.voiceAckSentAt ?? new Date().toISOString()]);
        setResult("sent");
        onSent({
          voiceAckSentAt: data.voiceAckSentAt,
          voiceAckCount: data.voiceAckCount,
          voiceAcks: data.voiceAcks,
          status: data.status,
          awaitingDecision: true,
        });
      } else {
        setResult(data.error ?? "failed");
      }
    } catch {
      setResult("failed");
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mt-4 rounded-xl border border-navy-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-navy-800">&ldquo;We have your recording&rdquo;</p>
          {!blocked ? (
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={busy}
              title="Email them that the recording arrived and a decision is coming"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              <Icon name="checkCircle" className="h-3.5 w-3.5" />
              {history.length ? "Send again" : "Tell them we have it"}
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
            {blocked || "Not sent yet. Their recording is in and they have heard nothing back."}
          </p>
        )}

        {history.length && blocked ? (
          <p className="mt-2 text-xs text-navy-500">{blocked}</p>
        ) : null}

        {result === "sent" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
            <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Sent — they are now on the
            Waiting tab.
          </p>
        ) : result ? (
          <p className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={asking}
        icon="checkCircle"
        title={history.length ? "Tell them again?" : "Tell them we have their recording?"}
        confirmLabel={busy ? "Sending…" : "Send it"}
        busy={busy}
        warning={
          history.length
            ? `They were told on ${fmt(history[history.length - 1])}. A second receipt for the same recording is usually confusing rather than reassuring.`
            : undefined
        }
        onCancel={() => setAsking(false)}
        onConfirm={() => void send()}
        body={
          <>
            An email goes to{" "}
            <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
            {candidate.email ? (
              <>
                {" "}
                at <span className="font-medium text-navy-800">{candidate.email}</span>
              </>
            ) : null}
            , confirming their recording arrived, saying a person is reviewing it, and being honest
            that a place is not always free straight away. It{" "}
            <strong className="text-navy-900">does not promise an offer</strong> and asks nothing of
            them.
            {candidate.status !== "Under Review" ? (
              <>
                {" "}
                It also moves them to <strong className="text-navy-900">Under Review</strong> and
                onto the Waiting tab.
              </>
            ) : null}
          </>
        }
      />
    </>
  );
}
