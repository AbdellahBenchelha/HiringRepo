/**
 * SERVER-ONLY. The emails the team portal sends to members.
 *
 * Same rules as lib/emailTemplates: tables, inline styles, no remote images,
 * and a plain-text part for every one. They are deliberately short and never
 * carry the content itself — a ticket, a phone message, a bank account — only
 * that something is waiting, and a button to the portal where it is read
 * behind a sign-in. An inbox is easy to forward; the portal is not.
 */
import { siteConfig } from "@/config/site";
import { teamPortalUrl } from "@/lib/teamHost";

const NAVY = "#0f1035";
const CREAM = "#faf9f5";
const BORDER = "#eae7db";
const MUTED = "#4f4f80";
const LINK = "#b06e0c";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

export { teamPortalUrl };

interface Shell {
  subject: string;
  preheader: string;
  heading: string;
  /** Already-escaped HTML paragraphs. */
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Small print under the button. */
  note?: string;
}

function shell(s: Shell): string {
  const company = esc(siteConfig.company.name);
  const p = (html: string) =>
    `<p style="margin:0 0 14px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">${html}</p>`;
  const button = s.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px 0;"><tr>
         <td style="border-radius:10px;background:${NAVY};">
           <a href="${esc(s.button.url)}" style="display:inline-block;padding:14px 26px;font:700 15px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(s.button.label)}</a>
         </td></tr></table>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(s.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
  <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">
    <tr>
      <td style="padding:0 0 22px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="font:800 21px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">${company}</td></tr>
          <tr><td style="padding-top:4px;font:700 10px/1 Arial,Helvetica,sans-serif;color:${LINK};letter-spacing:2px;text-transform:uppercase;">Team portal</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:34px 32px;">
        <h1 style="margin:0 0 16px 0;font:800 22px/1.3 Arial,Helvetica,sans-serif;color:${NAVY};">${esc(s.heading)}</h1>
        ${s.paragraphs.map(p).join("\n        ")}
        ${button}
        ${s.note ? `<p style="margin:0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">${s.note}</p>` : ""}
      </td>
    </tr>
    <tr>
      <td style="padding:22px 8px 0 8px;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:#7373a0;">
        ${company} will never ask for your card number, PIN or online-banking password — not by email, phone or in the portal.
        <br><br>
        ${company} &mdash; ${esc(siteConfig.company.descriptor)}<br>
        <a href="${esc(teamPortalUrl())}" style="color:#7373a0;">${esc(teamPortalUrl().replace(/^https?:\/\//, ""))}</a>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

function text(lines: (string | false | undefined)[]): string {
  return [
    ...lines.filter((l): l is string => typeof l === "string"),
    "",
    `${siteConfig.company.name} will never ask for your card number, PIN or online-banking password.`,
    `${siteConfig.company.name} — Team portal`,
    teamPortalUrl(),
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Welcome                                                                     */
/* -------------------------------------------------------------------------- */

export interface TeamInviteEmail {
  fullName: string;
  workEmail: string;
  tempPassword: string;
  portalUrl: string;
  /** "Monday, 9 November 2026" — their first work day. */
  startDate?: string;
  /** Not activated yet: say that bank details are needed first. */
  needsActivation?: boolean;
}

const ACTIVATE_TEXT =
  "Important: add your bank details in the portal (Bank tab) to activate your account. Your account becomes active once we have checked and approved them — we can only count your hours and pay you after that.";

export function teamInviteSubject(): string {
  return `Welcome to the ${siteConfig.company.name} team — your login details`;
}

export function teamInviteText(e: TeamInviteEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    `Welcome to the ${siteConfig.company.name} team. Your personal team portal is ready.`,
    "In it you will find your profile, your tickets, your work phone number and its messages,",
    "your hours and earnings, and where to add your bank account for payments.",
    "",
    "Your login details:",
    `  Sign in here:      ${e.portalUrl}/login`,
    `  Email:             ${e.workEmail}`,
    `  Temporary password: ${e.tempPassword}`,
    "",
    "When you first sign in, you will be asked to choose your own password.",
    "The temporary password above works for 7 days.",
    ...(e.startDate ? ["", `Your work starts on ${e.startDate}.`] : []),
    ...(e.needsActivation ? ["", ACTIVATE_TEXT] : []),
    "",
    "Keep these details to yourself. We will never ask you for your password,",
    "your card number, your PIN or any bank code.",
  ]);
}

export function teamInviteHtml(e: TeamInviteEmail): string {
  const box = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;color:#6b6b8a;font-size:13px;">${esc(label)}</td></tr>` +
    `<tr><td style="padding:0 0 10px;"><span style="display:inline-block;padding:8px 12px;border:1px solid ${BORDER};border-radius:8px;background:${CREAM};font:700 16px/1.2 'Courier New',monospace;color:${NAVY};">${esc(value)}</span></td></tr>`;
  return shell({
    subject: teamInviteSubject(),
    preheader: "Your email, your temporary password, and where to sign in.",
    heading: `Welcome to the team, ${firstNameOf(e.fullName)}`,
    paragraphs: [
      `Your personal ${esc(siteConfig.company.name)} team portal is ready.`,
      "In it you will find your profile, your tickets, your work phone number and its messages, your hours and earnings, and where to add your bank account for payments.",
      `Here are your login details:<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;">${box("Email", e.workEmail)}${box("Temporary password", e.tempPassword)}</table>`,
      "When you first sign in, you will be asked to choose your own password. The temporary password above works for 7 days.",
      ...(e.startDate ? [`Your work starts on <strong style="color:${NAVY};">${esc(e.startDate)}</strong>.`] : []),
      ...(e.needsActivation
        ? [
            `<span style="display:block;padding:14px 16px;border:2px solid #f5a524;border-radius:10px;background:#fffaf0;color:${NAVY};"><strong>Required: add your bank details to activate your account.</strong><br>Open the Bank tab in the portal and add your account. Your account becomes active once we have checked and approved them &mdash; we can only count your hours and pay you after that.</span>`,
          ]
        : []),
    ],
    button: { label: "Sign in to my portal", url: `${e.portalUrl}/login` },
    note: `Keep these details to yourself. ${esc(siteConfig.company.name)} will never ask you for your password, your card number, your PIN or any bank code.`,
  });
}

/* -------------------------------------------------------------------------- */
/* Password changed                                                            */
/* -------------------------------------------------------------------------- */

export function teamPasswordChangedSubject(): string {
  return `Your ${siteConfig.company.name} portal password was changed`;
}

export function teamPasswordChangedText(e: { fullName: string }): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    "This is to confirm that the password for your team portal was just changed.",
    "",
    "If this was you, there is nothing to do.",
    "If this was NOT you, please contact your manager straight away.",
  ]);
}

export function teamPasswordChangedHtml(e: { fullName: string }): string {
  return shell({
    subject: teamPasswordChangedSubject(),
    preheader: "If this was not you, contact your manager.",
    heading: "Your password was changed",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))}, this confirms that the password for your team portal was just changed.`,
      "If this was you, there is nothing to do.",
      "<strong>If this was not you</strong>, please contact your manager straight away.",
    ],
  });
}

/* -------------------------------------------------------------------------- */
/* Ticket                                                                      */
/* -------------------------------------------------------------------------- */

export interface TeamTicketEmail {
  fullName: string;
  number: number;
  subject: string;
  kind: "new" | "reply";
  url: string;
}

export function teamTicketSubject(e: Pick<TeamTicketEmail, "number" | "kind">): string {
  return e.kind === "new" ? `New ticket #${e.number} in your team portal` : `New reply on ticket #${e.number}`;
}

export function teamTicketText(e: TeamTicketEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    e.kind === "new"
      ? `You have a new ticket: #${e.number} — ${e.subject}`
      : `There is a new reply on ticket #${e.number} — ${e.subject}`,
    "",
    `Sign in to read it: ${e.url}`,
  ]);
}

export function teamTicketHtml(e: TeamTicketEmail): string {
  return shell({
    subject: teamTicketSubject(e),
    preheader: e.kind === "new" ? "Sign in to your portal to read it." : "Sign in to your portal to read the reply.",
    heading: e.kind === "new" ? "You have a new ticket" : "New reply on your ticket",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      `<strong style="color:${NAVY};">#${e.number} — ${esc(e.subject)}</strong>`,
      "Sign in to your team portal to read it and reply.",
    ],
    button: { label: "Open the ticket", url: e.url },
  });
}

/* -------------------------------------------------------------------------- */
/* Phone message                                                               */
/* -------------------------------------------------------------------------- */

export interface TeamPhoneEmail {
  fullName: string;
  url: string;
}

export function teamPhoneSubject(): string {
  return "You have a new message on your work number";
}

export function teamPhoneText(e: TeamPhoneEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    "A new message has arrived on the phone number we gave you.",
    `Sign in to read it: ${e.url}`,
  ]);
}

export function teamPhoneHtml(e: TeamPhoneEmail): string {
  return shell({
    subject: teamPhoneSubject(),
    preheader: "Sign in to your portal to read it.",
    heading: "New message on your work number",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      "A new message has arrived on the phone number we gave you. For your security, it is only shown in your portal.",
    ],
    button: { label: "Read the message", url: e.url },
  });
}

/* -------------------------------------------------------------------------- */
/* Payment                                                                     */
/* -------------------------------------------------------------------------- */

export interface TeamPaymentEmail {
  fullName: string;
  amount: string;
  date: string;
  sentTo?: string;
  reference?: string;
  url: string;
}

export function teamPaymentSubject(amount: string): string {
  return `Payment sent: ${amount}`;
}

export function teamPaymentText(e: TeamPaymentEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    `We have sent you a payment of ${e.amount} on ${e.date}${e.sentTo ? `, to your ${e.sentTo} account` : ""}.`,
    e.reference ? `Reference: ${e.reference}` : undefined,
    "Depending on your bank it can take 1–3 working days to arrive.",
    "",
    `Your earnings and payments: ${e.url}`,
  ]);
}

export function teamPaymentHtml(e: TeamPaymentEmail): string {
  return shell({
    subject: teamPaymentSubject(e.amount),
    preheader: `${e.amount} is on its way to you.`,
    heading: `${e.amount} is on its way`,
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      `We have sent you a payment of <strong style="color:${NAVY};">${esc(e.amount)}</strong> on ${esc(e.date)}${
        e.sentTo ? `, to your <strong style="color:${NAVY};">${esc(e.sentTo)}</strong> account` : ""
      }.`,
      ...(e.reference ? [`Reference: ${esc(e.reference)}`] : []),
      "Depending on your bank it can take 1–3 working days to arrive.",
    ],
    button: { label: "See my earnings", url: e.url },
  });
}

/* -------------------------------------------------------------------------- */
/* Bank account decision                                                       */
/* -------------------------------------------------------------------------- */

export interface TeamBankEmail {
  fullName: string;
  approved: boolean;
  bank: string;
  masked: string;
  reason?: string;
  url: string;
  /** This approval activated the account: from when hours are counted. */
  activatedFrom?: string;
}

export function teamBankSubject(approved: boolean, activated = false): string {
  if (approved && activated) return "Your bank account is approved — your account is active";
  return approved ? "Your bank account is approved" : "Please check your bank details";
}

export function teamBankText(e: TeamBankEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    e.approved
      ? `Your ${e.bank} account (${e.masked}) is approved. Your payments will be sent to it.`
      : `We could not approve the ${e.bank} account you added (${e.masked}).`,
    !e.approved && e.reason ? `Reason: ${e.reason}` : undefined,
    !e.approved ? "Please sign in and enter your details again." : undefined,
    e.activatedFrom ? "" : undefined,
    e.activatedFrom ? `Your account is now active. Your hours are counted from ${e.activatedFrom}.` : undefined,
    !e.approved ? "Your account becomes active once your bank details are approved." : undefined,
    "",
    e.url,
  ]);
}

export function teamBankHtml(e: TeamBankEmail): string {
  return shell({
    subject: teamBankSubject(e.approved, !!e.activatedFrom),
    preheader: e.activatedFrom
      ? "Your account is now active."
      : e.approved
        ? "Your payments will be sent to it."
        : "Please sign in and enter them again.",
    heading: e.activatedFrom ? "Your account is active" : e.approved ? "Your bank account is approved" : "Please check your bank details",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      e.approved
        ? `Your <strong style="color:${NAVY};">${esc(e.bank)}</strong> account (${esc(e.masked)}) is approved. Your payments will be sent to it.`
        : `We could not approve the <strong style="color:${NAVY};">${esc(e.bank)}</strong> account you added (${esc(e.masked)}).`,
      ...(!e.approved && e.reason ? [`Reason: ${esc(e.reason)}`] : []),
      ...(!e.approved ? ["Please sign in and enter your details again. Your account becomes active once your bank details are approved."] : []),
      ...(e.activatedFrom
        ? [`Your account is now <strong style="color:${NAVY};">active</strong>. Your hours are counted from <strong style="color:${NAVY};">${esc(e.activatedFrom)}</strong>.`]
        : []),
    ],
    button: { label: e.approved ? "Open my portal" : "Update my bank details", url: e.url },
  });
}

/* -------------------------------------------------------------------------- */
/* Account activated by a recruiter                                            */
/* -------------------------------------------------------------------------- */

export interface TeamActivatedEmail {
  fullName: string;
  /** From when hours are counted. */
  countedFrom: string;
  /** No approved bank account yet: ask for it, for the payments. */
  needsBank: boolean;
  url: string;
}

export function teamActivatedSubject(): string {
  return `Your ${siteConfig.company.name} account is active`;
}

export function teamActivatedText(e: TeamActivatedEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    `Your ${siteConfig.company.name} team account is now active. Your hours are counted from ${e.countedFrom}.`,
    e.needsBank ? "Please add your bank details in the portal (Bank tab) so we can pay you." : undefined,
    "",
    e.url,
  ]);
}

export function teamActivatedHtml(e: TeamActivatedEmail): string {
  return shell({
    subject: teamActivatedSubject(),
    preheader: `Your hours are counted from ${e.countedFrom}.`,
    heading: "Your account is active",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      `Your ${esc(siteConfig.company.name)} team account is now <strong style="color:${NAVY};">active</strong>. Your hours are counted from <strong style="color:${NAVY};">${esc(e.countedFrom)}</strong>.`,
      ...(e.needsBank ? ["Please add your bank details in the portal (Bank tab) so we can pay you."] : []),
    ],
    button: { label: e.needsBank ? "Add my bank details" : "Open my portal", url: e.url },
  });
}

/* -------------------------------------------------------------------------- */
/* Day off decision                                                            */
/* -------------------------------------------------------------------------- */

export interface TeamDayOffEmail {
  fullName: string;
  approved: boolean;
  date: string;
  note?: string;
  url: string;
}

export function teamDayOffSubject(approved: boolean, date: string): string {
  return approved ? `Day off approved: ${date}` : `Day off not approved: ${date}`;
}

export function teamDayOffText(e: TeamDayOffEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    e.approved ? `Your day off on ${e.date} is approved.` : `Your day off on ${e.date} was not approved.`,
    e.note ? `Note: ${e.note}` : undefined,
    "",
    e.url,
  ]);
}

export function teamDayOffHtml(e: TeamDayOffEmail): string {
  return shell({
    subject: teamDayOffSubject(e.approved, e.date),
    preheader: e.approved ? "Enjoy your day." : "Please plan to work as usual.",
    heading: e.approved ? "Your day off is approved" : "Your day off was not approved",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      e.approved
        ? `Your day off on <strong style="color:${NAVY};">${esc(e.date)}</strong> is approved.`
        : `Your day off on <strong style="color:${NAVY};">${esc(e.date)}</strong> was not approved. Please plan to work as usual.`,
      ...(e.note ? [`Note: ${esc(e.note)}`] : []),
    ],
    button: { label: "Open my portal", url: e.url },
  });
}

/* -------------------------------------------------------------------------- */
/* New mail in the portal mailbox                                              */
/* -------------------------------------------------------------------------- */

export interface TeamMailAlertEmail {
  fullName: string;
  workEmail: string;
  url: string;
}

export function teamMailAlertSubject(): string {
  return "You have new email in your WorkRoute mailbox";
}

export function teamMailAlertText(e: TeamMailAlertEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    `New email has arrived for ${e.workEmail}.`,
    `Sign in to read it: ${e.url}`,
  ]);
}

export function teamMailAlertHtml(e: TeamMailAlertEmail): string {
  return shell({
    subject: teamMailAlertSubject(),
    preheader: "Sign in to your portal to read it.",
    heading: "You have new email",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      `New email has arrived for <strong style="color:${NAVY};">${esc(e.workEmail)}</strong>. It is in the Mail tab of your team portal.`,
    ],
    button: { label: "Open my mail", url: e.url },
  });
}
