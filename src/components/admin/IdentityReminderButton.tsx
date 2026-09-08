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
          onClick={() => setAsking(true)}
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

      {/* Asked every time, not only on a repeat. The button sits in a table
          row, and the row above is somebody else — a reminder that cannot be
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
