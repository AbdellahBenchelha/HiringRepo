"use client";

import { MemberPicker } from "@/components/admin/team/MemberPicker";
import { TicketForm } from "@/components/team/TicketForm";

/** A new ticket to one or several members, from the Team tickets tab. */
export function NewTicketPanel({ members }: { members: { id: string; fullName: string; loginEmail: string }[] }) {
  return (
    <MemberPicker members={members}>
      {(ids) => <TicketForm url="/api/admin/team/tickets" side="admin" mode="new" memberIds={ids} after="/admin/team-tickets" />}
    </MemberPicker>
  );
}
