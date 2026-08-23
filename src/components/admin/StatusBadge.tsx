import type { CandidateStatus, VoiceStatus } from "@/lib/candidateStatus";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  "New Application": "bg-blue-50 text-blue-700 border-blue-200",
  "Interview Invitation Sent": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Interview Pending": "bg-amber-50 text-amber-700 border-amber-200",
  "Interview Completed": "bg-teal-50 text-teal-700 border-teal-200",
  "Under Review": "bg-purple-50 text-purple-700 border-purple-200",
  Accepted: "bg-green-50 text-green-700 border-green-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const cls = STATUS_STYLES[status] ?? "bg-navy-50 text-navy-600 border-navy-200";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

/**
 * Three states, not two.
 *
 * "Not completed" lumped together two very different candidates: one who never
 * opened the link at all, and one who opened it and stopped. The first is a
 * delivery or attention problem, the second is the assessment itself — and
 * they need opposite responses, so the badge has to tell them apart.
 */
/**
 * Shown when someone reached step one of the form and never submitted it.
 *
 * They are a real lead — you have their name, email and phone — but no
 * position, languages or experience, and no consent. Worth telling apart from
 * a complete application at a glance.
 */
export function IncompleteFormBadge() {
  return (
    <span
      title="Reached the first step but never submitted the application"
      className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800"
    >
      Form not completed
    </span>
  );
}

export function InterviewBadge({ completed, opened }: { completed: boolean; opened?: boolean }) {
  if (completed) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        Completed
      </span>
    );
  }
  if (opened) {
    return (
      <span
        title="They opened the assessment but did not submit it"
        className="inline-flex items-center whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800"
      >
        Opened, not submitted
      </span>
    );
  }
  return (
    <span
      title="They have not opened the assessment link"
      className="inline-flex items-center whitespace-nowrap rounded-full border border-navy-200 bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-500"
    >
      Not opened
    </span>
  );
}

const VOICE_STYLES: Record<VoiceStatus, string> = {
  "Voice Assessment Not Requested": "bg-navy-50 text-navy-500 border-navy-200",
  "Voice Assessment Requested": "bg-amber-50 text-amber-700 border-amber-200",
  "Voice Recording Received": "bg-blue-50 text-blue-700 border-blue-200",
  "Voice Assessment Passed": "bg-green-50 text-green-700 border-green-200",
  "Voice Assessment Failed": "bg-red-50 text-red-700 border-red-200",
};

export function VoiceBadge({ status }: { status: VoiceStatus }) {
  const cls = VOICE_STYLES[status] ?? "bg-navy-50 text-navy-500 border-navy-200";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export function SuccessMessageBadge({ sent }: { sent: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        sent ? "bg-green-50 text-green-700 border-green-200" : "bg-navy-50 text-navy-500 border-navy-200"
      }`}
    >
      {sent ? "Success Message Sent" : "Success Message Not Sent"}
    </span>
  );
}
