import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMember, getTicket, ticketUnread, updateTicket } from "@/lib/teamStore";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABEL, TICKET_STATUSES, TICKET_STATUS_LABEL, formatDateTime } from "@/lib/teamShared";
import { TicketThread } from "@/components/team/TicketThread";
import { TicketForm } from "@/components/team/TicketForm";
import { AdminAction } from "@/components/admin/team/AdminAction";
import { PriorityLabel, TicketStatusPill } from "@/components/team/ui";

export const metadata: Metadata = { title: "Team ticket", robots: { index: false, follow: false } };

export default async function AdminTeamTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();
  const member = await getMember(ticket.memberId);
  if (ticketUnread(ticket, "admin")) await updateTicket(id, { readBy: "admin" });
  const api = `/api/admin/team/tickets/${id}`;

  return (
    <AdminShell>
      <header className="mb-6">
        <p className="text-sm">
          <Link href="/admin/team-tickets" className="font-semibold text-navy-500 hover:text-navy-900">
            ← Team tickets
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">
          #{ticket.number} {ticket.subject}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <TicketStatusPill status={ticket.status} />
          <PriorityLabel priority={ticket.priority} />
          <span className="text-navy-500">
            {member ? (
              <Link href={`/admin/team/${member.id}?tab=tickets`} className="font-semibold hover:underline">
                {member.fullName}
              </Link>
            ) : (
              "Unknown member"
            )}{" "}
            · {ticket.createdBy === "member" ? "opened by the member" : "sent by you"} · {formatDateTime(ticket.createdAt)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TICKET_STATUSES.filter((s) => s !== ticket.status).map((s) => (
            <AdminAction key={s} url={api} body={{ status: s }}>
              Mark {TICKET_STATUS_LABEL[s].toLowerCase()}
            </AdminAction>
          ))}
          {TICKET_PRIORITIES.filter((p) => p !== ticket.priority).map((p) => (
            <AdminAction key={p} url={api} body={{ priority: p }} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-navy-500 hover:bg-navy-50">
              Priority: {TICKET_PRIORITY_LABEL[p]}
            </AdminAction>
          ))}
        </div>
      </header>
      <div className="card">
        <TicketThread ticket={ticket} side="admin" memberName={member?.fullName ?? "Member"} />
      </div>
      <div className="card mt-6">
        <TicketForm url={api} side="admin" mode="reply" />
      </div>
    </AdminShell>
  );
}
