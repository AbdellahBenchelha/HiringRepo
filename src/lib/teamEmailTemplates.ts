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
  loginEmail: string;
  portalUrl: string;
}

export function teamInviteSubject(): string {
  return `Welcome to the ${siteConfig.company.name} team — your portal is ready`;
}

export function teamInviteText(e: TeamInviteEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    `Welcome to the ${siteConfig.company.name} team. Your personal team portal is ready.`,
    "In it you will find your profile, your tickets, your work phone number and its messages,",
    "your hours and earnings, and where to add your bank account for payments.",
    "",
    `Sign in here: ${e.portalUrl}/login`,
    `Use this email address: ${e.loginEmail}`,
    "We will email you a 6-digit code each time you sign in — there is no password.",
  ]);
}

export function teamInviteHtml(e: TeamInviteEmail): string {
  return shell({
    subject: teamInviteSubject(),
    preheader: "Your profile, tickets, phone messages, hours and pay — all in one place.",
    heading: `Welcome to the team, ${firstNameOf(e.fullName)}`,
    paragraphs: [
      `Your personal ${esc(siteConfig.company.name)} team portal is ready.`,
      "In it you will find your profile, your tickets, your work phone number and its messages, your hours and earnings, and where to add your bank account for payments.",
      `Sign in with this email address: <strong style="color:${NAVY};">${esc(e.loginEmail)}</strong>. We email you a 6-digit code each time — there is no password to remember.`,
    ],
    button: { label: "Open my portal", url: `${e.portalUrl}/login` },
    note: `Or copy this link: <a href="${esc(e.portalUrl)}/login" style="color:${LINK};">${esc(e.portalUrl)}/login</a>`,
  });
}

/* -------------------------------------------------------------------------- */
/* Sign-in code                                                                */
/* -------------------------------------------------------------------------- */

export interface TeamCodeEmail {
  fullName: string;
  code: string;
}

export function teamCodeSubject(code: string): string {
  return `${code} is your ${siteConfig.company.name} sign-in code`;
}

export function teamCodeText(e: TeamCodeEmail): string {
  return text([
    `Hi ${firstNameOf(e.fullName)},`,
    "",
    `Your sign-in code is: ${e.code}`,
    "",
    "It works for 10 minutes. If you did not try to sign in, you can ignore this email —",
    "nobody can sign in without the code.",
    "Never share this code with anyone, including someone saying they are from our team.",
  ]);
}

export function teamCodeHtml(e: TeamCodeEmail): string {
  return shell({
    subject: teamCodeSubject(e.code),
    preheader: "It works for 10 minutes.",
    heading: "Your sign-in code",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))}, here is your code for the team portal:`,
      `<span style="display:inline-block;padding:12px 18px;border:1px solid ${BORDER};border-radius:10px;background:${CREAM};font:800 30px/1 'Courier New',monospace;letter-spacing:6px;color:${NAVY};">${esc(e.code)}</span>`,
      "It works for 10 minutes. If you did not try to sign in, ignore this email — nobody can sign in without the code.",
    ],
    note: "Never share this code with anyone, including someone saying they are from our team.",
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
}

export function teamBankSubject(approved: boolean): string {
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
    "",
    e.url,
  ]);
}

export function teamBankHtml(e: TeamBankEmail): string {
  return shell({
    subject: teamBankSubject(e.approved),
    preheader: e.approved ? "Your payments will be sent to it." : "Please sign in and enter them again.",
    heading: e.approved ? "Your bank account is approved" : "Please check your bank details",
    paragraphs: [
      `Hi ${esc(firstNameOf(e.fullName))},`,
      e.approved
        ? `Your <strong style="color:${NAVY};">${esc(e.bank)}</strong> account (${esc(e.masked)}) is approved. Your payments will be sent to it.`
        : `We could not approve the <strong style="color:${NAVY};">${esc(e.bank)}</strong> account you added (${esc(e.masked)}).`,
      ...(!e.approved && e.reason ? [`Reason: ${esc(e.reason)}`] : []),
      ...(!e.approved ? ["Please sign in and enter your details again."] : []),
    ],
    button: { label: e.approved ? "Open my portal" : "Update my bank details", url: e.url },
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
