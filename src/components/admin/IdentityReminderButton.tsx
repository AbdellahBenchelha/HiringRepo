"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Chase identity documents from a candidate who has accepted an offer.
 *
 * Shown only where there is something to chase. This group stalls silently:
 * accepting is the moment they feel finished, so someone who closed the tab
 * has nothing telling them anything is outstanding — while from their side it
 * looks as though we went quiet after they said yes.
 *
 * Renders nothing for anyone who does not owe documents, so the column stays
 * readable and the button never appears where pressing it would be wrong.
 */

function fmtShort(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

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
}

export function IdentityReminderButton({
  candidate,
  onSent,
}: {
  candidate: IdentityReminderTarget;
  onSent: (patch: { identityReminderSentAt?: string; identityReminderCount?: number }) => void;
}) {
  const [sentAt, setSentAt] = useState(candidate.identityReminderSentAt);
  const [count, setCount] = useState(candidate.identityReminderCount ?? 0);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState("");

  if (!candidate.identityNeeded) return null;

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
      };
      if (data.ok) {
        setSentAt(data.identityReminderSentAt);
        setCount(data.identityReminderCount ?? count + 1);
        setResult("sent");
        onSent({
          identityReminderSentAt: data.identityReminderSentAt,
          identityReminderCount: data.identityReminderCount,
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
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => (recent ? setAsking(true) : void send())}
          disabled={!hasEmail || busy}
          title={
            hasEmail
              ? "Email a reminder that we still need their identity documents"
              : "No email on file"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
        >
          <Icon name="mail" className="h-3.5 w-3.5" />
          Remind for ID
        </button>
        {count ? (
          <span className="text-[11px] text-navy-400" title={fmt(sentAt)}>
            {count}× · {fmtShort(sentAt)}
          </span>
        ) : null}
      </div>

      {result === "sent" ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-green-700">
          <Icon name="checkCircle" className="h-3 w-3 shrink-0" /> Reminder emailed.
        </p>
      ) : result ? (
        <p className="mt-1 text-[11px] font-medium text-amber-700">Not sent ({result}).</p>
      ) : null}

      <ConfirmDialog
        open={asking}
        icon="mail"
        title="Send another reminder?"
        confirmLabel="Send reminder"
        busy={busy}
        warning={`The last one went out on ${fmt(sentAt)}.`}
        onCancel={() => setAsking(false)}
        onConfirm={() => void send()}
        body={
          <>
            <strong className="text-navy-900">{candidate.fullName || "This candidate"}</strong> has
            already been reminded {count === 1 ? "once" : `${count} times`} about their identity
            documents. Asking repeatedly in a short space of time is the thing that makes a genuine
            request start to look like a scam.
          </>
        }
      />
    </>
  );
}
