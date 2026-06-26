import type { CandidateStatus } from "@/lib/candidateStatus";

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

export function InterviewBadge({ completed }: { completed: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        completed ? "bg-green-50 text-green-700 border-green-200" : "bg-navy-50 text-navy-500 border-navy-200"
      }`}
    >
      {completed ? "Completed" : "Not completed"}
    </span>
  );
}
