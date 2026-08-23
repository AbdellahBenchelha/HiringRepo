"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Releases a withheld assessment email.
 *
 * An application flagged as a possible duplicate does not get its assessment
 * link automatically — the recruiter compares it against the earlier record
 * first. This is how they send it once they have decided.
 */
export function SendAssessmentButton({
  id,
  sentAt,
  hasEmail,
  fullName,
  email,
}: {
  id: string;
  sentAt?: string;
  hasEmail: boolean;
  fullName?: string;
  email?: string;
}) {
  const [at, setAt] = useState(sentAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function send() {
    if (busy) return;
    setConfirming(false);
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/send-assessment`, {});
      const data = (await res.json()) as { ok?: boolean; error?: string; interviewEmailSentAt?: string };
      if (data.ok) {
        setAt(data.interviewEmailSentAt || new Date().toISOString());
      } else if (data.error === "already_sent") {
        setAt(data.interviewEmailSentAt || new Date().toISOString());
      } else {
        setError(
          data.error === "no_email"
            ? "No email address on this application."
            : `Could not send (${data.error ?? "unknown"}).`,
        );
      }
    } catch {
      setError("Could not send. Please try again.");
    }
    setBusy(false);
  }

  if (at) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        <Icon name="checkCircle" className="h-3.5 w-3.5" />
        Assessment sent
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy || !hasEmail}
        title={hasEmail ? undefined : "No email address on this application"}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-navy-900 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="mail" className="h-3.5 w-3.5" />
        {busy ? "Sending…" : "Send assessment link"}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}

      <ConfirmDialog
        open={confirming}
        icon="mail"
        title="Send the assessment link?"
        confirmLabel="Send assessment"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={send}
        body={
          <>
            <strong className="text-navy-900">{fullName || "This candidate"}</strong> will be
            emailed their personal assessment link at{" "}
            <strong className="break-all text-navy-900">{email}</strong>.
          </>
        }
      />
    </div>
  );
}
