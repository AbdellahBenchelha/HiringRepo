import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/teamAuth";
import { getMail } from "@/lib/teamMail";
import { formatDateTime } from "@/lib/teamShared";
import { mailSendingReady } from "@/lib/teamMailSend";
import { PortalShell } from "@/components/team/PortalShell";
import { MailCompose } from "@/components/team/MailCompose";

export const metadata: Metadata = { title: "New email" };

/** "Re: " or "Fwd: " in front of a subject, once. */
function prefixed(prefix: "Re" | "Fwd", subject: string): string {
  const re = new RegExp(`^${prefix}:\\s*`, "i");
  return re.test(subject) ? subject : `${prefix}: ${subject}`;
}

export default async function TeamMailNewPage({ searchParams }: { searchParams: Promise<{ reply?: string; forward?: string }> }) {
  const member = await requireMember();
  if (!member.workEmail) redirect("/mail");
  const { reply, forward } = await searchParams;
  const refId = reply || forward;
  const original = refId ? await getMail(refId) : null;
  const own = original && original.memberId === member.id ? original : null;

  let initial = { to: "", cc: "", subject: "" };
  if (own && reply) {
    initial = { to: own.from.address, cc: "", subject: prefixed("Re", own.subject) };
  } else if (own && forward) {
    initial = { to: "", cc: "", subject: prefixed("Fwd", own.subject) };
  }

  return (
    <PortalShell member={member} active="mail" title={own && reply ? "Reply" : own && forward ? "Forward" : "New email"}>
      {!mailSendingReady() ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Sending email is not set up yet. You can write your message, but it cannot be sent until it is.
        </p>
      ) : null}
      <div className="card">
        <MailCompose
          from={member.workEmail}
          initial={initial}
          replyTo={own && reply ? own.id : undefined}
          forwardOf={own && forward ? own.id : undefined}
          original={
            own
              ? { from: own.from.name || own.from.address, when: formatDateTime(own.at), snippet: own.snippet }
              : undefined
          }
          originalHasAttachments={!!own?.attachments.some((a) => a.key && !a.contentId)}
        />
      </div>
    </PortalShell>
  );
}
