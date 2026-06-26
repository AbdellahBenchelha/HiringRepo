"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { SuccessMessageBadge, VoiceBadge } from "@/components/admin/StatusBadge";
import { VOICE_STATUSES, type VoiceStatus } from "@/lib/candidateStatus";
import { adminPost } from "@/lib/adminClient";

export interface InterviewActionsProps {
  id: string;
  fullName: string;
  phone: string;
  successMessageSentAt?: string;
  voiceRequestedAt?: string;
  voiceStatus?: VoiceStatus;
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function successMessage(name: string): string {
  return (
    `Hello ${name},\n\n` +
    `Congratulations! You have successfully completed the online interview, and you performed very well.\n\n` +
    `Thank you for taking the time to answer all the interview questions. We are pleased to inform you that you have passed this stage of our recruitment process.\n\n` +
    `The next step will be a short voice assessment. We will send you the instructions shortly.\n\n` +
    `Best regards,\nRecruitment Team`
  );
}

function voiceMessage(name: string): string {
  return (
    `Hello ${name},\n\n` +
    `You have now reached the voice-assessment stage of our recruitment process.\n\n` +
    `To help us evaluate your pronunciation, communication skills, fluency, and voice clarity, please record a voice message while reading the text below.\n\n` +
    `Please read slowly, clearly, and naturally:\n\n` +
    `"Hello, my name is ${name}. I am interested in joining your customer-support team. I enjoy communicating with customers, listening carefully to their concerns, and helping them find the best possible solution. I understand that professional customer service requires patience, respect, clear communication, and a positive attitude. I am comfortable working as part of a team, following company procedures, and learning new skills. I am motivated to provide customers with a helpful and professional experience."\n\n` +
    `After reading the complete text, please send the audio recording directly to us through WhatsApp.\n\n` +
    `Please record the message in a quiet environment and make sure your voice is clear.\n\n` +
    `Best regards,\nRecruitment Team`
  );
}

export function InterviewActions(props: InterviewActionsProps) {
  const name = props.fullName || "there";
  const [successAt, setSuccessAt] = useState(props.successMessageSentAt);
  const [voiceAt, setVoiceAt] = useState(props.voiceRequestedAt);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(
    props.voiceStatus ?? "Voice Assessment Not Requested",
  );
  const [error, setError] = useState("");

  const digits = props.phone.replace(/[^\d]/g, "");
  const phoneValid = digits.length >= 8;

  function openWhatsApp(text: string) {
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function sendSuccess() {
    if (!phoneValid) {
      setError("No valid WhatsApp number for this candidate.");
      return;
    }
    setError("");
    try {
      await adminPost(`/api/admin/candidates/${props.id}/success-message`, {});
      setSuccessAt(new Date().toISOString());
    } catch {
      /* optimistic */
    }
    openWhatsApp(successMessage(name));
  }

  async function sendVoice() {
    if (!phoneValid) {
      setError("No valid WhatsApp number for this candidate.");
      return;
    }
    setError("");
    try {
      await adminPost(`/api/admin/candidates/${props.id}/voice-request`, {});
      setVoiceAt(new Date().toISOString());
      setVoiceStatus((s) => (s === "Voice Assessment Not Requested" ? "Voice Assessment Requested" : s));
    } catch {
      /* optimistic */
    }
    openWhatsApp(voiceMessage(name));
  }

  async function changeVoiceStatus(status: VoiceStatus) {
    setVoiceStatus(status);
    try {
      await adminPost(`/api/admin/candidates/${props.id}/voice-status`, { status });
    } catch {
      /* optimistic */
    }
  }

  return (
    <div className="space-y-2.5">
      {/* Success message */}
      <div className="flex flex-wrap items-center gap-2">
        <SuccessMessageBadge sent={!!successAt} />
        <button
          type="button"
          onClick={sendSuccess}
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
          onClick={sendVoice}
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
    </div>
  );
}
