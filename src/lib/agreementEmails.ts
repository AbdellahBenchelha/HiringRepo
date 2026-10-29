/**
 * The final-agreement emails — see lib/agreement.
 *
 *   sent      "Your final agreement — please sign and send it back", the PDF
 *             attached, with the link to upload the signed copy
 *   updated   a new version with a new start date, replacing the one before
 *   reminder  the same, for somebody who has not sent it back yet
 *   reask     the signed copy will not do: says why, and opens their page again
 *   received  "We have your signed agreement" — sent when they upload it
 *
 * Same look as the proof-of-address emails. Pure: no I/O.
 */
import { siteConfig } from "@/config/site";

const NAVY = "#0f1035";
const AMBER = "#f5a623";
const CREAM = "#faf9f5";
const BORDER = "#eae7db";
const MUTED = "#4f4f80";
const LINK = "#b06e0c";
const QUIET = "#7373a0";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

export interface AgreementEmail {
  fullName: string;
  /** The upload page, personal to them. */
  url: string;
  /** "WR-…", printed on the PDF too. */
  ref: string;
}

export interface AgreementReaskEmail extends AgreementEmail {
  reason: string;
}

export interface AgreementUpdatedEmail extends AgreementEmail {
  /** "2 November 2026"; empty when the earlier version had none. */
  fromDate: string;
  toDate: string;
}

export const agreementSentSubject = () => "Your final agreement — please sign and send it back";
export const agreementUpdatedSubject = () => "Your agreement has been updated — new start date";
export const agreementReminderSubject = () => "Reminder: your agreement is waiting for your signature";
export const agreementReaskSubject = () => "Please send your signed agreement again";
export const agreementReceivedSubject = () => "We have received your signed agreement";

/** The file name of the attached PDF. */
export function agreementFileName(fullName: string): string {
  const safe = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `WorkRoute-Agreement${safe ? `-${safe}` : ""}.pdf`;
}

const HOW_TEXT = [
  "How to sign — choose one:",
  "  • On paper: print the agreement, sign and date it where it says",
  "    “The Contractor”, then scan it or take a clear photo of every page.",
  "  • Digitally: open the PDF in a PDF app on your phone or computer",
  "    (for example Adobe Acrobat Reader, which is free), add your signature",
  "    and the date where it says “The Contractor”, and save it.",
];

function footerText(): string[] {
  return [
    "We will never ask you for a payment of any kind, your card details or a password.",
    "",
    `Any questions, reply to this email or write to ${siteConfig.contact.recruitmentEmail}.`,
    "",
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ];
}

function sendBackText(url: string): string[] {
  return [
    "Then send it back to us — whichever is easier:",
    `  • Upload it here: ${url}`,
    "  • Or reply to this email with the signed agreement attached.",
  ];
}

function shell(o: {
  subject: string;
  preheader: string;
  heading: string;
  /** Already-escaped HTML paragraphs. */
  intro: string[];
  /** Plain text, in a highlighted box under the intro. */
  reason?: string;
  ref?: string;
  /** Show the "how to sign" box and the upload button. */
  steps?: { url: string; button: string };
}): string {
  const company = esc(siteConfig.company.name);
  const p = (html: string, bottom = 16) =>
    `<p style="margin:0 0 ${bottom}px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">${html}</p>`;
  const li = (html: string) =>
    `<tr><td valign="top" style="padding:0 10px 8px 0;font:700 15px/1.55 Arial,Helvetica,sans-serif;color:${AMBER};">&#10003;</td><td style="padding:0 0 8px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${NAVY};">${html}</td></tr>`;
  const url = o.steps ? esc(o.steps.url) : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">
    <tr><td style="padding:0 0 22px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font:800 21px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">${company}</td></tr>
        <tr><td style="padding-top:4px;font:700 10px/1 Arial,Helvetica,sans-serif;color:${LINK};letter-spacing:2px;text-transform:uppercase;">${esc(siteConfig.company.descriptor)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:38px 34px;">
      <h1 style="margin:0 0 20px 0;font:800 25px/1.25 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">${esc(o.heading)}</h1>
      ${o.intro.map((h, i) => p(h, i === o.intro.length - 1 ? 22 : 16)).join("\n      ")}
${
  o.reason
    ? `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffaf0;border:2px solid ${AMBER};border-radius:10px;margin:0 0 22px 0;">
        <tr><td style="padding:16px 20px;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${NAVY};">${esc(o.reason)}</td></tr>
      </table>
`
    : ""
}${
  o.steps
    ? `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 26px 0;">
        <tr><td style="padding:18px 20px 10px 20px;">
          <p style="margin:0 0 12px 0;font:700 15px/1.5 Arial,Helvetica,sans-serif;color:${NAVY};">How to sign &mdash; choose one:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            ${li(`<strong>On paper:</strong> print the agreement, sign and date it where it says &ldquo;The Contractor&rdquo;, then scan it or take a clear photo of every page.`)}
            ${li(`<strong>Digitally:</strong> open the PDF in a PDF app on your phone or computer (for example Adobe Acrobat Reader, which is free), add your signature and the date where it says &ldquo;The Contractor&rdquo;, and save it.`)}
          </table>
          <p style="margin:6px 0 8px 0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
            Then send it back &mdash; <strong style="color:${NAVY};">upload it with the button below</strong>, or simply reply to this email with the signed agreement attached.
          </p>
        </td></tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
        <tr><td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:15px 36px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">${esc(o.steps.button)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 6px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${QUIET};">This link is personal to you.</p>
      <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${QUIET};">
        Button not working? Copy this link into your browser:<br>
        <a href="${url}" style="color:${LINK};word-break:break-all;">${url}</a>
      </p>
`
    : ""
}      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
        <tr><td style="padding:16px 20px;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          <strong style="color:${NAVY};">We will never ask you for</strong> a payment of any kind, your card details or a password.
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 8px 0 8px;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:${QUIET};">
      ${o.ref ? `Agreement reference: ${esc(o.ref)}<br><br>` : ""}Questions? Reply to this email or write to
      <a href="mailto:${esc(siteConfig.contact.recruitmentEmail)}" style="color:${LINK};">${esc(siteConfig.contact.recruitmentEmail)}</a>.
      <br><br>
      ${company} &mdash; ${esc(siteConfig.company.descriptor)}<br>
      <a href="${esc(siteConfig.url)}" style="color:${QUIET};">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/* ---------------------------------- sent ---------------------------------- */

export function agreementSentText(e: AgreementEmail): string {
  return [
    `Congratulations, ${firstName(e.fullName)}!`,
    "",
    "Your verification is complete, and your final agreement is ready. You will find it attached to this email as a PDF.",
    "",
    "Please read it carefully. It contains your rate, your weekly hours, your start date and the work hours and days you chose. If anything is unclear or not right, reply to this email before signing.",
    "",
    ...HOW_TEXT,
    "",
    ...sendBackText(e.url),
    "",
    `Agreement reference: ${e.ref}`,
    "",
    ...footerText(),
  ].join("\n");
}

export function agreementSentHtml(e: AgreementEmail): string {
  return shell({
    subject: agreementSentSubject(),
    preheader: "Your final agreement is attached. Please read it, sign it and send it back.",
    heading: `Congratulations, ${firstName(e.fullName)}!`,
    intro: [
      `Your verification is complete, and <strong style="color:${NAVY};">your final agreement is ready</strong>. You will find it attached to this email as a PDF.`,
      "Please read it carefully. It contains your rate, your weekly hours, your start date and the work hours and days you chose. If anything is unclear or not right, reply to this email before signing.",
    ],
    ref: e.ref,
    steps: { url: e.url, button: "Upload my signed agreement" },
  });
}

/* --------------------------------- updated -------------------------------- */

function changeLine(e: AgreementUpdatedEmail): string {
  return e.fromDate
    ? `Your start date has changed from ${e.fromDate} to ${e.toDate}.`
    : `Your start date is now ${e.toDate}.`;
}

export function agreementUpdatedText(e: AgreementUpdatedEmail): string {
  return [
    `Hi ${firstName(e.fullName)},`,
    "",
    changeLine(e),
    "",
    "We have attached the updated agreement. Please sign this new version and send it back.",
    "The earlier version no longer applies — please do not sign it. If you have already signed it, please sign this one instead.",
    "",
    ...HOW_TEXT,
    "",
    ...sendBackText(e.url),
    "",
    `Agreement reference: ${e.ref}`,
    "",
    ...footerText(),
  ].join("\n");
}

export function agreementUpdatedHtml(e: AgreementUpdatedEmail): string {
  return shell({
    subject: agreementUpdatedSubject(),
    preheader: `${changeLine(e)} Please sign the updated agreement attached.`,
    heading: "Your agreement has been updated",
    intro: [
      `Hi ${esc(firstName(e.fullName))},`,
      `We have attached the updated agreement. Please sign <strong style="color:${NAVY};">this new version</strong> and send it back. The earlier version no longer applies &mdash; please do not sign it. If you have already signed it, please sign this one instead.`,
    ],
    reason: changeLine(e),
    ref: e.ref,
    steps: { url: e.url, button: "Upload my signed agreement" },
  });
}

/* -------------------------------- reminder -------------------------------- */

export function agreementReminderText(e: AgreementEmail): string {
  return [
    `Hi ${firstName(e.fullName)},`,
    "",
    "Your final agreement is waiting for your signature. We have attached it again to this email, so you have it to hand.",
    "",
    ...HOW_TEXT,
    "",
    ...sendBackText(e.url),
    "",
    `Agreement reference: ${e.ref}`,
    "",
    ...footerText(),
  ].join("\n");
}

export function agreementReminderHtml(e: AgreementEmail): string {
  return shell({
    subject: agreementReminderSubject(),
    preheader: "Your final agreement is waiting for your signature — attached again here.",
    heading: "Your agreement is waiting for you",
    intro: [
      `Hi ${esc(firstName(e.fullName))},`,
      `Your final agreement is <strong style="color:${NAVY};">waiting for your signature</strong>. We have attached it again to this email, so you have it to hand.`,
    ],
    ref: e.ref,
    steps: { url: e.url, button: "Upload my signed agreement" },
  });
}

/* ---------------------------------- reask --------------------------------- */

export function agreementReaskText(e: AgreementReaskEmail): string {
  return [
    `Hi ${firstName(e.fullName)},`,
    "",
    "Thank you for sending your signed agreement. Unfortunately we could not accept the copy you sent:",
    "",
    e.reason,
    "",
    "The agreement is attached again. Please sign it and send it back using the link below, or by replying to this email.",
    "",
    ...HOW_TEXT,
    "",
    ...sendBackText(e.url),
    "",
    `Agreement reference: ${e.ref}`,
    "",
    ...footerText(),
  ].join("\n");
}

export function agreementReaskHtml(e: AgreementReaskEmail): string {
  return shell({
    subject: agreementReaskSubject(),
    preheader: "We could not accept the signed copy you sent — please send it again.",
    heading: "Please send your signed agreement again",
    intro: [
      `Hi ${esc(firstName(e.fullName))},`,
      "Thank you for sending your signed agreement. Unfortunately we could not accept the copy you sent:",
    ],
    reason: e.reason,
    ref: e.ref,
    steps: { url: e.url, button: "Upload my signed agreement" },
  });
}

/* -------------------------------- received -------------------------------- */

export function agreementReceivedText(e: Pick<AgreementEmail, "fullName" | "ref">): string {
  return [
    `Hi ${firstName(e.fullName)},`,
    "",
    "Thank you — we have received your signed agreement. Our team will check it and confirm the next steps with you shortly.",
    "",
    "There is nothing else you need to do for now.",
    "",
    `Agreement reference: ${e.ref}`,
    "",
    ...footerText(),
  ].join("\n");
}

export function agreementReceivedHtml(e: Pick<AgreementEmail, "fullName" | "ref">): string {
  return shell({
    subject: agreementReceivedSubject(),
    preheader: "Thank you — your signed agreement has arrived.",
    heading: "Thank you — we have your signed agreement",
    intro: [
      `Hi ${esc(firstName(e.fullName))},`,
      "Our team will check it and confirm the next steps with you shortly. There is nothing else you need to do for now.",
    ],
    ref: e.ref,
  });
}
