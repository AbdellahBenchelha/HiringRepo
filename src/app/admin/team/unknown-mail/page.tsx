import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { listMail } from "@/lib/teamMail";
import { MailList } from "@/components/team/MailList";
import { teamMailDomain } from "@/lib/teamHost";

export const metadata: Metadata = { title: "Mail to unknown addresses", robots: { index: false, follow: false } };

/**
 * Email that reached an @workroute.team address no member has — a typo, an
 * old address after a change, or someone guessing. Kept here rather than
 * lost, to be put in the right inbox or deleted.
 */
export default async function AdminUnknownMailPage() {
  await requireAdmin();
  const messages = await listMail(null, "inbox");
  return (
    <AdminShell>
      <header className="mb-6">
        <p className="text-sm">
          <Link href="/admin/team" className="font-semibold text-navy-500 hover:text-navy-900">
            ← Team
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">Mail to unknown addresses</h1>
        <p className="mt-1 text-sm text-navy-500">
          Email sent to an @{teamMailDomain()} address that no member has. Open one to put it in the right member&rsquo;s inbox, or delete it.
        </p>
      </header>
      <MailList messages={messages} hrefFor={(m) => `/admin/team/unknown-mail/${m.id}`} empty="Nothing here." />
    </AdminShell>
  );
}
