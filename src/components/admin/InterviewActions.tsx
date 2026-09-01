"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { SuccessMessageBadge, VoiceBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { VOICE_STATUSES, type VoiceStatus } from "@/lib/candidateStatus";
import { adminPost } from "@/lib/adminClient";
import {
  LENGTH_HARD_LIMIT,
  LENGTH_MAX,
  renderTemplate,
  type TemplateKey,
  type TemplateVars,
} from "@/lib/messageTemplates";

export interface InterviewActionsProps {
  id: string;
  fullName: string;
  phone: string;
  successMessageSentAt?: string;
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
  /** Saved wording for both messages, resolved on the server. */
  templates: Record<TemplateKey, string>;
  /** This candidate's substitution values. */
  vars: TemplateVars;
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const DIALOG: Record<TemplateKey, { title: string; confirmLabel: string; endpoint: string }> = {
  interviewSuccess: {
    title: "Send the interview success message?",
    confirmLabel: "Open WhatsApp",
    endpoint: "success-message",
  },
  voiceAssessment: {
    title: "Send the voice assessment request?",
    confirmLabel: "Open WhatsApp",
    endpoint: "voice-request",
  },
};

export function InterviewActions(props: InterviewActionsProps) {
  const [successAt, setSuccessAt] = useState(props.successMessageSentAt);
  const [voiceAt, setVoiceAt] = useState(props.voiceRequestedAt);
  const voiceStatus = props.voiceStatus ?? "Voice Assessment Not Requested";
  const [error, setError] = useState("");

  // Which message is being confirmed, the text as it currently stands, and
  // whether the recruiter has opened it up for a one-off edit.
  const [confirming, setConfirming] = useState<TemplateKey | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // Opening the editor should land the caret at the end, ready to add a line.
  useEffect(() => {
    if (!editing) return;
    const el = draftRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const digits = props.phone.replace(/[^\d]/g, "");
  const phoneValid = digits.length >= 8;

  function ask(key: TemplateKey) {
    setError("");
    setDraft(renderTemplate(props.templates[key], props.vars));
    setEditing(false);
    setConfirming(key);
  }

  /**
   * Open WhatsApp, then log the send.
   *
   * window.open has to run before the first await or the popup blocker
   * suppresses it — a window opened after an await is no longer attributable
   * to the click that started it.
   */
  function send(key: TemplateKey) {
    if (busy || !phoneValid) return;
    setBusy(true);
    const win = window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(draft)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setConfirming(null);
    if (!win) setError("Pop-up blocked — allow pop-ups to open WhatsApp.");

    void adminPost(`/api/admin/candidates/${props.id}/${DIALOG[key].endpoint}`, {})
      .then(() => {
        if (key === "interviewSuccess") {
          setSuccessAt(new Date().toISOString());
        } else {
          setVoiceAt(new Date().toISOString());
          // Matches what the server does on a voice request: an untouched
          // status moves to Requested, anything further along is left alone.
          if (voiceStatus === "Voice Assessment Not Requested") {
            props.onVoiceStatusChange("Voice Assessment Requested");
          }
        }
      })
      .catch(() => {
        /* the message still opened; the log is secondary */
      })
      .finally(() => setBusy(false));
  }

  async function changeVoiceStatus(status: VoiceStatus) {
    props.onVoiceStatusChange(status);
    try {
      await adminPost(`/api/admin/candidates/${props.id}/voice-status`, { status });
    } catch {
      /* optimistic */
    }
  }

  const tooLong = draft.length > LENGTH_HARD_LIMIT;

  return (
    <div className="space-y-2.5">
      {/* Success message */}
      <div className="flex flex-wrap items-center gap-2">
        <SuccessMessageBadge sent={!!successAt} />
        <button
          type="button"
          onClick={() => ask("interviewSuccess")}
          disabled={!phoneValid}
          title="Send interview success message via WhatsApp"
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Icon name="chat" className="h-4 w-4" /> Success Message
        </button>
        {successAt ? <span className="text-[11px] text-navy-400">{fmt(successAt)}</span> : null}
      </div>

      {/* Voice assessment */}
      <div className="flex flex-wrap items-center gap-2">
        <VoiceBadge status={voiceStatus} />
        <button
          type="button"
          onClick={() => ask("voiceAssessment")}
          disabled={!phoneValid}
          title="Send voice assessment request via WhatsApp"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Icon name="chat" className="h-4 w-4" /> Voice Assessment
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

      {!phoneValid ? (
        <p className="text-[11px] font-medium text-red-500">No valid WhatsApp number.</p>
      ) : null}
      {error ? <p className="text-[11px] font-medium text-red-500">{error}</p> : null}

      <ConfirmDialog
        open={confirming !== null}
        size="lg"
        icon="chat"
        title={confirming ? DIALOG[confirming].title : ""}
        confirmLabel={confirming ? DIALOG[confirming].confirmLabel : "Send"}
        busy={busy}
        warning={tooLong ? "This message may be too long for WhatsApp to accept in one link." : undefined}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && send(confirming)}
        footer={
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="rounded-full border border-navy-200 px-3 py-1.5 text-xs font-semibold text-navy-600 transition hover:bg-navy-50"
          >
            {editing ? "Done editing" : "Edit for this candidate"}
          </button>
        }
        body={
          <div className="mt-1">
            <p className="mb-2.5">
              WhatsApp will open with this message to{" "}
              <strong className="text-navy-900">{props.fullName || "this candidate"}</strong> on{" "}
              <strong className="text-navy-900">{props.phone}</strong>. You still have to press send in
              WhatsApp.
            </p>

            {editing ? (
              <>
                <textarea
                  ref={draftRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={LENGTH_MAX}
                  rows={14}
                  aria-label="Message text"
                  className="w-full rounded-xl border border-navy-200 bg-white p-3 font-mono text-[12.5px] leading-relaxed text-navy-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <p className="mt-1.5 text-xs text-navy-400">
                  {draft.length} characters · this edit applies to this one message only and does not change
                  your saved wording.
                </p>
              </>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-2xl bg-[#e5ddd5] p-3.5">
                <div className="rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3.5 py-2.5 shadow-sm">
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-navy-900">
                    {draft}
                  </p>
                </div>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
