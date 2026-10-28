/**
 * SERVER-ONLY. What on the team side is waiting for a recruiter — the numbers
 * on the Admin Panel's team tabs.
 */
import { getWork, listMembers, listTickets, ticketUnread } from "@/lib/teamStore";

export interface TeamAttention {
  /** Tickets with a member's message nobody has read. */
  tickets: number;
  /** Bank accounts, day-off requests and "no check-in" days to decide. */
  pay: number;
  /** Members with a bank account waiting for approval. */
  bank: number;
}

export async function teamAttention(): Promise<TeamAttention> {
  const [tickets, members, work] = await Promise.all([listTickets(), listMembers(), getWork()]);
  const bank = members.filter((m) => m.bankPending).length;
  const dayOffs = work.dayOffs.filter((d) => d.status === "pending").length;
  const noCheckIn = work.entries.filter((e) => e.status === "no_checkin" && !e.editedAt).length;
  return {
    tickets: tickets.filter((t) => ticketUnread(t, "admin")).length,
    pay: bank + dayOffs + noCheckIn,
    bank,
  };
}
