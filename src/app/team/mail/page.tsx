import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/teamAuth";
import { mutateMember } from "@/lib/teamStore";
import { listMail, unreadCount, type MailMessage } from "@/lib/teamMail";
import { PortalShell } from "@/components/team/PortalShell";
import { MailShell } from "@/components/team/MailShell";
import { MailList } from "@/components/team/MailList";
import { MailRefresh } from "@/components/team/MailRefresh";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Mail" };

function matches(m: MailMessage, q: string): boolean {
  const hay = [m.subject, m.snippet, m.from.name, m.from.address, ...m.to.flatMap((a) => [a.name, a.address])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export default async function TeamMailPage({ searchParams }: { searchParams: Promise<{ folder?: string; sent?: string; q?: string }> }) {
  const member = await requireMember();
  const { folder: f, sent, q: rawQ } = await searchParams;
  const folder = f === "sent" ? "sent" : "inbox";
  const q = (rawQ ?? "").trim().slice(0, 100);

  // Opening Mail is the "open your mailbox" step of Get started.
  if (member.workEmail && !member.onboarding?.mailboxOpenedAt) {
    await mutateMember(member.id, (m) => {
      m.onboarding = { ...(m.onboarding ?? {}), mailboxOpenedAt: new Date().toISOString() };
    });
  }

  if (!member.workEmail) {
    return (
      <PortalShell member={member} active="mail" title="Mail">
        <p className="rounded-xl bg-cream-100 p-4 text-sm text-navy-500">
          Your @workroute.team address is being set up. Your mailbox will appear here.
        </p>
      </PortalShell>
    );
  }

  const [all, unread] = await Promise.all([listMail(member.id, folder), unreadCount(member.id)]);
  const messages = q ? all.filter((m) => matches(m, q)) : all;
  const label = folder === "inbox" ? "Inbox" : "Sent";
  const summary = q
    ? `${messages.length} result${messages.length === 1 ? "" : "s"} for “${q}”`
    : folder === "inbox"
      ? `${all.length} email${all.length === 1 ? "" : "s"}${unread ? ` · ${unread} unread` : ""}`
      : `${all.length} sent`;

  return (
    <PortalShell member={member} active="mail" title="Mail" wide hideTitle>
      <MailShell address={member.workEmail} folder={folder} unread={unread}>
        <div className="flex flex-wrap items-center gap-3 border-b border-cream-200 px-4 py-3 sm:px-5">
          <div className="mr-auto min-w-0">
            <h2 className="font-display text-xl font-extrabold text-navy-900">{label}</h2>
            <p className="text-xs text-navy-400" data-mail-summary>
              {summary}
            </p>
          </div>
          <form action="/mail" method="get" role="search" className="order-last w-full sm:order-none sm:w-64">
            {folder === "sent" ? <input type="hidden" name="folder" value="sent" /> : null}
            <label htmlFor="mail-search" className="sr-only">
              Search {label.toLowerCase()}
            </label>
            <span className="relative block">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
              <input
                id="mail-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={`Search ${label.toLowerCase()}`}
                className="h-10 w-full rounded-xl border border-cream-300 bg-cream-50 pl-9 pr-3 text-sm text-navy-900 transition placeholder:text-navy-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-200"
              />
            </span>
          </form>
          <MailRefresh />
        </div>
        {sent ? (
          <p className="flex items-center gap-2 border-b border-green-100 bg-green-50 px-5 py-2.5 text-sm font-medium text-green-800" role="status">
            <Icon name="checkCircle" className="h-4 w-4" /> Your email was sent.
          </p>
        ) : null}
        {q ? (
          <p className="border-b border-cream-200 bg-cream-50 px-5 py-2 text-xs text-navy-500">
            <Link href={folder === "sent" ? "/mail?folder=sent" : "/mail"} className="font-semibold text-brand-700 hover:underline">
              Clear search
            </Link>
          </p>
        ) : null}
        <MailList
          messages={messages}
          hrefFor={(m) => `/mail/${m.id}`}
          timeZone={member.schedule.timeZone}
          framed={false}
          empty={
            q
              ? "No email matches your search."
              : folder === "inbox"
                ? "No email yet. Mail sent to your address appears here within seconds."
                : "You have not sent any email yet."
          }
        />
      </MailShell>
    </PortalShell>
  );
}
