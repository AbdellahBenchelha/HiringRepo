import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/teamAuth";
import { listTickets, ticketUnread } from "@/lib/teamStore";
import { formatDateTime } from "@/lib/teamShared";
import { PortalShell } from "@/components/team/PortalShell";
import { Empty, PriorityLabel, TicketStatusPill } from "@/components/team/ui";

export const metadata: Metadata = { title: "Tickets" };

export default async function TeamTicketsPage() {
  const member = await requireMember();
  const tickets = await listTickets({ memberId: member.id });
  return (
    <PortalShell member={member} active="tickets" title="Tickets" intro="Tasks and messages from the team — and your questions to us.">
      <div className="mb-4 flex justify-end">
        <Link href="/tickets/new" className="btn-primary">
          New ticket
        </Link>
      </div>
      {tickets.length ? (
        <ul className="space-y-3" data-ticket-list>
          {tickets.map((t) => {
            const unread = ticketUnread(t, "member");
            return (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className={`block rounded-2xl border bg-white p-4 transition hover:border-brand-300 ${
                    unread ? "border-brand-300 shadow-soft" : "border-cream-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-navy-400">#{t.number}</span>
                    <TicketStatusPill status={t.status} />
                    <PriorityLabel priority={t.priority} />
                    {unread ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">New</span> : null}
                    <span className="ml-auto text-xs text-navy-400">{formatDateTime(t.updatedAt)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-navy-900">{t.subject}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm text-navy-500">{t.messages.at(-1)?.body}</p>
                  <p className="mt-1 text-xs text-navy-400">{t.createdBy === "admin" ? "From the WorkRoute team" : "Opened by you"}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>No tickets yet. When the team sends you one, it appears here and you get an email.</Empty>
      )}
    </PortalShell>
  );
}
