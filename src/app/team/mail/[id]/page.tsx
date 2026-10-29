import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/teamAuth";
import { getMail, getMailBody, markRead } from "@/lib/teamMail";
import { hasRemoteImages } from "@/lib/teamMailHtml";
import { PortalShell } from "@/components/team/PortalShell";
import { MailHeader } from "@/components/team/MailHeader";
import { MailViewer } from "@/components/team/MailViewer";
import { ActionButton } from "@/components/team/ActionButton";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Email" };

export default async function TeamMailMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const message = await getMail(id);
  if (!message || message.memberId !== member.id) notFound();
  if (!message.read) await markRead(id);
  const body = await getMailBody(id);
  const back = message.folder === "sent" ? "/mail?folder=sent" : "/mail";

  return (
    <PortalShell member={member} active="mail" title="Mail">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={back} className="btn-ghost py-2">
          ← {message.folder === "sent" ? "Sent" : "Inbox"}
        </Link>
        <span className="flex-1" />
        {message.folder === "inbox" ? (
          <Link href={`/mail/new?reply=${message.id}`} className="btn-primary py-2" data-mail-reply>
            <Icon name="send" className="h-4 w-4" /> Reply
          </Link>
        ) : null}
        <Link href={`/mail/new?forward=${message.id}`} className="btn-secondary py-2" data-mail-forward>
          Forward
        </Link>
        {message.folder === "inbox" ? (
          <ActionButton url={`/api/team/mail/${message.id}`} body={{ action: "unread" }} className="btn-ghost py-2" after={back}>
            Mark unread
          </ActionButton>
        ) : null}
        <ActionButton
          url={`/api/team/mail/${message.id}`}
          body={{ action: "delete" }}
          className="btn-ghost py-2 text-red-600"
          confirm="Delete this email? This cannot be undone."
          after={back}
        >
          <Icon name="trash" className="h-4 w-4" /> Delete
        </ActionButton>
      </div>
      <div className="card space-y-4">
        <MailHeader message={message} attachmentBase="/api/team/mail/attachment" />
        <MailViewer base="/api/team/mail/view" id={message.id} remoteImages={hasRemoteImages(body.html)} />
      </div>
    </PortalShell>
  );
}
