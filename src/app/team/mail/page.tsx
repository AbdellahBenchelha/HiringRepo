import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/teamAuth";
import { mutateMember } from "@/lib/teamStore";
import { listMail, unreadCount } from "@/lib/teamMail";
import { PortalShell } from "@/components/team/PortalShell";
import { MailList } from "@/components/team/MailList";
import { MailRefresh } from "@/components/team/MailRefresh";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Mail" };

export default async function TeamMailPage({ searchParams }: { searchParams: Promise<{ folder?: string; sent?: string }> }) {
  const member = await requireMember();
  const { folder: f, sent } = await searchParams;
  const folder = f === "sent" ? "sent" : "inbox";

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

  const [messages, unread] = await Promise.all([listMail(member.id, folder), unreadCount(member.id)]);

  return (
    <PortalShell member={member} active="mail" title="Mail" intro={<>Your address: <strong className="text-navy-800">{member.workEmail}</strong></>}>
      {sent ? (
        <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800" role="status">
          Your email was sent.
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="tablist" aria-label="Folders">
          {(["inbox", "sent"] as const).map((x) => (
            <Link
              key={x}
              href={x === "inbox" ? "/mail" : "/mail?folder=sent"}
              aria-current={folder === x ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${folder === x ? "bg-navy-900 text-white" : "bg-white text-navy-600 hover:bg-cream-200"}`}
            >
              {x === "inbox" ? `Inbox${unread ? ` (${unread})` : ""}` : "Sent"}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MailRefresh />
          <Link href="/mail/new" className="btn-primary py-2" data-mail-new>
            <Icon name="pencil" className="h-4 w-4" /> New email
          </Link>
        </div>
      </div>
      <MailList
        messages={messages}
        hrefFor={(m) => `/mail/${m.id}`}
        empty={folder === "inbox" ? "No email yet. Mail sent to your address appears here within seconds." : "You have not sent any email yet."}
      />
    </PortalShell>
  );
}
