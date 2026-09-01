/**
 * SERVER-ONLY HTML email templates.
 *
 * Email clients are not browsers. These templates therefore use table layout,
 * inline styles, and no external assets:
 *   - Outlook renders through Word, which ignores flexbox, grid and float.
 *   - Gmail strips <style> blocks in several contexts, so every rule is inline.
 *   - Remote images are blocked by default, so the logo is drawn with styled
 *     table cells rather than an <img>.
 * Every message also ships a plain-text part, which some corporate filters
 * require and which raises deliverability.
 */
import { siteConfig } from "@/config/site";

const NAVY = "#0f1035";
const AMBER = "#f5a623";
const CREAM = "#faf9f5";
const BORDER = "#eae7db";
const MUTED = "#4f4f80";

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

export interface InterviewInvite {
  fullName: string;
  interviewUrl: string;
  position?: string;
}

/**
 * Subject line for the assessment invitation.
 *
 * Deliberately does not name the role. "Customer Support Representative" is 31
 * characters on its own, which pushed the subject past 55 and got it cut off
 * on a phone — where most candidates read it. The role is named in the first
 * line of the email instead, where there is room for it.
 *
 * Leads with the verb so the inbox line says what to do, and carries the
 * company name so it is recognisable next to every other application they have
 * open.
 */
export function interviewInviteSubject(_position?: string): string {
  return `Complete your ${siteConfig.company.name} online assessment`;
}

/** Plain-text part. Kept readable on its own, not a stripped-tag afterthought. */
export function interviewInviteText({ fullName, interviewUrl, position }: InterviewInvite): string {
  const name = firstNameOf(fullName);
  return [
    `Hi ${name},`,
    ``,
    `Thank you for applying to ${siteConfig.company.name}${position ? ` for the ${position} role` : ""}.`,
    ``,
    `The next step is a short online assessment. It takes about 20-30 minutes and`,
    `covers customer-service scenarios, communication, and a few questions about`,
    `how you approach the work.`,
    ``,
    `Start your assessment:`,
    interviewUrl,
    ``,
    `Before you begin:`,
    `- Set aside a quiet 30 minutes; the assessment cannot be paused.`,
    `- You cannot return to a previous section, so read each question carefully.`,
    `- The link is personal to you. Please do not share it.`,
    `- It can only be used once.`,
    ``,
    `Once you submit, our recruitment team will review your answers and contact`,
    `you about the next steps.`,
    ``,
    `If you have questions, reply to this email or write to ${siteConfig.contact.recruitmentEmail}.`,
    ``,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

/** HTML part. */
export function interviewInviteHtml({ fullName, interviewUrl, position }: InterviewInvite): string {
  const name = esc(firstNameOf(fullName));
  const url = esc(interviewUrl);
  const company = esc(siteConfig.company.name);
  const role = position ? ` for the <strong>${esc(position)}</strong> role` : "";

  const tip = (text: string) => `
    <tr>
      <td style="padding:0 0 10px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
        <span style="color:${AMBER};font-weight:700;">&bull;</span>&nbsp; ${text}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(interviewInviteSubject(position))}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<!-- Preheader: shown in the inbox preview, hidden in the body. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Your assessment link is inside — it takes about 20-30 minutes.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

    <!-- Header -->
    <tr>
      <td style="padding:0 0 22px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font:800 21px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">
              ${company}
            </td>
          </tr>
          <tr>
            <td style="padding-top:4px;font:700 10px/1 Arial,Helvetica,sans-serif;color:#b06e0c;letter-spacing:2px;text-transform:uppercase;">
              ${esc(siteConfig.company.descriptor)}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Card -->
    <tr>
      <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:38px 34px;">

        <h1 style="margin:0 0 20px 0;font:800 25px/1.25 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">
          You're invited to complete your assessment
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Hi ${name},
        </p>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Thank you for applying to ${company}${role}. We've received your application, and
          the next step is a short online assessment.
        </p>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          It takes about <strong style="color:${NAVY};">20&ndash;30 minutes</strong> and covers
          customer-service scenarios, communication, and how you approach the work.
        </p>

        <!-- Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}"
                 style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Start your assessment
              </a>
            </td>
          </tr>
        </table>

        <!-- Before you begin -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 12px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                Before you begin
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${tip("Set aside a quiet 30 minutes &mdash; the assessment cannot be paused.")}
                ${tip("You cannot return to a previous section, so read each question carefully.")}
                ${tip("This link is personal to you. Please do not share it.")}
                ${tip("It can only be used once.")}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 0 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Once you submit, our recruitment team will review your answers and contact you
          about the next steps.
        </p>

        <p style="margin:20px 0 0 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:22px 8px 0 8px;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:#7373a0;">
        Questions? Reply to this email or write to
        <a href="mailto:${esc(siteConfig.contact.recruitmentEmail)}" style="color:#b06e0c;">${esc(siteConfig.contact.recruitmentEmail)}</a>.
        <br><br>
        ${company} &mdash; ${esc(siteConfig.company.descriptor)}<br>
        <a href="${esc(siteConfig.url)}" style="color:#7373a0;">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a>
        <br><br>
        You received this because you applied for a role at ${company}.
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Subject for the reminder chasing an unfinished assessment.
 *
 * Deliberately echoes the invitation — same verb, same company, prefixed with
 * "Reminder" — so the two read as one thread rather than two unrelated emails.
 * The role is left out for the same reason as the invitation: it does not fit.
 */
export function reminderSubject(_position?: string): string {
  return `Reminder: complete your ${siteConfig.company.name} assessment`;
}

/** Plain-text part of the reminder. */
export function reminderText({ fullName, interviewUrl, position }: InterviewInvite): string {
  const name = firstNameOf(fullName);
  return [
    `Hi ${name},`,
    ``,
    `We noticed you haven't completed your online assessment${position ? ` for the ${position} role` : ""} yet.`,
    ``,
    `Your place is still open and your link still works:`,
    interviewUrl,
    ``,
    `It takes about 20-30 minutes. Once you submit, our recruitment team will`,
    `review your answers and get back to you about next steps.`,
    ``,
    `If you would rather not continue, that is completely fine — just reply to`,
    `this email and let us know, and we will close your application.`,
    ``,
    `Any questions, write to ${siteConfig.contact.recruitmentEmail}.`,
    ``,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

/**
 * HTML part of the reminder.
 *
 * Shorter and lighter than the invitation on purpose. The candidate has
 * already had the full explanation; repeating it makes the second message feel
 * like the first one failed to land. The offer to withdraw is deliberate too —
 * it gives a disengaged candidate an easy exit instead of silence, which keeps
 * the pipeline honest and stops the recruiter chasing someone who is gone.
 */
export function reminderHtml({ fullName, interviewUrl, position }: InterviewInvite): string {
  const name = esc(firstNameOf(fullName));
  const url = esc(interviewUrl);
  const company = esc(siteConfig.company.name);
  const role = position ? ` for the <strong>${esc(position)}</strong> role` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(reminderSubject(position))}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Your assessment link is still active — it takes about 20-30 minutes.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

    <tr>
      <td style="padding:0 0 22px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="font:800 21px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">${company}</td></tr>
          <tr><td style="padding-top:4px;font:700 10px/1 Arial,Helvetica,sans-serif;color:#b06e0c;letter-spacing:2px;text-transform:uppercase;">${esc(siteConfig.company.descriptor)}</td></tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:38px 34px;">

        <h1 style="margin:0 0 20px 0;font:800 25px/1.25 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">
          Your assessment is still waiting
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Hi ${name},
        </p>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          We noticed you haven't completed your online assessment${role} yet. Your place is
          still open, and your link still works.
        </p>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          It takes about <strong style="color:${NAVY};">20&ndash;30 minutes</strong>. Once you
          submit, our recruitment team will review your answers and get back to you.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Complete your assessment
              </a>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              Changed your mind? That's completely fine &mdash; just reply to this email and
              we'll close your application, no hard feelings.
            </td>
          </tr>
        </table>

        <p style="margin:20px 0 0 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

      </td>
    </tr>

    <tr>
      <td style="padding:22px 8px 0 8px;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:#7373a0;">
        Questions? Reply to this email or write to
        <a href="mailto:${esc(siteConfig.contact.recruitmentEmail)}" style="color:#b06e0c;">${esc(siteConfig.contact.recruitmentEmail)}</a>.
        <br><br>
        ${company} &mdash; ${esc(siteConfig.company.descriptor)}<br>
        <a href="${esc(siteConfig.url)}" style="color:#7373a0;">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Asking a candidate to verify their identity.
 *
 * Sent only when a recruiter presses Request verification on someone whose
 * country is not on the list — everyone on the list is asked in the browser,
 * straight after their assessment, and never needs an email.
 *
 * The tone matters more here than in any other message we send. Being asked
 * for a passport out of the blue, by email, is exactly what a recruitment scam
 * looks like, so this says plainly what is wanted, why, and what happens to
 * the pictures — and sends them to the same link they already used, rather
 * than to a new address they have no reason to trust.
 */
export function verificationRequestSubject(): string {
  return `Confirm your identity to continue with ${siteConfig.company.name}`;
}

/** Plain-text part of the verification request. */
export function verificationRequestText({ fullName, interviewUrl, position }: InterviewInvite): string {
  const name = firstNameOf(fullName);
  return [
    `Hi ${name},`,
    ``,
    `Thank you for completing your assessment${position ? ` for the ${position} role` : ""}.`,
    ``,
    `Before we take your application further, we need to confirm you are who`,
    `you say you are. Please open your link below and upload two photographs:`,
    ``,
    `  1. Your passport, national ID card or driver's licence`,
    `  2. A photo of you holding it, with your face and the document both visible`,
    ``,
    interviewUrl,
    ``,
    `It takes about a minute from a phone.`,
    ``,
    `Your photographs are stored privately, seen only by our recruitment team,`,
    `and used only to confirm your identity. We never share them with anyone`,
    `else, and we will never ask you for a payment, a bank card, or a password.`,
    ``,
    `Any questions, write to ${siteConfig.contact.recruitmentEmail}.`,
    ``,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

/** HTML part of the verification request. */
export function verificationRequestHtml({ fullName, interviewUrl, position }: InterviewInvite): string {
  const name = esc(firstNameOf(fullName));
  const url = esc(interviewUrl);
  const company = esc(siteConfig.company.name);
  const role = position ? ` for the <strong>${esc(position)}</strong> role` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(verificationRequestSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Two photographs, about a minute from your phone.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

    <tr>
      <td style="padding:0 0 22px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="font:800 21px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">${company}</td></tr>
          <tr><td style="padding-top:4px;font:700 10px/1 Arial,Helvetica,sans-serif;color:#b06e0c;letter-spacing:2px;text-transform:uppercase;">${esc(siteConfig.company.descriptor)}</td></tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:38px 34px;">

        <h1 style="margin:0 0 20px 0;font:800 25px/1.25 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">
          One last step: confirm your identity
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Hi ${name},
        </p>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Thank you for completing your assessment${role}. Before we take your application
          further, we need to confirm your identity.
        </p>

        <p style="margin:0 0 12px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Open your link and upload two photographs:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          <tr>
            <td style="padding:0 0 10px 0;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              <strong style="color:${NAVY};">1.</strong>&nbsp; Your passport, national ID card or driver's licence
            </td>
          </tr>
          <tr>
            <td style="font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              <strong style="color:${NAVY};">2.</strong>&nbsp; A photo of you holding it, with your face and the document both visible
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Confirm my identity
              </a>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              Your photographs are stored privately, seen only by our recruitment team, and used
              only to confirm your identity. We will <strong style="color:${NAVY};">never</strong>
              ask you for a payment, a bank card, or a password.
            </td>
          </tr>
        </table>

        <p style="margin:20px 0 0 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

      </td>
    </tr>

    <tr>
      <td style="padding:22px 8px 0 8px;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:#7373a0;">
        Questions? Reply to this email or write to
        <a href="mailto:${esc(siteConfig.contact.recruitmentEmail)}" style="color:#b06e0c;">${esc(siteConfig.contact.recruitmentEmail)}</a>.
        <br><br>
        ${company} &mdash; ${esc(siteConfig.company.descriptor)}<br>
        <a href="${esc(siteConfig.url)}" style="color:#7373a0;">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

export interface OfferEmail {
  fullName: string;
  position: string;
  /** Already formatted, e.g. "$22 per hour". */
  rate: string;
  engagement: string;
  hoursPerWeek?: number;
  startDate?: string;
  probation?: string;
  note?: string;
}

/**
 * The written job offer.
 *
 * Written, and by email, on purpose. An offer agreed only on a call is a
 * disagreement waiting to happen about what the rate was, and a candidate
 * about to leave another job deserves something they can re-read.
 *
 * It is an offer, not a contract. It says so, because a candidate who treats
 * this as the final word and resigns on the strength of it is a problem for
 * both sides.
 */
export function offerSubject(position: string): string {
  return `Job offer — ${position} at ${siteConfig.company.name}`;
}

function offerRows(o: OfferEmail): [string, string][] {
  const rows: [string, string][] = [
    ["Position", o.position],
    ["Pay", o.rate],
    ["Engagement", o.engagement],
  ];
  if (o.hoursPerWeek) rows.push(["Hours", `${o.hoursPerWeek} per week`]);
  if (o.startDate) {
    rows.push([
      "Start date",
      new Date(`${o.startDate}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      }),
    ]);
  }
  if (o.probation) rows.push(["Probation", o.probation]);
  return rows;
}

/** Plain-text part of the offer. */
export function offerText(o: OfferEmail): string {
  const name = firstNameOf(o.fullName);
  return [
    `Hi ${name},`,
    ``,
    `Following your interview, we are pleased to offer you the position of`,
    `${o.position} at ${siteConfig.company.name}.`,
    ``,
    ...offerRows(o).map(([k, v]) => `  ${k}: ${v}`),
    ...(o.note ? [``, o.note] : []),
    ``,
    `To accept, simply reply to this email and let us know. We will then send`,
    `you the agreement to sign and arrange everything you need to start.`,
    ``,
    `This is an offer of engagement, not a contract of employment — the written`,
    `agreement follows once you accept.`,
    ``,
    `We will never ask you for a payment, a bank card, or a password at any`,
    `stage. Your bank details are needed only after the agreement is signed.`,
    ``,
    `Any questions, write to ${siteConfig.contact.recruitmentEmail}.`,
    ``,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

/** HTML part of the offer. */
export function offerHtml(o: OfferEmail): string {
  const name = esc(firstNameOf(o.fullName));
  const company = esc(siteConfig.company.name);

  const rows = offerRows(o)
    .map(
      ([k, v]) => `
          <tr>
            <td style="padding:9px 0;border-bottom:1px solid ${BORDER};font:400 15px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};width:40%;">${esc(k)}</td>
            <td style="padding:9px 0;border-bottom:1px solid ${BORDER};font:700 15px/1.5 Arial,Helvetica,sans-serif;color:${NAVY};">${esc(v)}</td>
          </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(offerSubject(o.position))}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Your offer from ${company} — the details are inside.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

    <tr>
      <td style="padding:0 0 22px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="font:800 21px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">${company}</td></tr>
          <tr><td style="padding-top:4px;font:700 10px/1 Arial,Helvetica,sans-serif;color:#b06e0c;letter-spacing:2px;text-transform:uppercase;">${esc(siteConfig.company.descriptor)}</td></tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:38px 34px;">

        <h1 style="margin:0 0 20px 0;font:800 25px/1.25 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">
          Your offer from ${company}
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Hi ${name},
        </p>

        <p style="margin:0 0 24px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Following your interview, we are pleased to offer you the position of
          <strong style="color:${NAVY};">${esc(o.position)}</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          ${rows}
        </table>

        ${
          o.note
            ? `<p style="margin:0 0 24px 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">${esc(o.note)}</p>`
            : ""
        }

        <p style="margin:0 0 24px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          To accept, simply <strong style="color:${NAVY};">reply to this email</strong> and let us
          know. We will then send you the agreement to sign and arrange everything you need to
          start.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              This is an offer of engagement, not a contract &mdash; the written agreement follows
              once you accept. We will <strong style="color:${NAVY};">never</strong> ask you for a
              payment, a bank card, or a password at any stage, and your bank details are needed
              only after the agreement is signed.
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <tr>
      <td style="padding:22px 8px 0 8px;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:#7373a0;">
        Questions? Reply to this email or write to
        <a href="mailto:${esc(siteConfig.contact.recruitmentEmail)}" style="color:#b06e0c;">${esc(siteConfig.contact.recruitmentEmail)}</a>.
        <br><br>
        ${company} &mdash; ${esc(siteConfig.company.descriptor)}<br>
        <a href="${esc(siteConfig.url)}" style="color:#7373a0;">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

export interface VoiceAssessmentInvite {
  fullName: string;
  email: string;
  position?: string;
}

/**
 * The script read aloud for the voice assessment, exactly as it was when this
 * lived in the editable WhatsApp message — carried over rather than reworded,
 * since the wording itself was never the part anyone asked to change.
 */
function voiceScript(fullName: string): string {
  return (
    `"Hello, my name is ${fullName}. I am interested in joining your customer-support team. ` +
    `I enjoy communicating with customers, listening carefully to their concerns, and helping ` +
    `them find the best possible solution. I understand that professional customer service ` +
    `requires patience, respect, clear communication, and a positive attitude. I am comfortable ` +
    `working as part of a team, following company procedures, and learning new skills. I am ` +
    `motivated to provide customers with a helpful and professional experience."`
  );
}

/** Digits-only WhatsApp number for a wa.me link — no "+", spaces or dashes. */
function waNumber(): string {
  return siteConfig.contact.phone.replace(/[^\d]/g, "");
}

/**
 * The message a candidate's WhatsApp opens to, pre-addressed to us.
 *
 * This is what solves identification without any new matching logic on our
 * side: the recruiter did not start this conversation the way they do for a
 * WhatsApp-sent request, so nothing about the incoming message says who it is
 * from except what it actually says. Naming the candidate, their role and
 * their email up front means a recruiter reading the message already knows —
 * even if it arrives from a number that is not the one on file.
 */
function voiceWhatsAppPrefill({ fullName, email, position }: VoiceAssessmentInvite): string {
  return (
    `Hello, this is ${fullName}${position ? `, applying for ${position}` : ""}. ` +
    `My email is ${email}. Here is my voice assessment recording:`
  );
}

function voiceWhatsAppUrl(invite: VoiceAssessmentInvite): string {
  return `https://wa.me/${waNumber()}?text=${encodeURIComponent(voiceWhatsAppPrefill(invite))}`;
}

/**
 * Subject for the merged interview-success + voice-assessment email.
 *
 * This single email now carries what used to be two separate WhatsApp
 * messages: the congratulations, and the request itself.
 */
export function voiceAssessmentSubject(): string {
  return `Congratulations — next step: your voice assessment`;
}

/** Plain-text part. */
export function voiceAssessmentText(invite: VoiceAssessmentInvite): string {
  const name = firstNameOf(invite.fullName);
  const waUrl = voiceWhatsAppUrl(invite);
  return [
    `Hi ${name},`,
    ``,
    `Congratulations! You have successfully completed the online interview, and you performed`,
    `very well. Thank you for taking the time to answer all the questions carefully — we are`,
    `pleased to move your application to the next stage.`,
    ``,
    `The next step is a short voice assessment. We use it to evaluate your pronunciation,`,
    `communication skills, fluency, and voice clarity.`,
    ``,
    `Please record a voice message reading the text below — slowly, clearly and naturally:`,
    ``,
    voiceScript(invite.fullName),
    ``,
    `Record it somewhere quiet, then send it to us on WhatsApp using the link below. It opens`,
    `WhatsApp with a message already addressed to us, so we know straight away it is you:`,
    ``,
    waUrl,
    ``,
    `Or message us on WhatsApp at ${siteConfig.contact.phone}.`,
    ``,
    `If you message us a different way instead, please make sure to say your full name and`,
    `include your email address (${invite.email}) so we know which application it belongs to.`,
    ``,
    `Any questions, write to ${siteConfig.contact.recruitmentEmail}.`,
    ``,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

/** HTML part. */
export function voiceAssessmentHtml(invite: VoiceAssessmentInvite): string {
  const name = esc(firstNameOf(invite.fullName));
  const company = esc(siteConfig.company.name);
  const waUrl = voiceWhatsAppUrl(invite);
  const script = esc(voiceScript(invite.fullName));
  const email = esc(invite.email);
  const WHATSAPP_GREEN = "#25d366";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(voiceAssessmentSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  You passed the interview — here is your voice assessment.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

    <tr>
      <td style="padding:0 0 22px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="font:800 21px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">${company}</td></tr>
          <tr><td style="padding-top:4px;font:700 10px/1 Arial,Helvetica,sans-serif;color:#b06e0c;letter-spacing:2px;text-transform:uppercase;">${esc(siteConfig.company.descriptor)}</td></tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;padding:38px 34px;">

        <h1 style="margin:0 0 20px 0;font:800 25px/1.25 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:-0.5px;">
          Congratulations, ${name}!
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          You have successfully completed the online interview, and you performed very well.
          Thank you for taking the time to answer all the questions carefully — we are pleased to
          move your application to the next stage.
        </p>

        <p style="margin:0 0 20px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          The next step is a short <strong style="color:${NAVY};">voice assessment</strong>. We use
          it to evaluate your pronunciation, communication skills, fluency, and voice clarity.
        </p>

        <p style="margin:0 0 12px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Please record a voice message reading the text below &mdash; slowly, clearly and
          naturally:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 26px 0;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${NAVY};font-style:italic;">
              ${script}
            </td>
          </tr>
        </table>

        <p style="margin:0 0 22px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Record it somewhere quiet, then send it to us on WhatsApp using the button below. It
          opens WhatsApp with a message already addressed to us, so we know straight away it is
          you:
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
          <tr>
            <td align="center" bgcolor="${WHATSAPP_GREEN}" style="border-radius:999px;">
              <a href="${waUrl}" style="display:inline-block;padding:15px 34px;font:700 16px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px;">
                Send my recording on WhatsApp
              </a>
            </td>
          </tr>
        </table>

        <!-- The wa.me link is mostly percent-encoded message text, so printing
             it raw here is three lines of %20 that help nobody. Someone whose
             button does not work needs the number, which they can save and
             message directly. -->
        <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Message us on WhatsApp at
          <strong style="color:${NAVY};">${esc(siteConfig.contact.phone)}</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              Messaging us a different way instead? Please say your full name and include your
              email address (<strong style="color:${NAVY};">${email}</strong>) so we know which
              application it belongs to.
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <tr>
      <td style="padding:22px 8px 0 8px;font:400 13px/1.65 Arial,Helvetica,sans-serif;color:#7373a0;">
        Questions? Reply to this email or write to
        <a href="mailto:${esc(siteConfig.contact.recruitmentEmail)}" style="color:#b06e0c;">${esc(siteConfig.contact.recruitmentEmail)}</a>.
        <br><br>
        ${company} &mdash; ${esc(siteConfig.company.descriptor)}<br>
        <a href="${esc(siteConfig.url)}" style="color:#7373a0;">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}
