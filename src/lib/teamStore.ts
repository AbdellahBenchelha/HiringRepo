/**
 * SERVER-ONLY. Everything the team portal keeps: members, tickets, phone
 * messages, work hours, payments, announcements and settings.
 *
 * Four files beside candidates.json, so a busy day of phone messages never
 * rewrites the file holding every member, and nothing here ever rewrites the
 * candidates. All four share one write queue: a change that touches two of
 * them (approving a day off rewrites the day's hours) is never interleaved
 * with another.
 *
 * Bank account numbers are stored encrypted (lib/teamCrypto) and leave this
 * module in clear only through revealBank, which records who asked.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { newId } from "@/lib/id";
import { normaliseEmail } from "@/lib/identity";
import type { DayKey } from "@/lib/availability";
import { decryptSecret, encryptSecret } from "@/lib/teamCrypto";
import { localDate, planAccrual, rateOn, type RateFrom } from "@/lib/teamHours";
import {
  DEFAULT_PAYDAY,
  round2,
  type BankId,
  type MemberStatus,
  type PaydaySchedule,
  type TeamSchedule,
  type TicketPriority,
  type TicketStatus,
  type WorkStatus,
} from "@/lib/teamShared";

const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILES = {
  team: "team.json",
  tickets: "team-tickets.json",
  phone: "team-phone.json",
  work: "team-work.json",
} as const;
const file = (f: keyof typeof FILES) => path.join(dir(), FILES[f]);

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface StoredBank {
  bank: BankId;
  holder: string;
  /** Encrypted. Never sent to a browser. */
  ibanEnc: string;
  /** Country code and last four, for recognising it. */
  ibanCountry: string;
  last4: string;
  bic: string;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SignIn {
  at: string;
  ip: string;
  device: string;
}

export interface MemberDocument {
  id: string;
  key: string;
  name: string;
  type: string;
  size: number;
  at: string;
  by: string;
}

export interface TeamMember {
  id: string;
  candidateId?: string;
  fullName: string;
  /** The personal email they sign in with — the one they applied with. */
  loginEmail: string;
  personalPhone?: string;
  country?: string;
  position?: string;
  /** e.g. alberth@workroute.team, once the mailbox exists. */
  workEmail?: string;
  /** The number provided for them, in full international form. */
  phoneNumber?: string;
  status: MemberStatus;
  statusChangedAt?: string;
  createdAt: string;
  createdBy: string;
  invitedAt?: string;
  inviteCount?: number;
  firstSignInAt?: string;
  lastSignInAt?: string;
  signIns?: SignIn[];
  /** Raised to sign out every device at once. */
  sessionVersion: number;
  schedule: TeamSchedule;
  hoursPerDay: number;
  rates: RateFrom[];
  firstWorkDay: string;
  /** The last date the automatic hours have looked at. */
  accruedThrough?: string;
  checkInRequired: boolean;
  allowedBanks: BankId[];
  bank?: StoredBank;
  /** A new account waiting for a recruiter to approve it. */
  bankPending?: StoredBank;
  bankRejected?: { at: string; by: string; reason: string };
  bankViews?: { at: string; by: string }[];
  onboarding?: { profileConfirmedAt?: string; mailboxOpenedAt?: string; rulesReadAt?: string };
  dismissedAnnouncements?: string[];
  /** The last "you have something new" email of each kind, to space them out. */
  alertSentAt?: Partial<Record<"ticket" | "phone" | "mail", string>>;
  /** Each time a recruiter opened one of this member's emails (read-only). */
  mailViews?: { at: string; by: string; mailId: string; subject: string }[];
  documents?: MemberDocument[];
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  by: string;
  active: boolean;
}

export interface TeamSettings {
  payday: PaydaySchedule;
  rulesText: string;
  mailboxUrl: string;
  mailboxHelp: string;
}

export const DEFAULT_SETTINGS: TeamSettings = {
  payday: DEFAULT_PAYDAY,
  rulesText: "",
  mailboxUrl: "",
  mailboxHelp: "",
};

interface TeamFile {
  members: TeamMember[];
  announcements: Announcement[];
  settings: TeamSettings;
  ticketSeq: number;
}

export interface Attachment {
  key: string;
  name: string;
  type: string;
  size: number;
}

export interface TicketMessage {
  id: string;
  from: "admin" | "member";
  by?: string;
  body: string;
  at: string;
  attachments?: Attachment[];
}

export interface Ticket {
  id: string;
  number: number;
  memberId: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: "admin" | "member";
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  memberReadAt?: string;
  adminReadAt?: string;
}

export interface PhoneMessage {
  id: string;
  memberId: string;
  /** The number it arrived on, as it was at the time. */
  number: string;
  sender: string;
  body: string;
  at: string;
  by: string;
  readAt?: string;
}

export interface WorkEntry {
  id: string;
  memberId: string;
  date: string;
  hours: number;
  rate: number;
  status: WorkStatus;
  source: "auto" | "admin";
  note?: string;
  createdAt: string;
  editedAt?: string;
  editedBy?: string;
}

export interface Adjustment {
  id: string;
  memberId: string;
  date: string;
  /** Positive for a bonus, negative for a deduction. */
  amount: number;
  reason: string;
  createdAt: string;
  by: string;
}

export interface Payment {
  id: string;
  memberId: string;
  date: string;
  amount: number;
  reference?: string;
  /** "Wise •••• 4821" as it was when paid. */
  sentTo?: string;
  createdAt: string;
  by: string;
}

export interface DayOff {
  id: string;
  memberId: string;
  date: string;
  reason?: string;
  status: "pending" | "approved" | "refused";
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  note?: string;
}

export interface CheckIn {
  memberId: string;
  date: string;
  at: string;
}

interface WorkFile {
  entries: WorkEntry[];
  adjustments: Adjustment[];
  payments: Payment[];
  dayOffs: DayOff[];
  checkIns: CheckIn[];
}

/* -------------------------------------------------------------------------- */
/* Reading and writing                                                         */
/* -------------------------------------------------------------------------- */

async function readJson<T>(f: keyof typeof FILES, fallback: () => T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file(f), "utf8")) as T;
  } catch {
    return fallback();
  }
}

async function readTeam(): Promise<TeamFile> {
  const t = await readJson<Partial<TeamFile>>("team", () => ({}));
  return {
    members: Array.isArray(t.members) ? t.members : [],
    announcements: Array.isArray(t.announcements) ? t.announcements : [],
    settings: { ...DEFAULT_SETTINGS, ...(t.settings ?? {}) },
    ticketSeq: typeof t.ticketSeq === "number" ? t.ticketSeq : 1000,
  };
}

async function readWork(): Promise<WorkFile> {
  const w = await readJson<Partial<WorkFile>>("work", () => ({}));
  return {
    entries: w.entries ?? [],
    adjustments: w.adjustments ?? [],
    payments: w.payments ?? [],
    dayOffs: w.dayOffs ?? [],
    checkIns: w.checkIns ?? [],
  };
}

const readTickets = () => readJson<Ticket[]>("tickets", () => []);
const readPhone = () => readJson<PhoneMessage[]>("phone", () => []);

async function save(f: keyof typeof FILES, data: unknown): Promise<void> {
  await writeFileAtomic(file(f), JSON.stringify(data, null, 2));
}

let chain: Promise<unknown> = Promise.resolve();

/** Run one change at a time across every team file. */
function withWrite<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
}

const nowIso = () => new Date().toISOString();

/* -------------------------------------------------------------------------- */
/* Members                                                                     */
/* -------------------------------------------------------------------------- */

export async function listMembers(): Promise<TeamMember[]> {
  return (await readTeam()).members;
}

export async function getMember(id: string): Promise<TeamMember | null> {
  return (await readTeam()).members.find((m) => m.id === id) ?? null;
}

export async function getMemberByEmail(email: string): Promise<TeamMember | null> {
  const want = normaliseEmail(email);
  return (await readTeam()).members.find((m) => normaliseEmail(m.loginEmail) === want) ?? null;
}

export async function getMemberByCandidate(candidateId: string): Promise<TeamMember | null> {
  return (await readTeam()).members.find((m) => m.candidateId === candidateId) ?? null;
}

export interface NewMember {
  candidateId?: string;
  fullName: string;
  loginEmail: string;
  personalPhone?: string;
  country?: string;
  position?: string;
  workEmail?: string;
  phoneNumber?: string;
  schedule: TeamSchedule;
  hoursPerDay: number;
  rate: number;
  firstWorkDay: string;
  checkInRequired: boolean;
  allowedBanks: BankId[];
}

export function createMember(
  input: NewMember,
  by: string,
): Promise<{ ok: true; member: TeamMember } | { ok: false; reason: "email_taken" | "candidate_taken" }> {
  return withWrite(async () => {
    const t = await readTeam();
    const email = normaliseEmail(input.loginEmail);
    if (t.members.some((m) => normaliseEmail(m.loginEmail) === email)) return { ok: false, reason: "email_taken" };
    if (input.candidateId && t.members.some((m) => m.candidateId === input.candidateId)) {
      return { ok: false, reason: "candidate_taken" };
    }
    const { rate, ...rest } = input;
    const member: TeamMember = {
      ...rest,
      id: newId(9),
      loginEmail: input.loginEmail.trim(),
      status: "active",
      createdAt: nowIso(),
      createdBy: by,
      sessionVersion: 1,
      rates: [{ from: input.firstWorkDay, rate }],
    };
    t.members.push(member);
    await save("team", t);
    return { ok: true, member };
  });
}

/** Change one member with a function; returns the member as saved. */
export function mutateMember(
  id: string,
  fn: (m: TeamMember, t: TeamFile) => void | false,
): Promise<TeamMember | null> {
  return withWrite(async () => {
    const t = await readTeam();
    const m = t.members.find((x) => x.id === id);
    if (!m) return null;
    if (fn(m, t) === false) return m;
    await save("team", t);
    return m;
  });
}

export function recordSignIn(id: string, ip: string, device: string): Promise<TeamMember | null> {
  return mutateMember(id, (m) => {
    const at = nowIso();
    m.firstSignInAt ??= at;
    m.lastSignInAt = at;
    m.signIns = [{ at, ip, device }, ...(m.signIns ?? [])].slice(0, 15);
  });
}

export function signOutEverywhere(id: string): Promise<TeamMember | null> {
  return mutateMember(id, (m) => {
    m.sessionVersion = (m.sessionVersion ?? 1) + 1;
  });
}

export function recordInvite(id: string): Promise<TeamMember | null> {
  return mutateMember(id, (m) => {
    m.invitedAt = nowIso();
    m.inviteCount = (m.inviteCount ?? 0) + 1;
  });
}

/**
 * Pause, resume or end someone's place. The finished days are counted first,
 * under the status they were worked in, and coming back from a pause starts
 * the clock from now rather than paying for the pause.
 */
export async function setMemberStatus(id: string, status: MemberStatus): Promise<TeamMember | null> {
  await accrueMember(id);
  return mutateMember(id, (m) => {
    if (m.status === status) return false;
    if (status === "active") {
      const today = localDate(m.schedule.timeZone);
      const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      if (!m.accruedThrough || m.accruedThrough < yesterday) m.accruedThrough = yesterday;
    }
    m.status = status;
    m.statusChangedAt = nowIso();
  });
}

/** A new rate from a date onwards; earlier days keep theirs. */
export function setRate(id: string, rate: number, from: string): Promise<TeamMember | null> {
  return mutateMember(id, (m) => {
    m.rates = [...m.rates.filter((r) => r.from !== from), { from, rate }].sort((a, b) => a.from.localeCompare(b.from));
  });
}

export function currentRate(m: TeamMember): number {
  return rateOn(m.rates, localDate(m.schedule.timeZone));
}

export function markAlertSent(id: string, kind: "ticket" | "phone" | "mail"): Promise<TeamMember | null> {
  return mutateMember(id, (m) => {
    m.alertSentAt = { ...(m.alertSentAt ?? {}), [kind]: nowIso() };
  });
}

/* -------------------------------------------------------------------------- */
/* Bank                                                                        */
/* -------------------------------------------------------------------------- */

export type BankSubmit =
  | { ok: true; member: TeamMember }
  | { ok: false; reason: "not_found" | "not_allowed" | "crypto_unavailable" | "unchanged" };

/** A new account from the member. It waits for approval before it is used. */
export function submitBank(
  id: string,
  input: { bank: BankId; holder: string; iban: string; bic: string },
): Promise<BankSubmit> {
  return withWrite(async () => {
    const t = await readTeam();
    const m = t.members.find((x) => x.id === id);
    if (!m) return { ok: false, reason: "not_found" };
    if (!m.allowedBanks.includes(input.bank)) return { ok: false, reason: "not_allowed" };
    const ibanEnc = encryptSecret(input.iban);
    if (!ibanEnc) return { ok: false, reason: "crypto_unavailable" };
    const current = m.bank && decryptSecret(m.bank.ibanEnc);
    if (
      m.bank &&
      !m.bankPending &&
      current === input.iban &&
      m.bank.bank === input.bank &&
      m.bank.holder === input.holder &&
      m.bank.bic === input.bic
    ) {
      return { ok: false, reason: "unchanged" };
    }
    m.bankPending = {
      bank: input.bank,
      holder: input.holder,
      ibanEnc,
      ibanCountry: input.iban.slice(0, 2),
      last4: input.iban.slice(-4),
      bic: input.bic,
      submittedAt: nowIso(),
    };
    delete m.bankRejected;
    await save("team", t);
    return { ok: true, member: m };
  });
}

export function decideBank(
  id: string,
  approve: boolean,
  by: string,
  reason?: string,
): Promise<TeamMember | null> {
  return mutateMember(id, (m) => {
    if (!m.bankPending) return false;
    if (approve) {
      m.bank = { ...m.bankPending, approvedAt: nowIso(), approvedBy: by };
    } else {
      m.bankRejected = { at: nowIso(), by, reason: (reason ?? "").slice(0, 300) };
    }
    delete m.bankPending;
  });
}

/** The full IBAN, for a recruiter who pressed Show. Every look is recorded. */
export async function revealBank(
  id: string,
  which: "current" | "pending",
  by: string,
): Promise<string | null> {
  const m = await mutateMember(id, (x) => {
    x.bankViews = [{ at: nowIso(), by }, ...(x.bankViews ?? [])].slice(0, 50);
  });
  const stored = which === "pending" ? m?.bankPending : m?.bank;
  return stored ? decryptSecret(stored.ibanEnc) : null;
}

/* -------------------------------------------------------------------------- */
/* Announcements & settings                                                    */
/* -------------------------------------------------------------------------- */

export async function getTeamSettings(): Promise<TeamSettings> {
  return (await readTeam()).settings;
}

export function saveTeamSettings(patch: Partial<TeamSettings>): Promise<TeamSettings> {
  return withWrite(async () => {
    const t = await readTeam();
    t.settings = { ...t.settings, ...patch };
    await save("team", t);
    return t.settings;
  });
}

export async function listAnnouncements(): Promise<Announcement[]> {
  return (await readTeam()).announcements;
}

export function addAnnouncement(title: string, body: string, by: string): Promise<Announcement> {
  return withWrite(async () => {
    const t = await readTeam();
    const a: Announcement = { id: newId(8), title, body, createdAt: nowIso(), by, active: true };
    t.announcements = [a, ...t.announcements].slice(0, 100);
    await save("team", t);
    return a;
  });
}

export function updateAnnouncement(id: string, change: { active?: boolean; remove?: boolean }): Promise<boolean> {
  return withWrite(async () => {
    const t = await readTeam();
    const a = t.announcements.find((x) => x.id === id);
    if (!a) return false;
    if (change.remove) t.announcements = t.announcements.filter((x) => x.id !== id);
    else if (typeof change.active === "boolean") a.active = change.active;
    await save("team", t);
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Tickets                                                                     */
/* -------------------------------------------------------------------------- */

export async function listTickets(filter?: { memberId?: string }): Promise<Ticket[]> {
  const all = await readTickets();
  const list = filter?.memberId ? all.filter((t) => t.memberId === filter.memberId) : all;
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTicket(id: string): Promise<Ticket | null> {
  return (await readTickets()).find((t) => t.id === id) ?? null;
}

export function createTickets(
  memberIds: string[],
  input: {
    subject: string;
    body: string;
    priority: TicketPriority;
    from: "admin" | "member";
    by?: string;
    attachments?: Attachment[];
  },
): Promise<Ticket[]> {
  return withWrite(async () => {
    const t = await readTeam();
    const tickets = await readTickets();
    const at = nowIso();
    const made: Ticket[] = [];
    for (const memberId of memberIds) {
      t.ticketSeq += 1;
      const ticket: Ticket = {
        id: newId(9),
        number: t.ticketSeq,
        memberId,
        subject: input.subject,
        priority: input.priority,
        status: "open",
        createdBy: input.from,
        createdAt: at,
        updatedAt: at,
        messages: [{ id: newId(8), from: input.from, by: input.by, body: input.body, at, attachments: input.attachments }],
        ...(input.from === "admin" ? { adminReadAt: at } : { memberReadAt: at }),
      };
      tickets.push(ticket);
      made.push(ticket);
    }
    await save("tickets", tickets);
    await save("team", t);
    return made;
  });
}

export function addTicketMessage(
  id: string,
  msg: { from: "admin" | "member"; by?: string; body: string; attachments?: Attachment[] },
): Promise<Ticket | null> {
  return withWrite(async () => {
    const tickets = await readTickets();
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return null;
    const at = nowIso();
    ticket.messages.push({ id: newId(8), ...msg, at });
    ticket.updatedAt = at;
    if (msg.from === "admin") ticket.adminReadAt = at;
    else {
      ticket.memberReadAt = at;
      // A member writing back on a finished ticket reopens it.
      if (ticket.status === "done") ticket.status = "open";
    }
    await save("tickets", tickets);
    return ticket;
  });
}

export function updateTicket(
  id: string,
  change: { status?: TicketStatus; priority?: TicketPriority; readBy?: "admin" | "member" },
): Promise<Ticket | null> {
  return withWrite(async () => {
    const tickets = await readTickets();
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return null;
    if (change.status) {
      ticket.status = change.status;
      ticket.updatedAt = nowIso();
    }
    if (change.priority) ticket.priority = change.priority;
    if (change.readBy === "admin") ticket.adminReadAt = nowIso();
    if (change.readBy === "member") ticket.memberReadAt = nowIso();
    await save("tickets", tickets);
    return ticket;
  });
}

function lastFrom(t: Ticket, side: "admin" | "member"): string | undefined {
  for (let i = t.messages.length - 1; i >= 0; i--) if (t.messages[i].from === side) return t.messages[i].at;
  return undefined;
}

/** Has the other side written since this side last looked? */
export function ticketUnread(t: Ticket, side: "admin" | "member"): boolean {
  const other = lastFrom(t, side === "admin" ? "member" : "admin");
  const read = side === "admin" ? t.adminReadAt : t.memberReadAt;
  return !!other && (!read || other > read);
}

/* -------------------------------------------------------------------------- */
/* Phone messages                                                              */
/* -------------------------------------------------------------------------- */

export async function listPhoneMessages(memberId?: string): Promise<PhoneMessage[]> {
  const all = await readPhone();
  return (memberId ? all.filter((p) => p.memberId === memberId) : all).sort((a, b) => b.at.localeCompare(a.at));
}

export function addPhoneMessage(input: Omit<PhoneMessage, "id" | "at">): Promise<PhoneMessage> {
  return withWrite(async () => {
    const list = await readPhone();
    const msg: PhoneMessage = { id: newId(9), at: nowIso(), ...input };
    list.push(msg);
    // Kept to the newest 300 per member: an inbox, not an archive.
    const mine = list.filter((p) => p.memberId === input.memberId).sort((a, b) => b.at.localeCompare(a.at));
    const drop = new Set(mine.slice(300).map((p) => p.id));
    await save("phone", list.filter((p) => !drop.has(p.id)));
    return msg;
  });
}

export function deletePhoneMessage(id: string): Promise<boolean> {
  return withWrite(async () => {
    const list = await readPhone();
    const next = list.filter((p) => p.id !== id);
    if (next.length === list.length) return false;
    await save("phone", next);
    return true;
  });
}

export function markPhoneRead(memberId: string): Promise<void> {
  return withWrite(async () => {
    const list = await readPhone();
    const at = nowIso();
    let changed = false;
    for (const p of list) {
      if (p.memberId === memberId && !p.readAt) {
        p.readAt = at;
        changed = true;
      }
    }
    if (changed) await save("phone", list);
  });
}

/* -------------------------------------------------------------------------- */
/* Hours, pay, days off, check-ins                                             */
/* -------------------------------------------------------------------------- */

export interface MemberWork {
  entries: WorkEntry[];
  adjustments: Adjustment[];
  payments: Payment[];
  dayOffs: DayOff[];
  checkIns: CheckIn[];
}

export async function getWork(memberId?: string): Promise<MemberWork> {
  const w = await readWork();
  if (!memberId) return w;
  const mine = <T extends { memberId: string }>(xs: T[]) => xs.filter((x) => x.memberId === memberId);
  return {
    entries: mine(w.entries).sort((a, b) => b.date.localeCompare(a.date)),
    adjustments: mine(w.adjustments).sort((a, b) => b.date.localeCompare(a.date)),
    payments: mine(w.payments).sort((a, b) => b.date.localeCompare(a.date)),
    dayOffs: mine(w.dayOffs).sort((a, b) => b.date.localeCompare(a.date)),
    checkIns: mine(w.checkIns),
  };
}

function accrueInto(m: TeamMember, w: WorkFile, now: number): boolean {
  const mine = w.entries.filter((e) => e.memberId === m.id);
  const dates = new Set(mine.map((e) => e.date));
  const offs = new Set(w.dayOffs.filter((d) => d.memberId === m.id && d.status === "approved").map((d) => d.date));
  const ins = new Set(w.checkIns.filter((c) => c.memberId === m.id).map((c) => c.date));
  const plan = planAccrual(
    m,
    { hasEntry: (d) => dates.has(d), dayOffApproved: (d) => offs.has(d), checkedIn: (d) => ins.has(d) },
    now,
  );
  const at = nowIso();
  for (const e of plan.entries) {
    w.entries.push({ id: newId(9), memberId: m.id, ...e, source: "auto", createdAt: at });
  }
  const moved = plan.accruedThrough !== m.accruedThrough;
  m.accruedThrough = plan.accruedThrough;
  return moved || plan.entries.length > 0;
}

/** Add every finished day for one member. Safe to call as often as you like. */
export function accrueMember(id: string): Promise<number> {
  return withWrite(async () => {
    const t = await readTeam();
    const m = t.members.find((x) => x.id === id);
    if (!m) return 0;
    const w = await readWork();
    const before = w.entries.length;
    if (!accrueInto(m, w, Date.now())) return 0;
    await save("work", w);
    await save("team", t);
    return w.entries.length - before;
  });
}

/** The same for everybody — what the background timer runs. */
export function accrueAll(): Promise<number> {
  return withWrite(async () => {
    const t = await readTeam();
    if (!t.members.length) return 0;
    const w = await readWork();
    const before = w.entries.length;
    let changed = false;
    const now = Date.now();
    for (const m of t.members) if (accrueInto(m, w, now)) changed = true;
    if (!changed) return 0;
    await save("work", w);
    await save("team", t);
    return w.entries.length - before;
  });
}

function mutateWork<T>(fn: (w: WorkFile) => T | null): Promise<T | null> {
  return withWrite(async () => {
    const w = await readWork();
    const out = fn(w);
    if (out === null) return null;
    await save("work", w);
    return out;
  });
}

export function editEntry(
  id: string,
  change: { hours?: number; rate?: number; status?: WorkStatus; note?: string },
  by: string,
): Promise<WorkEntry | null> {
  return mutateWork((w) => {
    const e = w.entries.find((x) => x.id === id);
    if (!e) return null;
    if (typeof change.hours === "number") e.hours = round2(change.hours);
    if (typeof change.rate === "number") e.rate = round2(change.rate);
    if (change.status) e.status = change.status;
    if (typeof change.note === "string") e.note = change.note.slice(0, 200) || undefined;
    e.editedAt = nowIso();
    e.editedBy = by;
    return e;
  });
}

export function deleteEntry(id: string): Promise<boolean | null> {
  return mutateWork((w) => {
    const before = w.entries.length;
    w.entries = w.entries.filter((e) => e.id !== id);
    return w.entries.length < before ? true : null;
  });
}

export function addEntry(
  input: { memberId: string; date: string; hours: number; rate: number; status: WorkStatus; note?: string },
  by: string,
): Promise<WorkEntry | null> {
  return mutateWork((w) => {
    const e: WorkEntry = {
      id: newId(9),
      ...input,
      hours: round2(input.hours),
      rate: round2(input.rate),
      note: input.note?.slice(0, 200) || undefined,
      source: "admin",
      createdAt: nowIso(),
      editedBy: by,
    };
    w.entries.push(e);
    return e;
  });
}

export function addAdjustment(input: Omit<Adjustment, "id" | "createdAt">): Promise<Adjustment | null> {
  return mutateWork((w) => {
    const a: Adjustment = { id: newId(9), createdAt: nowIso(), ...input, amount: round2(input.amount) };
    w.adjustments.push(a);
    return a;
  });
}

export function deleteAdjustment(id: string): Promise<boolean | null> {
  return mutateWork((w) => {
    const before = w.adjustments.length;
    w.adjustments = w.adjustments.filter((a) => a.id !== id);
    return w.adjustments.length < before ? true : null;
  });
}

export function addPayment(input: Omit<Payment, "id" | "createdAt">): Promise<Payment | null> {
  return mutateWork((w) => {
    const p: Payment = { id: newId(9), createdAt: nowIso(), ...input, amount: round2(input.amount) };
    w.payments.push(p);
    return p;
  });
}

export function deletePayment(id: string): Promise<boolean | null> {
  return mutateWork((w) => {
    const before = w.payments.length;
    w.payments = w.payments.filter((p) => p.id !== id);
    return w.payments.length < before ? true : null;
  });
}

export function requestDayOff(
  memberId: string,
  date: string,
  reason: string,
): Promise<{ ok: true; dayOff: DayOff } | { ok: false; reason: "exists" }> {
  return withWrite(async () => {
    const w = await readWork();
    if (w.dayOffs.some((d) => d.memberId === memberId && d.date === date && d.status !== "refused")) {
      return { ok: false, reason: "exists" };
    }
    const d: DayOff = {
      id: newId(9),
      memberId,
      date,
      reason: reason.slice(0, 300) || undefined,
      status: "pending",
      requestedAt: nowIso(),
    };
    w.dayOffs.push(d);
    await save("work", w);
    return { ok: true, dayOff: d };
  });
}

export function cancelDayOff(memberId: string, id: string): Promise<boolean | null> {
  return mutateWork((w) => {
    const d = w.dayOffs.find((x) => x.id === id && x.memberId === memberId && x.status === "pending");
    if (!d) return null;
    w.dayOffs = w.dayOffs.filter((x) => x !== d);
    return true;
  });
}

/**
 * Approve or refuse a day off. Approving one that has already been counted
 * turns that day into a day off; refusing never changes a counted day.
 */
export function decideDayOff(id: string, approve: boolean, by: string, note?: string): Promise<DayOff | null> {
  return mutateWork((w) => {
    const d = w.dayOffs.find((x) => x.id === id);
    if (!d) return null;
    d.status = approve ? "approved" : "refused";
    d.decidedAt = nowIso();
    d.decidedBy = by;
    d.note = note?.slice(0, 300) || undefined;
    if (approve) {
      const e = w.entries.find((x) => x.memberId === d.memberId && x.date === d.date && x.source === "auto");
      if (e) {
        e.status = "dayoff";
        e.hours = 0;
        e.editedAt = nowIso();
        e.editedBy = by;
      }
    }
    return d;
  });
}

export function recordCheckIn(memberId: string, date: string): Promise<CheckIn | null> {
  return mutateWork((w) => {
    if (w.checkIns.some((c) => c.memberId === memberId && c.date === date)) return null;
    const c: CheckIn = { memberId, date, at: nowIso() };
    w.checkIns.push(c);
    return c;
  });
}

export type { DayKey };
