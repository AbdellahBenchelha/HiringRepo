import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { listMembers, listTickets, ticketUnread } from "@/lib/teamStore";
import { TICKET_STATUSES, TICKET_STATUS_LABEL, formatDateTime } from "@/lib/teamShared";
import { NewTicketPanel } from "@/components/admin/team/NewTicketPanel";
import { PriorityLabel, Section, TicketStatusPill } from "@/components/team/ui";

export const metadata: Metadata = { title: "Team tickets", robots: { index: false, follow: false } };

const FILTERS = [
  { id: "waiting", label: "Waiting for you" },
  ...TICKET_STATUSES.map((s) => ({ id: s, label: TICKET_STATUS_LABEL[s] })),
  { id: "all", label: "All" },
];

export default async function AdminTeamTicketsPage({ searchParams }: { searchParams: Promise<{ f?: string; new?: string }> }) {
  await requireAdmin();
  const { f = "waiting" } = await searchParams;
  const [tickets, members] = await Promise.all([listTickets(), listMembers()]);
  const names = new Map(members.map((m) => [m.id, m.fullName]));
  const match = (t: (typeof tickets)[number]) =>
    f === "all" ? true : f === "waiting" ? ticketUnread(t, "admin") : t.status === f;
  const shown = tickets.filter(match);
  const count = (id: string) => tickets.filter((t) => (id === "all" ? true : id === "waiting" ? ticketUnread(t, "admin") : t.status === id)).length;

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Team tickets</h1>
        <p className="mt-1 text-sm text-navy-500">Tasks and messages between you and the team. Members get an email for each new ticket and reply.</p>
      </header>

      <details className="card mb-6" open={f === "new" || undefined}>
        <summary className="cursor-pointer font-display text-lg font-extrabold text-navy-900">New ticket</summary>
        <div className="mt-4">
          <NewTicketPanel
            members={members.filter((m) => m.status !== "left").map((m) => ({ id: m.id, fullName: m.fullName, loginEmail: m.loginEmail }))}
          />
        </div>
      </details>

      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((x) => (
          <Link
            key={x.id}
            href={`/admin/team-tickets?f=${x.id}`}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${f === x.id ? "bg-navy-900 text-white" : "bg-white text-navy-600 hover:bg-navy-50"}`}
          >
            {x.label} ({count(x.id)})
          </Link>
        ))}
      </div>

      <Section title={`${shown.length} ticket${shown.length === 1 ? "" : "s"}`}>
        {shown.length ? (
          <ul className="divide-y divide-navy-100" data-admin-tickets>
            {shown.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/team-tickets/${t.id}`} className="flex flex-wrap items-center gap-2 py-3 hover:bg-navy-50/50">
                  <span className="text-xs font-semibold text-navy-400">#{t.number}</span>
                  <span className="font-semibold text-navy-900">{t.subject}</span>
                  <TicketStatusPill status={t.status} />
                  <PriorityLabel priority={t.priority} />
                  {ticketUnread(t, "admin") ? <span className="rounded-full bg-red-600 px-2 text-[11px] font-bold text-white">New reply</span> : null}
                  <span className="ml-auto text-xs text-navy-500">
                    {names.get(t.memberId) ?? "Unknown"} · {t.createdBy === "member" ? "opened by member" : "sent by you"} · {formatDateTime(t.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-navy-500">Nothing here.</p>
        )}
      </Section>
    </AdminShell>
  );
}
