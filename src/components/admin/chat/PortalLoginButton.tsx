"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { AdminSessionView } from "@/lib/chat";

/**
 * An onboarding chat's portal controls, in the conversation header.
 *
 *   not on the team   Add to team — the team panel's form, filled in from
 *                     their offer, in a new tab; then back here
 *   on the team       Send portal login — emails their login (a new temporary
 *                     password) and tells them so in the chat
 *
 * The password never goes in the chat: the server emails it, and the chat
 * only says the email went out.
 */
export function PortalLoginButton({
  view,
  onSent,
}: {
  view: AdminSessionView;
  onSent: (s: AdminSessionView) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const portal = view.portal;
  if (!portal || view.status === "ended") return null;
  const m = portal.member;

  if (!m) {
    return (
      <a
        href={portal.addUrl}
        target="_blank"
        rel="noopener"
        data-portal-add
        title="Opens the team panel in a new tab. Save, then come back and press Send portal login."
        className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3.5 py-2 text-xs font-bold text-navy-700 transition hover:bg-navy-50"
      >
        <Icon name="plus" className="h-3.5 w-3.5" /> Add to team first
      </a>
    );
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/chats/${view.id}`, { action: "portalLogin", from: view.messages.length });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; session?: AdminSessionView; error?: string };
      if (data.ok && data.session) {
        onSent(data.session);
        setConfirm(false);
      } else {
        setError(
          data.error === "no_work_email"
            ? "They have no professional email yet. Add one on their team page first."
            : data.error === "too_soon"
              ? "Login details were sent less than a minute ago."
              : data.error === "not_member"
                ? "They are not on the team yet."
                : data.error === "no_key"
                  ? "Passwords cannot be stored: TEAM_BANK_KEY is not set on the server."
                  : "The email could not be sent. Try again.",
        );
      }
    } catch {
      setError("Could not reach the server.");
    }
    setBusy(false);
  }

  const again = !!m.invitedAt;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setConfirm(true);
        }}
        data-portal-login={again ? "again" : "first"}
        disabled={!m.workEmail}
        title={m.workEmail ? `Email their login for ${m.workEmail}` : "Add their professional email on their team page first"}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-navy-900 transition hover:bg-brand-400 disabled:opacity-50"
      >
        <Icon name="key" className="h-3.5 w-3.5" />
        {again ? "Send portal login again" : "Send portal login"}
      </button>
      <ConfirmDialog
        open={confirm}
        icon="key"
        title={again ? "Send the portal login again?" : "Send the portal login?"}
        confirmLabel={busy ? "Sending…" : "Send login"}
        busy={busy}
        warning={error || undefined}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void send()}
        body={
          <>
            {view.candidateName} gets an email with their professional email{" "}
            <strong className="text-navy-900">{m.workEmail}</strong> and a new temporary password (valid 7 days).
            The chat shows them a line saying the email was sent — the password is never written in the chat.
            {m.passwordSet ? (
              <span className="mt-2 block font-semibold text-amber-800">
                They already chose their own password. Sending again replaces it with a new temporary one.
              </span>
            ) : again ? (
              <span className="mt-2 block">The temporary password sent before stops working.</span>
            ) : null}
          </>
        }
      />
    </>
  );
}
