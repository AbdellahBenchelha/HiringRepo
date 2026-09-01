"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { VoiceBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { VOICE_STATUSES, type VoiceStatus } from "@/lib/candidateStatus";
import { adminPost } from "@/lib/adminClient";

/**
 * Follow-up on a completed interview: one email, one status to track.
 *
 * The congratulations message and the voice-assessment request used to be two
 * separate WhatsApp texts the recruiter sent by hand. They are now a single
 * email, sent by the server the moment this is confirmed — no wording to
 * preview or edit here, because the email is fixed in code, the way the offer
 * and ID-verification emails already are.
 */

export interface InterviewActionsProps {
  id: string;
  fullName: string;
  email: string;
  voiceRequestedAt?: string;
  /**
   * Owned by the row, not by this component.
   *
   * Passing the assessment is what opens the offer panel in the profile
   * dialog, which is a different component in a different cell. When this held
   * its own copy, marking someone passed here changed nothing the dialog could
   * see, so the offer form stayed hidden until the page was reloaded — and
   * nobody reloads between setting a status and clicking the button beside it.
   */
  voiceStatus?: VoiceStatus;
  onVoiceStatusChange: (status: VoiceStatus) => void;
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function InterviewActions(props: InterviewActionsProps) {
  const [voiceAt, setVoiceAt] = useState(props.voiceRequestedAt);
  const voiceStatus = props.voiceStatus ?? "Voice Assessment Not Requested";
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  /** "sent", or the reason the email did not go out. */
  const [emailed, setEmailed] = useState("");

  const hasEmail = props.email.includes("@");

  async function send() {
    if (busy) return;
    setBusy(true);
    setConfirming(false);
    try {
      const res = await adminPost(`/api/admin/candidates/${props.id}/voice-request`, {});
      const data = (await res.json()) as {
        ok?: boolean;
        voiceRequestedAt?: string;
        voiceStatus?: VoiceStatus;
        emailed?: boolean;
        emailError?: string;
      };
      if (data.ok) {
        setVoiceAt(data.voiceRequestedAt);
        // Matches what the server does: an untouched status moves to
        // Requested, anything further along is left alone.
        if (voiceStatus === "Voice Assessment Not Requested") {
          props.onVoiceStatusChange("Voice Assessment Requested");
        }
        setEmailed(data.emailed ? "sent" : (data.emailError ?? "failed"));
      } else {
        setEmailed("failed");
      }
    } catch {
      setEmailed("failed");
    }
    setBusy(false);
  }

  async function changeVoiceStatus(status: VoiceStatus) {
    props.onVoiceStatusChange(status);
    try {
      await adminPost(`/api/admin/candidates/${props.id}/voice-status`, { status });
    } catch {
      /* optimistic */
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <VoiceBadge status={voiceStatus} />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!hasEmail || busy}
          title="Email the voice assessment request"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Icon name="mail" className="h-4 w-4" /> Send Voice Assessment
        </button>
        {voiceAt ? <span className="text-[11px] text-navy-400">{fmt(voiceAt)}</span> : null}
      </div>

      {/* Manual voice status */}
      <select
        value={voiceStatus}
        onChange={(e) => changeVoiceStatus(e.target.value as VoiceStatus)}
        aria-label="Update voice assessment status"
        className="select !w-auto !py-1.5 text-xs"
      >
        {VOICE_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {!hasEmail ? <p className="text-[11px] font-medium text-red-500">No email on file.</p> : null}

      {emailed === "sent" ? (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-green-700">
          <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Emailed.
        </p>
      ) : emailed ? (
        <p className="text-[11px] font-medium text-amber-700">
          Recorded, but the email did not go out ({emailed}). Contact them another way, or they
          will never know to come back.
        </p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        icon="mail"
        title="Send the voice assessment request?"
        confirmLabel="Send email"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void send()}
        body={
          <>
            <strong className="text-navy-900">{props.fullName || "This candidate"}</strong> will be
            emailed at <strong className="text-navy-900">{props.email}</strong> with the
            congratulations, the voice-assessment script, and instructions to record and send it
            back on WhatsApp.
          </>
        }
      />
    </div>
  );
}
