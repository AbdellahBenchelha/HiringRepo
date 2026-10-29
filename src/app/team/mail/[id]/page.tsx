import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/teamAuth";
import { getMail, getMailBody, markRead, unreadCount } from "@/lib/teamMail";
import { hasRemoteImages } from "@/lib/teamMailHtml";
import { PortalShell } from "@/components/team/PortalShell";
import { MailShell } from "@/components/team/MailShell";
import { MailHeader } from "@/components/team/MailHeader";
import { MailViewer } from "@/components/team/MailViewer";
import { ActionButton } from "@/components/team/ActionButton";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Email" };

const TOOL =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-navy-700 transition hover:border-brand-300 hover:bg-brand-50";

export default async function TeamMailMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const message = await getMail(id);
  if (!message || message.memberId !== member.id || !member.workEmail) notFound();
  if (!message.read) await markRead(id);
  const [body, unread] = await Promise.all([getMailBody(id), unreadCount(member.id)]);
  const inbox = message.folder === "inbox";
  const back = inbox ? "/mail" : "/mail?folder=sent";

  return (
    <PortalShell member={member} active="mail" title="Mail">
      <MailShell address={member.workEmail} folder={message.folder} unread={unread}>
        <div className="flex flex-wrap items-center gap-2 border-b border-cream-200 px-4 py-3 sm:px-5">
          <Link href={back} className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-navy-600 transition hover:bg-cream-200 hover:text-navy-900">
            <Icon name="chevronLeft" className="h-4 w-4" /> {inbox ? "Inbox" : "Sent"}
          </Link>
          <span className="flex-1" />
          {inbox ? (
            <Link href={`/mail/new?reply=${message.id}`} className={TOOL} data-mail-reply>
              <Icon name="reply" className="h-4 w-4 text-brand-600" /> Reply
            </Link>
          ) : null}
          <Link href={`/mail/new?forward=${message.id}`} className={TOOL} data-mail-forward>
            <Icon name="forward" className="h-4 w-4 text-brand-600" /> Forward
          </Link>
          {inbox ? (
            <ActionButton url={`/api/team/mail/${message.id}`} body={{ action: "unread" }} className={TOOL} after={back}>
              <Icon name="mailLine" className="h-4 w-4 text-navy-400" /> Mark unread
            </ActionButton>
          ) : null}
          <ActionButton
            url={`/api/team/mail/${message.id}`}
            body={{ action: "delete" }}
            className={`${TOOL} text-red-600 hover:border-red-200 hover:bg-red-50`}
            confirm="Delete this email? This cannot be undone."
            after={back}
          >
            <Icon name="trash" className="h-4 w-4" /> Delete
          </ActionButton>
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <MailHeader message={message} attachmentBase="/api/team/mail/attachment" timeZone={member.schedule.timeZone} />
          <MailViewer base="/api/team/mail/view" id={message.id} remoteImages={hasRemoteImages(body.html)} />
          <div className="flex flex-wrap gap-2">
            {inbox ? (
              <Link href={`/mail/new?reply=${message.id}`} className="btn-primary px-5 py-2.5">
                <Icon name="reply" className="h-4 w-4" /> Reply
              </Link>
            ) : null}
            <Link href={`/mail/new?forward=${message.id}`} className="btn-secondary px-5 py-2.5">
              <Icon name="forward" className="h-4 w-4" /> Forward
            </Link>
          </div>
        </div>
      </MailShell>
    </PortalShell>
  );
}
