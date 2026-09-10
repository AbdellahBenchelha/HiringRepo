"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Chase identity documents from a candidate who has accepted an offer.
 *
 * This group stalls silently: accepting is the moment they feel finished, so
 * someone who closed the tab has nothing telling them anything is outstanding
 * — while from their side it looks as though we went quiet after they said
 * yes.
 *
 * It lives in the profile rather than in a table cell. An email that cannot be
 * unsent does not belong in a column you scroll past, next to a badge and a
 * flag, where the row above is somebody else; the tab still counts the people
 * who need one, and the sending happens where their record is open in front of
 * you.
 *
 * Every reminder is listed with its date. "Chased twice" is a number; "9 Sept,
 * then 14 Sept" is what tells you whether a third is fair, and it is what you
 * read back to somebody who says nobody ever told them.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export interface IdentityReminderTarget {
  id: string;
  fullName: string;
  email?: string;
  identityNeeded: boolean;
  identityReminderSentAt?: string;
  identityReminderCount?: number;
  /** Every one, oldest first. Empty on reminders sent before this was kept. */
  identityReminders?: string[];
}

export function IdentityReminderButton({
  candidate,
  onSent,
}: {
  candidate: IdentityReminderTarget;
  onSent: (patch: {
    identityReminderSentAt?: string;
    identityReminderCount?: number;
    identityReminders?: string[];
  }) => void;
}) {
  const [sentAt, setSentAt] = useState(candidate.identityReminderSentAt);
  const [count, setCount] = useState(candidate.identityReminderCount ?? 0);
  const [history, setHistory] = useState<string[]>(candidate.identityReminders ?? []);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState("");

  // The history outlives the need for it: somebody who was chased twice and
  // then sent their documents should still show that they were chased, so the
  // panel is only silent when there is nothing to say at all.
  if (!candidate.identityNeeded && count === 0) return null;

  const hasEmail = !!candidate.email?.includes("@");
  /** A second chase within a day is usually a slip of the hand, not a decision. */
  const recent = !!sentAt && Date.now() - new Date(sentAt).getTime() < 24 * 60 * 60 * 1000;

  async function send() {
    if (busy) return;
    setBusy(true);
    setAsking(false);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/identity-reminder`, {});
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        identityReminderSentAt?: string;
        identityReminderCount?: number;
        identityReminders?: string[];
      };
      if (data.ok) {
        setSentAt(data.identityReminderSentAt);
        setCount(data.identityReminderCount ?? count + 1);
        setHistory(
          data.identityReminders ??
            [...history, data.identityReminderSentAt ?? new Date().toISOString()],
        );
        setResult("sent");
        onSent({
          identityReminderSentAt: data.identityReminderSentAt,
          identityReminderCount: data.identityReminderCount,
          identityReminders: data.identityReminders,
        });
      } else {
        setResult(data.error ?? "failed");
      }
    } catch {
      setResult("failed");
    }
    setBusy(false);
  }

  const listed = history.length ? history : sentAt ? [sentAt] : [];

  return (
    <>
      <div className="mt-4 rounded-xl border border-navy-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-navy-800">Identity reminders</p>
          {candidate.identityNeeded ? (
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={!hasEmail || busy}
              title={
                hasEmail
                  ? "Email a reminder that we still need their identity documents"
                  : "No email on file"
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              <Icon name="mail" className="h-3.5 w-3.5" />
              {count ? "Remind again" : "Remind for ID"}
            </button>
          ) : null}
        </div>

        {/* Dates, not a tally. A candidate saying nobody told them, and a
            recruiter deciding whether a fourth is fair, both need to see when
            the others went. */}
        {listed.length ? (
          <ol className="mt-2.5 space-y-1 text-xs text-navy-600">
            {listed.map((at, i) => (
              <li key={at} className="flex gap-2">
                <span className="font-semibold text-navy-400">{i + 1}.</span>
                <span>{fmt(at)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1.5 text-xs text-navy-500">
            {candidate.identityNeeded
              ? "None sent yet. They have accepted but have not sent their documents."
              : "None sent."}
          </p>
        )}

        {!candidate.identityNeeded && listed.length ? (
          <p className="mt-2 text-xs font-medium text-green-700">
            Their documents are in — nothing outstanding.
          </p>
        ) : null}

        {result === "sent" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
            <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Reminder emailed.
          </p>
        ) : result ? (
          <p className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
        ) : null}
      </div>

      {/* Asked every time, not only on a repeat: a reminder that cannot be
          unsent should say whose inbox it is about to land in before it goes,
          not after. */}
      <ConfirmDialog
        open={asking}
        icon="mail"
        title={count ? "Send another reminder?" : "Send identity reminder?"}
        confirmLabel={busy ? "Sending…" : "Send reminder"}
        busy={busy}
        warning={
          recent
            ? `The last one went out on ${fmt(sentAt)}. Asking repeatedly in a short space of time is what makes a genuine request start to look like a scam.`
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
            , confirming that their acceptance is recorded and asking them to complete the identity
            check so their agreement can be prepared. It links their own offer page.
            {count ? (
              <>
                {" "}
                They have already been reminded {count === 1 ? "once" : `${count} times`}.
              </>
            ) : null}
          </>
        }
      />
    </>
  );
}
