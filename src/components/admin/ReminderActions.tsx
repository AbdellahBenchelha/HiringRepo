"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { siteConfig } from "@/config/site";

/**
 * Chase a candidate who has not finished their assessment.
 *
 * Two channels, because they fail differently. Email is reliable to send but
 * easy to ignore; WhatsApp gets read but has to be sent by hand. Both are
 * logged separately so the recruiter can see what a candidate has already had.
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

/** Message opened in WhatsApp. Kept short — long pastes read as spam. */
export function buildReminderWhatsApp(name: string, link: string, position?: string): string {
  return (
    `Hello ${name},\n\n` +
    `This is a friendly reminder from ${siteConfig.company.name}. ` +
    `You haven't completed your online assessment${position ? ` for the ${position} role` : ""} yet, ` +
    `and your place is still open.\n\n` +
    `It takes about 20-30 minutes. Here is your personal link:\n${link}\n\n` +
    `Please complete it when you have a quiet moment — once you submit, our team will review ` +
    `your answers and get back to you.\n\n` +
    `If you are no longer interested, just let us know and we'll close your application.\n\n` +
    `Best regards,\n${siteConfig.company.name} Recruitment Team`
  );
}

export interface ReminderActionsProps {
  id: string;
  fullName: string;
  phone: string;
  position?: string;
  interviewLink: string;
  interviewCompleted: boolean;
  interviewEmailSentAt?: string;
  hasEmail: boolean;
  reminderEmailSentAt?: string;
  reminderEmailCount?: number;
  reminderWhatsAppSentAt?: string;
  reminderWhatsAppCount?: number;
}

export function ReminderActions(props: ReminderActionsProps) {
  const [emailAt, setEmailAt] = useState(props.reminderEmailSentAt);
  const [emailCount, setEmailCount] = useState(props.reminderEmailCount ?? 0);
  const [waAt, setWaAt] = useState(props.reminderWhatsAppSentAt);
  const [waCount, setWaCount] = useState(props.reminderWhatsAppCount ?? 0);
  const [busy, setBusy] = useState<"email" | "whatsapp" | null>(null);
  const [error, setError] = useState("");

  // Nothing to chase: they finished, or they were never invited.
  if (props.interviewCompleted || !props.interviewEmailSentAt) return null;

  const digits = props.phone.replace(/\D/g, "");
  const phoneValid = digits.length >= 8;

  /** A second chase within a day is usually a slip, so confirm it. */
  function tooSoon(at?: string): boolean {
    if (!at) return false;
    return Date.now() - new Date(at).getTime() < 24 * 60 * 60 * 1000;
  }

  async function sendEmailReminder() {
    if (busy) return;
    if (tooSoon(emailAt) && !window.confirm("You already emailed a reminder today. Send another?")) return;
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

  async function sendWhatsAppReminder() {
    if (busy) return;
    if (tooSoon(waAt) && !window.confirm("You already sent a WhatsApp reminder today. Send another?")) return;
    setBusy("whatsapp");
    setError("");
    // Log first, then open WhatsApp. The browser blocks a popup opened after
    // an await, so the window is opened synchronously below.
    const text = encodeURIComponent(
      buildReminderWhatsApp(props.fullName || "there", props.interviewLink, props.position),
    );
    const win = window.open(`https://wa.me/${digits}?text=${text}`, "_blank", "noopener,noreferrer");
    if (!win) setError("Pop-up blocked — allow pop-ups to open WhatsApp.");
    try {
      const res = await adminPost(`/api/admin/candidates/${props.id}/reminder`, { channel: "whatsapp" });
      const data = (await res.json()) as {
        ok?: boolean;
        reminderWhatsAppSentAt?: string;
        reminderWhatsAppCount?: number;
      };
      if (data.ok) {
        setWaAt(data.reminderWhatsAppSentAt || new Date().toISOString());
        setWaCount(data.reminderWhatsAppCount ?? waCount + 1);
      }
    } catch {
      /* the message still opened; the log is secondary */
    }
    setBusy(null);
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={sendEmailReminder}
          disabled={busy !== null || !props.hasEmail}
          title={props.hasEmail ? "Email a reminder" : "No email address on file"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="mail" className="h-3.5 w-3.5" />
          {busy === "email" ? "Sending…" : "Remind by email"}
        </button>

        <button
          type="button"
          onClick={sendWhatsAppReminder}
          disabled={busy !== null || !phoneValid}
          title={phoneValid ? "Send a reminder on WhatsApp" : "No usable phone number"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs font-bold text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="chat" className="h-3.5 w-3.5" />
          Remind on WhatsApp
        </button>
      </div>

      {emailAt || waAt ? (
        <p className="mt-1.5 text-[11px] leading-snug text-navy-500">
          {emailAt ? `Email ${fmtShort(emailAt)}${emailCount > 1 ? ` ×${emailCount}` : ""}` : null}
          {emailAt && waAt ? " · " : null}
          {waAt ? `WhatsApp ${fmtShort(waAt)}${waCount > 1 ? ` ×${waCount}` : ""}` : null}
        </p>
      ) : null}

      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
