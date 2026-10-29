import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMail, getMailBody } from "@/lib/teamMail";
import { listMembers } from "@/lib/teamStore";
import { hasRemoteImages } from "@/lib/teamMailHtml";
import { MailHeader } from "@/components/team/MailHeader";
import { MailViewer } from "@/components/team/MailViewer";
import { AdminAction, AdminForm } from "@/components/admin/team/AdminAction";

export const metadata: Metadata = { title: "Mail to an unknown address", robots: { index: false, follow: false } };

export default async function AdminUnknownMailMessagePage({ params }: { params: Promise<{ mailId: string }> }) {
  await requireAdmin();
  const { mailId } = await params;
  const message = await getMail(mailId);
  if (!message || message.memberId !== null) notFound();
  const [body, members] = await Promise.all([getMailBody(message.id), listMembers()]);
  const api = `/api/admin/team/mail/${message.id}`;

  return (
    <AdminShell>
      <header className="mb-6">
        <p className="text-sm">
          <Link href="/admin/team/unknown-mail" className="font-semibold text-navy-500 hover:text-navy-900">
            ← Mail to unknown addresses
          </Link>
        </p>
        <p className="mt-2 text-sm text-navy-600">
          Sent to <strong>{message.envelopeTo || message.to[0]?.address}</strong>, which no member has.
        </p>
      </header>
      <div className="card mb-6 space-y-4">
        <h2 className="font-display text-lg font-extrabold text-navy-900">Put it in a member&rsquo;s inbox</h2>
        <AdminForm
          url={api}
          body={{ action: "assign" }}
          submit="Move to their inbox"
          after="/admin/team/unknown-mail"
          fields={[
            {
              name: "memberId",
              label: "Member",
              type: "select",
              options: [
                { value: "", label: "Choose…" },
                ...members
                  .filter((m) => m.status !== "left")
                  .map((m) => ({ value: m.id, label: `${m.fullName}${m.workEmail ? ` — ${m.workEmail}` : ""}` })),
              ],
            },
          ]}
        />
        <AdminAction url={api} body={{ action: "delete" }} confirm="Delete this email?" after="/admin/team/unknown-mail" className="text-sm font-semibold text-red-600 hover:underline">
          Delete it instead
        </AdminAction>
      </div>
      <div className="card space-y-4">
        <MailHeader message={message} attachmentBase="/api/admin/team/mail/attachment" />
        <MailViewer base="/api/admin/team/mail/view" id={message.id} remoteImages={hasRemoteImages(body.html)} />
      </div>
    </AdminShell>
  );
}
