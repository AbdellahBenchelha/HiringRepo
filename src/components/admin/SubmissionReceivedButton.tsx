"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { submissionAwaitingReview } from "@/lib/submissionAck";
import type { VerificationStatus } from "@/lib/verification";
import type { ResidenceInput } from "@/lib/residence";

/**
 * Tell a candidate what they sent has arrived and is under review.
 *
 * Offered only while something is actually waiting for review — see
 * lib/submissionAck — and kept on screen afterwards, with its dates, even once
 * a decision is made. "Told on 9 Sept it takes one to three business days" is
 * what you need in front of you when they write on the 15th asking what
 * happened.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export interface SubmissionAckTarget extends ResidenceInput {
  id: string;
  fullName: string;
  email?: string;
  verificationStatus: VerificationStatus;
  submissionAckSentAt?: string;
  submissionAckCount?: number;
  submissionAcks?: string[];
}

export function SubmissionReceivedButton({
  candidate,
  onSent,
}: {
  candidate: SubmissionAckTarget;
  onSent: (patch: {
    submissionAckSentAt?: string;
    submissionAckCount?: number;
    submissionAcks?: string[];
  }) => void;
}) {
  const [history, setHistory] = useState<string[]>(
    candidate.submissionAcks ?? (candidate.submissionAckSentAt ? [candidate.submissionAckSentAt] : []),
  );
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState("");

  const awaiting = submissionAwaitingReview(candidate.verificationStatus, candidate);
  // Silent only when there is nothing to offer and nothing to remember.
  if (!awaiting && history.length === 0) return null;

  const hasEmail = !!candidate.email?.includes("@");
  const lastAt = history[history.length - 1];
  /** A second one within a day is usually a slip of the hand, not a decision. */
  const recent = !!lastAt && Date.now() - new Date(lastAt).getTime() < 24 * 60 * 60 * 1000;

  async function send() {
    if (busy) return;
    setBusy(true);
    setAsking(false);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/submission-received`, {});
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        submissionAckSentAt?: string;
        submissionAckCount?: number;
        submissionAcks?: string[];
      };
      if (data.ok) {
        const next = data.submissionAcks ?? [...history, data.submissionAckSentAt ?? new Date().toISOString()];
        setHistory(next);
        setResult("sent");
        onSent({
          submissionAckSentAt: data.submissionAckSentAt,
          submissionAckCount: data.submissionAckCount,
          submissionAcks: next,
        });
      } else {
        setResult(
          data.error === "warmup_limit"
            ? "today's sending limit is reached"
            : data.error === "nothing_to_review"
              ? "nothing is waiting for review"
              : (data.error ?? "failed"),
        );
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
          <p className="text-sm font-semibold text-navy-800">Submission received email</p>
          {awaiting ? (
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={!hasEmail || busy}
              title={
                hasEmail
                  ? "Email them that their information arrived and is under review"
                  : "No email on file"
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              <Icon name="mail" className="h-3.5 w-3.5" />
              {history.length ? "Send again" : "Send “received” email"}
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
            Not sent yet. They have submitted information that is waiting for review.
          </p>
        )}

        {result === "sent" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
            <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Email sent.
          </p>
        ) : result ? (
          <p className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={asking}
        icon="mail"
        title={history.length ? "Send the “received” email again?" : "Send “submission received” email?"}
        confirmLabel={busy ? "Sending…" : "Send email"}
        busy={busy}
        warning={
          recent
            ? `One already went out on ${fmt(lastAt)}. Sending the same message twice in a day reads as a mistake.`
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
            , confirming we have received the information they submitted, that it is under review,
            and that verification usually takes 1&ndash;3 business days. It tells them they will
            get another email once it is verified.
          </>
        }
      />
    </>
  );
}
