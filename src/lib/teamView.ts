/**
 * SERVER-ONLY. What of a team member is allowed to reach a browser.
 *
 * The stored record carries the encrypted IBAN; nothing built here does. Both
 * the member's own pages and the Admin Panel go through these, so there is
 * one place to check that an account number cannot leak into a page.
 */
import { BANKS, maskIban, ONBOARDING_STEPS, type BankId, type OnboardingStep } from "@/lib/teamShared";
import { currentRate, type StoredBank, type TeamMember, type TeamSettings } from "@/lib/teamStore";

export interface BankView {
  bank: BankId;
  bankLabel: string;
  holder: string;
  masked: string;
  bic: string;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export function bankView(b: StoredBank | undefined): BankView | undefined {
  if (!b) return undefined;
  return {
    bank: b.bank,
    bankLabel: BANKS[b.bank].label,
    holder: b.holder,
    masked: maskIban(b.ibanCountry, b.last4),
    bic: b.bic,
    submittedAt: b.submittedAt,
    approvedAt: b.approvedAt,
    approvedBy: b.approvedBy,
  };
}

/** "Wise •••• 4821" — how a payment names the account it went to. */
export function bankLabel(b: StoredBank | undefined): string | undefined {
  return b ? `${BANKS[b.bank].label} ${maskIban(b.ibanCountry, b.last4)}` : undefined;
}

export type OnboardingState = Record<OnboardingStep, "done" | "todo" | "waiting" | "skip">;

/**
 * The getting-started list. "waiting" is a step the member cannot do yet
 * (no mailbox has been made for them); "skip" is one that does not apply
 * (no rules have been written).
 */
export function onboardingState(m: TeamMember, settings: TeamSettings): OnboardingState {
  const o = m.onboarding ?? {};
  return {
    profile: o.profileConfirmedAt ? "done" : "todo",
    mailbox: !m.workEmail ? "waiting" : o.mailboxOpenedAt ? "done" : "todo",
    bank: m.bank || m.bankPending ? "done" : "todo",
    rules: !settings.rulesText.trim() ? "skip" : o.rulesReadAt ? "done" : "todo",
  };
}

export function onboardingProgress(s: OnboardingState): { done: number; total: number } {
  const counted = ONBOARDING_STEPS.filter((k) => s[k] !== "skip");
  return { done: counted.filter((k) => s[k] === "done").length, total: counted.length };
}

export interface PortalMember {
  id: string;
  fullName: string;
  loginEmail: string;
  workEmail?: string;
  phoneNumber?: string;
  personalPhone?: string;
  country?: string;
  position?: string;
  status: TeamMember["status"];
  schedule: TeamMember["schedule"];
  hoursPerDay: number;
  rate: number;
  firstWorkDay: string;
  checkInRequired: boolean;
  allowedBanks: BankId[];
  bank?: BankView;
  bankPending?: BankView;
  bankRejected?: { at: string; reason: string };
  createdAt: string;
  signIns: { at: string; ip: string; device: string }[];
}

export function portalMember(m: TeamMember): PortalMember {
  return {
    id: m.id,
    fullName: m.fullName,
    loginEmail: m.loginEmail,
    workEmail: m.workEmail,
    phoneNumber: m.phoneNumber,
    personalPhone: m.personalPhone,
    country: m.country,
    position: m.position,
    status: m.status,
    schedule: m.schedule,
    hoursPerDay: m.hoursPerDay,
    rate: currentRate(m),
    firstWorkDay: m.firstWorkDay,
    checkInRequired: m.checkInRequired,
    allowedBanks: m.allowedBanks,
    bank: bankView(m.bank),
    bankPending: bankView(m.bankPending),
    bankRejected: m.bankRejected ? { at: m.bankRejected.at, reason: m.bankRejected.reason } : undefined,
    createdAt: m.createdAt,
    signIns: m.signIns ?? [],
  };
}

export interface AdminMember extends PortalMember {
  candidateId?: string;
  createdBy: string;
  invitedAt?: string;
  inviteCount?: number;
  firstSignInAt?: string;
  lastSignInAt?: string;
  rates: TeamMember["rates"];
  accruedThrough?: string;
  bankViews: { at: string; by: string }[];
  bankRejectedBy?: string;
  documents: NonNullable<TeamMember["documents"]>;
  notes?: string;
  statusChangedAt?: string;
}

export function adminMember(m: TeamMember): AdminMember {
  return {
    ...portalMember(m),
    candidateId: m.candidateId,
    createdBy: m.createdBy,
    invitedAt: m.invitedAt,
    inviteCount: m.inviteCount,
    firstSignInAt: m.firstSignInAt,
    lastSignInAt: m.lastSignInAt,
    rates: m.rates,
    accruedThrough: m.accruedThrough,
    bankViews: m.bankViews ?? [],
    bankRejectedBy: m.bankRejected?.by,
    documents: m.documents ?? [],
    notes: m.notes,
    statusChangedAt: m.statusChangedAt,
  };
}
