"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { OFFER_REPLY_HOURS } from "@/lib/offerReminder";

/**
 * Chasing an answer to an offer, and the deadline that chase sets.
 *
 * An offer nobody has answered costs more than any other silence here: the
 * role is held open and nobody else is put forward for it, while the candidate
 * may have taken another job weeks ago.
 *
 * The deadline it shows is only ever a prompt. Nothing in the system acts on
 * it — the email says we will close the file and erase what we hold, and a
 * person does that, in front of the record, using the delete button already on
 * the row. Deletion has no undo, which is exactly why it has no timer.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export interface OfferReplyTarget {
  id: string;
  fullName: string;
  email?: string;
  offerAwaitingReply: boolean;
  offerReminderSentAt?: string;
  offerReminderCount?: number;
  offerReminders?: string[];
  offerReplyDeadline?: string;
}

export function OfferReplyPanel({
  candidate,
  onSent,
}: {
  candidate: OfferReplyTarget;
  onSent: (patch: {
    offerReminderSentAt?: string;
    offerReminderCount?: number;
    offerReminders?: string[];
    offerReplyDeadline?: string;
  }) => void;
}) {
  const [history, setHistory] = useState<string[]>(
    candidate.offerReminders ?? (candidate.offerReminderSentAt ? [candidate.offerReminderSentAt] : []),
  );
  const [deadline, setDeadline] = useState(candidate.offerReplyDeadline);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState("");

  // The history outlives the chase: somebody who was reminded and then
  // answered should still show that they were reminded.
  if (!candidate.offerAwaitingReply && history.length === 0) return null;

  const hasEmail = !!candidate.email?.includes("@");
  const overdue =
    candidate.offerAwaitingReply && !!deadline && Date.now() > Date.parse(deadline);
  /** A second chase within a day is usually a slip of the hand, not a decision. */
  const last = history[history.length - 1];
  const recent = !!last && Date.now() - Date.parse(last) < 24 * 60 * 60 * 1000;

  async function send() {
    if (busy) return;
    setBusy(true);
    setAsking(false);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/offer-reminder`, {});
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        offerReminderSentAt?: string;
        offerReminderCount?: number;
        offerReminders?: string[];
        offerReplyDeadline?: string;
      };
      if (data.ok) {
        setHistory(
          data.offerReminders ??
            [...history, data.offerReminderSentAt ?? new Date().toISOString()],
        );
        setDeadline(data.offerReplyDeadline);
        setResult("sent");
        onSent({
          offerReminderSentAt: data.offerReminderSentAt,
          offerReminderCount: data.offerReminderCount,
          offerReminders: data.offerReminders,
          offerReplyDeadline: data.offerReplyDeadline,
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
          <p className="text-sm font-semibold text-navy-800">Waiting for their answer</p>
          {candidate.offerAwaitingReply ? (
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={!hasEmail || busy}
              title={
                hasEmail
                  ? `Email them a reminder with ${OFFER_REPLY_HOURS} hours to accept or decline`
                  : "No email on file"
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              <Icon name="mail" className="h-3.5 w-3.5" />
              {history.length ? "Remind again" : "Remind to answer"}
            </button>
          ) : null}
        </div>

        {/* The deadline, and whether it has gone. Said in the panel because
            this is where somebody decides what to do about it. */}
        {candidate.offerAwaitingReply && deadline ? (
          <p
            className={`mt-2.5 text-xs font-medium ${
              overdue ? "text-red-700" : "text-navy-700"
            }`}
          >
            {overdue ? (
              <>
                They were asked to answer by {fmt(deadline)} and have not.{" "}
                <span className="font-semibold">
                  Nothing has been deleted — that is your call, on their row.
                </span>
              </>
            ) : (
              <>Asked to answer by {fmt(deadline)}.</>
            )}
          </p>
        ) : null}

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
            None sent yet. Their offer is out and they have not answered either way.
          </p>
        )}

        {!candidate.offerAwaitingReply && history.length ? (
          <p className="mt-2 text-xs font-medium text-green-700">They answered — nothing outstanding.</p>
        ) : null}

        {result === "sent" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
            <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Reminder emailed.
          </p>
        ) : result ? (
          <p className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={asking}
        icon="mail"
        title={history.length ? "Send another reminder?" : "Remind them to answer?"}
        confirmLabel={busy ? "Sending…" : "Send reminder"}
        busy={busy}
        warning={
          recent
            ? `The last one went out on ${fmt(last)}, and set its own deadline. Sending another now replaces that deadline with a later one.`
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
            , asking them to accept or decline within{" "}
            <strong className="text-navy-900">{OFFER_REPLY_HOURS} hours</strong> and telling them
            that if we hear nothing we will close their file and remove their application and
            documents from our system.{" "}
            <strong className="text-navy-900">Nothing is deleted automatically</strong> — when the
            deadline passes, the row is flagged and deleting is still your decision.
          </>
        }
      />
    </>
  );
}
