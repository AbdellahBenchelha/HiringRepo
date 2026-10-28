import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/teamAuth";
import { getTicket, ticketUnread, updateTicket } from "@/lib/teamStore";
import { formatDateTime } from "@/lib/teamShared";
import { PortalShell } from "@/components/team/PortalShell";
import { TicketThread } from "@/components/team/TicketThread";
import { TicketForm } from "@/components/team/TicketForm";
import { PriorityLabel, TicketStatusPill } from "@/components/team/ui";

export const metadata: Metadata = { title: "Ticket" };

export default async function TeamTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket || ticket.memberId !== member.id) notFound();
  if (ticketUnread(ticket, "member")) await updateTicket(id, { readBy: "member" });

  return (
    <PortalShell member={member} active="tickets" title={ticket.subject}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-navy-400">#{ticket.number}</span>
        <TicketStatusPill status={ticket.status} />
        <PriorityLabel priority={ticket.priority} />
        <span className="text-navy-400">Opened {formatDateTime(ticket.createdAt)}</span>
      </div>
      <div className="card">
        <TicketThread ticket={ticket} side="member" memberName="You" />
      </div>
      <div className="card mt-6">
        {ticket.status === "done" ? (
          <p className="mb-3 text-sm text-navy-500">This ticket is done. Writing a reply opens it again.</p>
        ) : null}
        <TicketForm url={`/api/team/tickets/${ticket.id}`} side="member" mode="reply" />
      </div>
      <p className="mt-4 text-sm">
        <Link href="/tickets" className="font-semibold text-navy-500 hover:text-navy-900">
          ← Back to tickets
        </Link>
      </p>
    </PortalShell>
  );
}
