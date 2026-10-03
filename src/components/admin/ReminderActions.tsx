"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Chase a candidate who has not finished their assessment.
 *
 * By email only — WhatsApp reminders were removed. Every reminder is logged,
 * with a count, so the recruiter can see what a candidate has already had.
 *
 * Shown only where it means something — hidden once the assessment is done.
 */

function fmtShort(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export interface ReminderActionsProps {
  id: string;
  fullName: string;
  position?: string;
  interviewLink: string;
  interviewCompleted: boolean;
  interviewEmailSentAt?: string;
  /** False when they reached step one but never submitted the application. */
  formCompleted?: boolean;
  hasEmail: boolean;
  email?: string;
  reminderEmailSentAt?: string;
  reminderEmailCount?: number;
}

export function ReminderActions(props: ReminderActionsProps) {
  const [emailAt, setEmailAt] = useState(props.reminderEmailSentAt);
  const [emailCount, setEmailCount] = useState(props.reminderEmailCount ?? 0);
  const [busy, setBusy] = useState<"email" | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<"email" | null>(null);

  // Nothing to chase once the assessment is done. Otherwise there is a reason
  // to chase if they were invited, or if they never finished the form at all.
  if (props.interviewCompleted) return null;
  if (!props.interviewEmailSentAt && props.formCompleted !== false) return null;

  /** A second chase within a day is usually a slip, so confirm it. */
  function tooSoon(at?: string): boolean {
    if (!at) return false;
    return Date.now() - new Date(at).getTime() < 24 * 60 * 60 * 1000;
  }

  async function sendEmailReminder() {
    if (busy) return;
    setConfirming(null);
    setBusy("email");
    setError("");
    try {
      const res = await adminPost(`/api/admin/candidates/${props.id}/reminder`, { channel: "email" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reminderEmailSentAt?: string;
        reminderEmailCount?: number;
      };
      if (data.ok) {
        setEmailAt(data.reminderEmailSentAt || new Date().toISOString());
        setEmailCount(data.reminderEmailCount ?? emailCount + 1);
      } else {
        setError(
          data.error === "no_email"
            ? "No email address on file."
            : data.error === "already_completed"
              ? "They have already completed it."
              : `Could not send (${data.error ?? "unknown"}).`,
        );
      }
    } catch {
      setError("Could not send. Please try again.");
    }
    setBusy(null);
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setConfirming("email")}
          disabled={busy !== null || !props.hasEmail}
          title={props.hasEmail ? "Email a reminder" : "No email address on file"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="mail" className="h-3.5 w-3.5" />
          {busy === "email" ? "Sending…" : "Remind by email"}
        </button>
      </div>

      {emailAt ? (
        <p className="mt-1.5 text-[11px] leading-snug text-navy-500">
          Email {fmtShort(emailAt)}
          {emailCount > 1 ? ` ×${emailCount}` : ""}
        </p>
      ) : null}

      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}

      <ConfirmDialog
        open={confirming === "email"}
        icon="mail"
        title="Send a reminder email?"
        confirmLabel="Send reminder"
        busy={busy === "email"}
        warning={tooSoon(emailAt) ? "You already emailed this candidate a reminder today." : undefined}
        onCancel={() => setConfirming(null)}
        onConfirm={sendEmailReminder}
        body={
          <>
            A reminder will be emailed to{" "}
            <strong className="text-navy-900">{props.fullName || "this candidate"}</strong> at{" "}
            <strong className="break-all text-navy-900">{props.email}</strong>, with their
            assessment link.
          </>
        }
      />
    </div>
  );
}
