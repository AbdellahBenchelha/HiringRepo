/**
 * SERVER-ONLY. The team portal's emails to members and Telegram notes to the
 * recruiters.
 *
 * Every email here is "reactive": it answers something a member or recruiter
 * just did, to someone already on the team, so the warm-up limit never holds
 * it back (it is still counted). A sign-in code that waits until tomorrow is a
 * locked-out member.
 *
 * "Something new" emails — a ticket reply, a phone message — are spaced ten
 * minutes apart per kind. Five codes arriving in a minute should not be five
 * emails; the first one brings them to the portal, where all five are.
 */
import { sendEmail } from "@/lib/email";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";
import { siteConfig } from "@/config/site";
import { BANKS, formatDay, formatUsd, maskIban } from "@/lib/teamShared";
import { markAlertSent, setTempPassword, type DayOff, type Payment, type StoredBank, type TeamMember, type Ticket } from "@/lib/teamStore";
import { encryptPassword, generateTempPassword, TEMP_PASSWORD_DAYS } from "@/lib/teamPassword";
import {
  teamBankHtml,
  teamBankSubject,
  teamBankText,
  teamCodeHtml,
  teamCodeSubject,
  teamCodeText,
  teamDayOffHtml,
  teamDayOffSubject,
  teamDayOffText,
  teamInviteHtml,
  teamInviteSubject,
  teamInviteText,
  teamPasswordChangedHtml,
  teamPasswordChangedSubject,
  teamPasswordChangedText,
  teamMailAlertHtml,
  teamMailAlertSubject,
  teamMailAlertText,
  teamPaymentHtml,
  teamPaymentSubject,
  teamPaymentText,
  teamPhoneHtml,
  teamPhoneSubject,
  teamPhoneText,
  teamPortalUrl,
  teamTicketHtml,
  teamTicketSubject,
  teamTicketText,
} from "@/lib/teamEmailTemplates";

const ALERT_GAP_MS = 10 * 60 * 1000;

function send(m: TeamMember, subject: string, html: string, textBody: string) {
  return sendEmail({
    to: m.loginEmail,
    toName: m.fullName,
    subject,
    html,
    text: textBody,
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "reactive",
  });
}

function log(what: string, m: TeamMember, ok: boolean, detail?: string) {
  // eslint-disable-next-line no-console
  console[ok ? "log" : "warn"](`[team] ${what} → ${m.id}${ok ? "" : ` failed: ${detail}`}`);
}

function errorOf(r: Awaited<ReturnType<typeof sendEmail>>): string {
  return r.ok ? "" : "skipped" in r ? r.skipped : r.error;
}

/** The welcome email with the member's email and a temporary password. */
export async function sendTeamInvite(m: TeamMember, tempPassword: string) {
  const e = { fullName: m.fullName, workEmail: m.workEmail ?? "", tempPassword, portalUrl: teamPortalUrl() };
  const r = await send(m, teamInviteSubject(), teamInviteHtml(e), teamInviteText(e));
  log("invite", m, r.ok, errorOf(r));
  return r;
}

/**
 * Give the member a fresh temporary password and email it to them with their
 * sign-in email. Used when adding them and when they forget their password.
 */
export async function sendLoginDetails(m: TeamMember): Promise<{ ok: boolean; reason?: string }> {
  if (!m.workEmail) return { ok: false, reason: "no_work_email" };
  const temp = generateTempPassword();
  const enc = encryptPassword(temp);
  if (!enc) return { ok: false, reason: "no_key" };
  const expiry = new Date(Date.now() + TEMP_PASSWORD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await setTempPassword(m.id, enc, expiry);
  const r = await sendTeamInvite(m, temp);
  return { ok: r.ok, reason: r.ok ? undefined : errorOf(r) };
}

/** Tells the member (on their personal address) that their password changed. */
export async function sendPasswordChanged(m: TeamMember) {
  const e = { fullName: m.fullName };
  const r = await send(m, teamPasswordChangedSubject(), teamPasswordChangedHtml(e), teamPasswordChangedText(e));
  log("password changed", m, r.ok, errorOf(r));
  return r;
}

export async function sendLoginCode(m: TeamMember, code: string) {
  const e = { fullName: m.fullName, code };
  const r = await send(m, teamCodeSubject(code), teamCodeHtml(e), teamCodeText(e));
  log("sign-in code", m, r.ok, errorOf(r));
  return r;
}

function spaced(m: TeamMember, kind: "ticket" | "phone" | "mail"): boolean {
  const last = m.alertSentAt?.[kind];
  return !last || Date.now() - Date.parse(last) >= ALERT_GAP_MS;
}

export async function alertTicket(m: TeamMember, t: Ticket, kind: "new" | "reply") {
  // A brand-new ticket always gets its email; replies are spaced out.
  if (kind === "reply" && !spaced(m, "ticket")) return;
  const e = { fullName: m.fullName, number: t.number, subject: t.subject, kind, url: `${teamPortalUrl()}/tickets/${t.id}` };
  const r = await send(m, teamTicketSubject(e), teamTicketHtml(e), teamTicketText(e));
  if (r.ok) await markAlertSent(m.id, "ticket");
  log(`ticket ${kind}`, m, r.ok, errorOf(r));
}

export async function alertPhone(m: TeamMember) {
  if (!spaced(m, "phone")) return;
  const e = { fullName: m.fullName, url: `${teamPortalUrl()}/phone` };
  const r = await send(m, teamPhoneSubject(), teamPhoneHtml(e), teamPhoneText(e));
  if (r.ok) await markAlertSent(m.id, "phone");
  log("phone message", m, r.ok, errorOf(r));
}

/**
 * New mail in the portal mailbox. The mail itself is in the Mail tab at
 * once; this note to the personal address is spaced ten minutes apart, so a
 * busy hour is one or two notes rather than one per email.
 */
export async function alertMail(m: TeamMember) {
  if (!spaced(m, "mail")) return;
  const e = { fullName: m.fullName, workEmail: m.workEmail ?? "", url: `${teamPortalUrl()}/mail` };
  const r = await send(m, teamMailAlertSubject(), teamMailAlertHtml(e), teamMailAlertText(e));
  if (r.ok) await markAlertSent(m.id, "mail");
  log("new mail", m, r.ok, errorOf(r));
}

export async function sendPaymentEmail(m: TeamMember, p: Payment) {
  const e = {
    fullName: m.fullName,
    amount: formatUsd(p.amount),
    date: formatDay(p.date),
    sentTo: p.sentTo,
    reference: p.reference,
    url: `${teamPortalUrl()}/`,
  };
  const r = await send(m, teamPaymentSubject(e.amount), teamPaymentHtml(e), teamPaymentText(e));
  log("payment", m, r.ok, errorOf(r));
}

export async function sendBankDecision(m: TeamMember, approved: boolean, b: StoredBank, reason?: string) {
  const e = {
    fullName: m.fullName,
    approved,
    bank: BANKS[b.bank].label,
    masked: maskIban(b.ibanCountry, b.last4),
    reason,
    url: `${teamPortalUrl()}/bank`,
  };
  const r = await send(m, teamBankSubject(approved), teamBankHtml(e), teamBankText(e));
  log(`bank ${approved ? "approved" : "refused"}`, m, r.ok, errorOf(r));
}

export async function sendDayOffDecision(m: TeamMember, d: DayOff) {
  const e = {
    fullName: m.fullName,
    approved: d.status === "approved",
    date: formatDay(d.date),
    note: d.note,
    url: `${teamPortalUrl()}/`,
  };
  const r = await send(m, teamDayOffSubject(e.approved, e.date), teamDayOffHtml(e), teamDayOffText(e));
  log("day off decision", m, r.ok, errorOf(r));
}

/* -------------------------------------------------------------------------- */
/* Telegram                                                                    */
/* -------------------------------------------------------------------------- */

/** The team admin panel lives on the team domain. */
function adminUrl(path: string): string {
  return `${teamPortalUrl()}${path}`;
}

/**
 * A short note to the recruiters. Never the content: no ticket text, no
 * account numbers — who, what kind of thing, and where to look.
 */
export function telegramTeam(icon: string, title: string, m: TeamMember, line: string, path: string): void {
  const message = [
    `${icon} <b>${escapeHtml(title)}</b>`,
    "",
    `<b>Member:</b> ${escapeHtml(m.fullName)}`,
    escapeHtml(line),
    "",
    adminUrl(path),
  ].join("\n");
  void sendTelegramMessage(message).catch(() => {});
}
