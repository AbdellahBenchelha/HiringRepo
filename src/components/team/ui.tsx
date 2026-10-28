import type { ReactNode } from "react";
import {
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  WORK_STATUS_LABEL,
  type TicketPriority,
  type TicketStatus,
  type WorkStatus,
} from "@/lib/teamShared";

/** Small presentational pieces shared by the portal and the Admin Panel's team tabs. */

export function Stat({ label, value, hint, strong }: { label: string; value: ReactNode; hint?: ReactNode; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${strong ? "border-brand-300 bg-brand-50" : "border-cream-300 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-navy-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-navy-500">{hint}</p> : null}
    </div>
  );
}

const WORK_TONE: Record<WorkStatus, string> = {
  worked: "bg-green-100 text-green-800",
  extra: "bg-blue-100 text-blue-800",
  absent: "bg-red-100 text-red-800",
  dayoff: "bg-cream-200 text-navy-700",
  no_checkin: "bg-amber-100 text-amber-900",
};

export function WorkPill({ status }: { status: WorkStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${WORK_TONE[status]}`}>
      {WORK_STATUS_LABEL[status]}
    </span>
  );
}

const TICKET_TONE: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-900",
  done: "bg-green-100 text-green-800",
};

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${TICKET_TONE[status]}`}>
      {TICKET_STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_TONE: Record<TicketPriority, string> = {
  low: "text-navy-400",
  normal: "text-navy-500",
  high: "text-amber-700",
  urgent: "text-red-700",
};

export function PriorityLabel({ priority }: { priority: TicketPriority }) {
  return <span className={`text-xs font-semibold ${PRIORITY_TONE[priority]}`}>{TICKET_PRIORITY_LABEL[priority]}</span>;
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold text-navy-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-cream-100 p-4 text-sm text-navy-500">{children}</p>;
}
