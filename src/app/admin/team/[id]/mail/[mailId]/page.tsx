import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMember, mutateMember } from "@/lib/teamStore";
import { getMail, getMailBody } from "@/lib/teamMail";
import { hasRemoteImages } from "@/lib/teamMailHtml";
import { MailHeader } from "@/components/team/MailHeader";
import { MailViewer } from "@/components/team/MailViewer";

export const metadata: Metadata = { title: "Team mail", robots: { index: false, follow: false } };

/**
 * One member's email, read-only. Opening it is recorded on the member (who,
 * when, which email), and it is not marked read — the member still sees it
 * as new.
 */
export default async function AdminTeamMailMessagePage({ params }: { params: Promise<{ id: string; mailId: string }> }) {
  const admin = await requireAdmin();
  const { id, mailId } = await params;
  const [member, message] = await Promise.all([getMember(id), getMail(mailId)]);
  if (!member || !message || message.memberId !== id) notFound();
  await mutateMember(id, (m) => {
    m.mailViews = [
      { at: new Date().toISOString(), by: admin.u, mailId: message.id, subject: message.subject.slice(0, 120) },
      ...(m.mailViews ?? []),
    ].slice(0, 200);
  });
  const body = await getMailBody(message.id);

  return (
    <AdminShell>
      <header className="mb-6">
        <p className="text-sm">
          <Link href={`/admin/team/${id}?tab=mail`} className="font-semibold text-navy-500 hover:text-navy-900">
            ← {member.fullName} · Mail
          </Link>
        </p>
        <p className="mt-2 inline-flex rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold text-navy-700">
          Read-only · this opening is recorded
        </p>
      </header>
      <div className="card space-y-4">
        <MailHeader message={message} attachmentBase="/api/admin/team/mail/attachment" />
        <MailViewer base="/api/admin/team/mail/view" id={message.id} remoteImages={hasRemoteImages(body.html)} />
      </div>
    </AdminShell>
  );
}
