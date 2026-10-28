/**
 * SERVER-ONLY. The per-member figures the Admin Panel's team tabs show in
 * their tables, worked out once from the whole store.
 */
import { accrueAll, getTeamSettings, getWork, listMembers, listTickets, ticketUnread, type TeamMember } from "@/lib/teamStore";
import { totals, type Totals } from "@/lib/teamHours";
import { onboardingProgress, onboardingState } from "@/lib/teamView";

export interface MemberRow {
  member: TeamMember;
  totals: Totals;
  onboarding: { done: number; total: number };
  unreadTickets: number;
}

export async function memberRows(): Promise<MemberRow[]> {
  await accrueAll();
  const [members, work, settings, tickets] = await Promise.all([listMembers(), getWork(), getTeamSettings(), listTickets()]);
  return members
    .map((m) => ({
      member: m,
      totals: totals(
        work.entries.filter((e) => e.memberId === m.id),
        work.adjustments.filter((a) => a.memberId === m.id),
        work.payments.filter((p) => p.memberId === m.id),
      ),
      onboarding: onboardingProgress(onboardingState(m, settings)),
      unreadTickets: tickets.filter((t) => t.memberId === m.id && ticketUnread(t, "admin")).length,
    }))
    .sort((a, b) => a.member.fullName.localeCompare(b.member.fullName));
}
