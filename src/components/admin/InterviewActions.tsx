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
  /**
   * Whether they have actually opened the recording page, and how often.
   *
   * The distinction the recruiter needs before chasing: someone who opened it
   * and stopped is putting it off, someone who never opened it may not have
   * had the email at all. A second copy of the same message helps the first
   * and does nothing for the second.
   */
  voiceOpenedAt?: string;
  voiceOpenCount?: number;
  /** Reminders already sent about this recording. */
  voiceReminderSentAt?: string;
  voiceReminderCount?: number;
  /** True while a recording has been asked for and none has arrived. */
  voiceNeeded?: boolean;
  onVoiceReminder?: (patch: { voiceReminderSentAt?: string; voiceReminderCount?: number }) => void;
}

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

export function InterviewActions(props: InterviewActionsProps) {
  const [voiceAt, setVoiceAt] = useState(props.voiceRequestedAt);
  const voiceStatus = props.voiceStatus ?? "Voice Assessment Not Requested";
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  /** "sent", or the reason the email did not go out. */
  const [emailed, setEmailed] = useState("");
  const [remindAt, setRemindAt] = useState(props.voiceReminderSentAt);
  const [remindCount, setRemindCount] = useState(props.voiceReminderCount ?? 0);
  const [remindConfirm, setRemindConfirm] = useState(false);
  const [reminded, setReminded] = useState("");

  const hasEmail = props.email.includes("@");
  const opened = !!props.voiceOpenedAt;

  /** A second chase within a day is usually a slip, so it is confirmed. */
  const remindedRecently =
    !!remindAt && Date.now() - new Date(remindAt).getTime() < 24 * 60 * 60 * 1000;

  async function remind() {
    if (busy) return;
    setBusy(true);
    setRemindConfirm(false);
    setReminded("");
    try {
      const res = await adminPost(`/api/admin/candidates/${props.id}/voice-reminder`, {});
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        voiceReminderSentAt?: string;
        voiceReminderCount?: number;
      };
      if (data.ok) {
        setRemindAt(data.voiceReminderSentAt);
        setRemindCount(data.voiceReminderCount ?? remindCount + 1);
        setReminded("sent");
        props.onVoiceReminder?.({
          voiceReminderSentAt: data.voiceReminderSentAt,
          voiceReminderCount: data.voiceReminderCount,
        });
      } else {
        setReminded(data.error ?? "failed");
      }
    } catch {
      setReminded("failed");
    }
    setBusy(false);
  }

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
      <div className="flex max-w-[19rem] flex-wrap items-center gap-2">
        <VoiceBadge status={voiceStatus} />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!hasEmail || busy}
          title="Email the voice assessment request"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {/* Short on purpose. The cell already sits under a "Voice
              assessment" header beside the status, and the long label ran
              under the sticky results column where it was unreadable. */}
          <Icon name="mail" className="h-4 w-4" /> {voiceAt ? "Send again" : "Send request"}
        </button>
        {/* Short here, full in the profile. The long form ran under the
            sticky Results column and lost its year. */}
        {voiceAt ? (
          <span className="text-[11px] text-navy-400" title={fmt(voiceAt)}>
            {fmtShort(voiceAt)}
          </span>
        ) : null}
      </div>

      {/* Asked and still waiting: say whether they have seen the page, and
          offer the chase. Someone who opened it and stopped needs a nudge;
          someone who never opened it may never have had the email, and a
          second copy of the same message is the wrong answer for them — but
          knowing which is which is the whole point of showing it. */}
      {props.voiceNeeded && voiceAt ? (
        <div className="flex max-w-[19rem] flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              opened
                ? "border-navy-200 bg-navy-50 text-navy-600"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
            title={
              opened
                ? `Opened the recording page ${props.voiceOpenCount ?? 1} time${(props.voiceOpenCount ?? 1) === 1 ? "" : "s"}`
                : "They have not opened the recording page at all — check the email reached them"
            }
          >
            <Icon name={opened ? "checkCircle" : "close"} className="h-3 w-3" />
            {opened ? `Opened ${fmtShort(props.voiceOpenedAt)}` : "Not opened"}
          </span>

          <button
            type="button"
            onClick={() => (remindedRecently ? setRemindConfirm(true) : void remind())}
            disabled={!hasEmail || busy}
            title="Email a reminder about the outstanding recording"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <Icon name="mail" className="h-3.5 w-3.5" />
            Remind
          </button>

          {remindCount ? (
            <span className="text-[11px] text-navy-400">
              {remindCount}× · {fmtShort(remindAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      {reminded === "sent" ? (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-green-700">
          <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Reminder emailed.
        </p>
      ) : reminded ? (
        <p className="text-[11px] font-medium text-amber-700">
          Reminder not sent ({reminded}).
        </p>
      ) : null}

      {/* Manual voice status */}
      <select
        value={voiceStatus}
        onChange={(e) => changeVoiceStatus(e.target.value as VoiceStatus)}
        aria-label="Update voice assessment status"
        className="select !w-auto max-w-[19rem] !py-1.5 text-xs"
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

      {/* Chasing twice in a day is usually a slip of the hand, not a decision. */}
      <ConfirmDialog
        open={remindConfirm}
        icon="mail"
        title="Send another reminder?"
        confirmLabel="Send reminder"
        busy={busy}
        warning={`The last one went out on ${fmt(remindAt)}.`}
        onCancel={() => setRemindConfirm(false)}
        onConfirm={() => void remind()}
        body={
          <>
            <strong className="text-navy-900">{props.fullName || "This candidate"}</strong> has
            already been reminded {remindCount === 1 ? "once" : `${remindCount} times`} about their
            voice assessment.
            {opened
              ? " They have opened the page, so they have seen the request."
              : " They have never opened the page, so a third copy of the same email may not be what is missing."}
          </>
        }
      />

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
            congratulations, the voice-assessment script, and a link to their own assessment page
            to record it on. Sending this again reopens that step for them, and keeps any
            recording they have already sent.
          </>
        }
      />
    </div>
  );
}
