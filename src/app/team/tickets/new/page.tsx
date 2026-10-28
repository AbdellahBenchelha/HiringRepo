import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/teamAuth";
import { PortalShell } from "@/components/team/PortalShell";
import { TicketForm } from "@/components/team/TicketForm";

export const metadata: Metadata = { title: "New ticket" };

export default async function TeamNewTicketPage() {
  const member = await requireMember();
  return (
    <PortalShell member={member} active="tickets" title="New ticket" intro="Ask a question or tell us about a problem.">
      <div className="card">
        <TicketForm url="/api/team/tickets" side="member" mode="new" after="/tickets" />
      </div>
      <p className="mt-4 text-sm">
        <Link href="/tickets" className="font-semibold text-navy-500 hover:text-navy-900">
          ← Back to tickets
        </Link>
      </p>
    </PortalShell>
  );
}
