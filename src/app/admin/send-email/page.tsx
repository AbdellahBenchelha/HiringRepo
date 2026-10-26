import type { Metadata } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { ComposeEmail } from "@/components/admin/ComposeEmail";
import { listSentEmails } from "@/lib/sentEmailStore";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Send email", robots: { index: false, follow: false } };

/**
 * Write and send one email from the Admin Panel, through the same ZeptoMail
 * account and sending address as every other email the site sends.
 */
export default async function AdminSendEmailPage() {
  await requireAdmin();
  const history = await listSentEmails(50, 0);
  const fromAddress = process.env.ZEPTOMAIL_FROM_ADDRESS?.trim() || "";

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Send email</h1>
        <p className="mt-1 text-sm text-navy-500">
          Write an email to one person and send it through ZeptoMail
          {fromAddress ? <> from {fromAddress}</> : null}. It counts towards the day&rsquo;s warm-up limit, like
          every other email.
        </p>
      </header>
      <ComposeEmail
        fromAddress={fromAddress || "(not set up — ZEPTOMAIL_FROM_ADDRESS)"}
        fromName={process.env.ZEPTOMAIL_FROM_NAME?.trim() || siteConfig.company.name}
        replyTo={siteConfig.contact.recruitmentEmail}
        initialHistory={history.items}
        initialTotal={history.total}
      />
    </AdminShell>
  );
}
