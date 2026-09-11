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
import { OFFER_LINK_TTL_DAYS } from "@/lib/token";

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

export interface IdentityReuploadEmail {
  fullName: string;
  /** Where the upload step is — their offer link, or their assessment link. */
  url: string;
  /** What was wrong, in the recruiter's words. Shown verbatim. */
  reason: string;
}

/**
 * Asking someone to send their identity photographs again.
 *
 * A separate message from the first request, because the first one opens by
 * thanking them for finishing their assessment — which to someone who has
 * already accepted an offer reads as though we have lost track of them.
 *
 * The reason is the whole message. "Your documents were not accepted, please
 * try again" produces the same photograph a second time and a reply asking
 * what was wrong; saying it was too dark to read produces a better photograph.
 * It also says plainly that nothing else has changed about their offer —
 * being asked for a passport twice is unsettling enough without wondering
 * whether the job is still there.
 */
export function identityReuploadSubject(): string {
  return `Identity Verification Unsuccessful – ${siteConfig.company.name}`;
}

export function identityReuploadText({ fullName, url, reason }: IdentityReuploadEmail): string {
  const name = firstNameOf(fullName);
  return [
    `Hi ${name},`,
    ``,
    `We were not able to use the identity photographs you sent us, so we need`,
    `to ask you for them one more time.`,
    ``,
    `What we need you to fix:`,
    ``,
    reason,
    ``,
    `Please open your link and send them again:`,
    ``,
    url,
    ``,
    `We accept a passport, a national identity card or a driver's licence. For`,
    `an identity card or a driver's licence we need both sides, as two separate`,
    `photos. You will also be asked for a photo of you holding the document.`,
    ``,
    `Nothing else has changed and there is nothing wrong with your application.`,
    `It takes about a minute from a phone.`,
    ``,
    `Your photographs are stored privately, seen only by our recruitment team,`,
    `and used only to confirm your identity. We will never ask you for a`,
    `payment, a bank card, or a password.`,
    ``,
    `Any questions, write to ${siteConfig.contact.recruitmentEmail}.`,
    ``,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

export function identityReuploadHtml({ fullName, url, reason }: IdentityReuploadEmail): string {
  const name = esc(firstNameOf(fullName));
  const href = esc(url);
  const company = esc(siteConfig.company.name);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(identityReuploadSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  One more minute from your phone — nothing else has changed.
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
          Identity verification unsuccessful
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Hi ${name},
        </p>

        <p style="margin:0 0 20px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          We were not able to use the identity photographs you sent us, so we need to ask you
          for them one more time.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fffaf0;border:2px solid ${AMBER};border-radius:10px;margin:0 0 24px 0;">
          <tr>
            <td style="padding:18px 22px;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${NAVY};">
              ${esc(reason)}
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${href}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Send my photos again
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 12px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          We accept a <strong style="color:${NAVY};">passport</strong>, a
          <strong style="color:${NAVY};">national identity card</strong> or a
          <strong style="color:${NAVY};">driver's licence</strong>. For a card or a licence we
          need both sides, as two separate photos. You will also be asked for a photo of you
          holding the document.
        </p>

        <p style="margin:0 0 22px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Nothing else has changed and there is nothing wrong with your application.
        </p>

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
          <a href="${href}" style="color:#b06e0c;word-break:break-all;">${href}</a>
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
 * Chasing a voice assessment that has been asked for and not sent.
 *
 * Deliberately not the assessment reminder reworded. That one chases a
 * 30-minute test somebody has to sit down for; this one chases a minute of
 * talking, and saying so is the whole persuasion. It also has to carry the
 * fact that they have already passed the interview — a bare "you have not
 * completed this" weeks later reads like a rejection notice, and the people
 * most likely to give up are the ones who most need reminding they are nearly
 * through.
 */
export function voiceReminderSubject(): string {
  return `A minute of your time — your ${siteConfig.company.name} voice assessment`;
}

export function voiceReminderText(invite: VoiceAssessmentInvite): string {
  const name = firstNameOf(invite.fullName);
  return [
    `Dear ${name},`,
    ``,
    `You passed our online interview${invite.position ? ` for the ${invite.position} role` : ""}, and your`,
    `application is still open. The one thing outstanding is your voice assessment.`,
    ``,
    `It takes about a minute. Open your personal link and follow the steps on the page:`,
    ``,
    invite.recordUrl,
    ``,
    `A short passage is shown for you to read aloud. Record it on the page, or attach a`,
    `recording made with your phone — whichever is easier. You can listen back and record`,
    `again before you send it.`,
    ``,
    `If you would rather not continue, simply reply and let us know.`,
    `We will close your application. Either answer is helpful to us.`,
    ``,
    `Kind regards,`,
    `Recruitment Team`,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

export function voiceReminderHtml(invite: VoiceAssessmentInvite): string {
  const name = esc(firstNameOf(invite.fullName));
  const company = esc(siteConfig.company.name);
  const url = esc(invite.recordUrl);
  const role = invite.position ? ` for the <strong style="color:${NAVY};">${esc(invite.position)}</strong> role` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(voiceReminderSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  One minute of reading aloud, and your application is complete.
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
          You are one step from finishing
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Hello ${name}, you passed our online interview${role} and your application is still
          open. The one thing outstanding is your <strong style="color:${NAVY};">voice
          assessment</strong>.
        </p>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          It takes about a minute. A short passage is shown for you to read aloud &mdash; record
          it on the page, or attach a recording made with your phone, whichever is easier.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Record it now
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              Changed your mind? Reply to this email and we will close your application. Either
              answer is helpful to us.
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

export interface IdentityReminderEmail {
  fullName: string;
  /** Their offer link, which resumes the identity step. */
  uploadUrl: string;
  position?: string;
}

/**
 * Chasing identity documents from somebody who has already accepted.
 *
 * The most delicate message this system sends. Being asked to photograph a
 * passport, by email, after accepting a remote job offer is precisely the
 * shape of a recruitment scam — a cautious person is right to hesitate, and
 * the ones who hesitate hardest are usually the ones worth hiring. So this
 * spends most of its length earning the request rather than making it: it
 * confirms their acceptance is already recorded, says plainly what the check
 * is for and who sees the photographs, and states the things we will never ask
 * for. Anything less and the careful candidates are the ones who drop out.
 *
 * It does not threaten a deadline. A withdrawal warning would push exactly the
 * people who are being careful, and we would rather answer their question.
 */
export function identityReminderSubject(): string {
  return `Identity verification required to issue your ${siteConfig.company.name} agreement`;
}

export function identityReminderText(invite: IdentityReminderEmail): string {
  const name = firstNameOf(invite.fullName);
  return [
    `Dear ${name},`,
    ``,
    `Thank you for accepting our offer${invite.position ? ` for the ${invite.position} role` : ""}.`,
    `Your acceptance is recorded and your place is held.`,
    ``,
    `One step remains before we can issue your written agreement: a short identity`,
    `check. We ask this of everyone we engage, and we cannot prepare a contract`,
    `without it.`,
    ``,
    `You will be asked for a photo of your passport, national identity card or`,
    `driver's licence, and a photo of you holding it. It takes about a minute from`,
    `a phone.`,
    ``,
    `WHY WE ASK`,
    ``,
    `An agreement has to be made with a real, identified person. The check confirms`,
    `that the person we are contracting with is you, and it protects you as much as`,
    `us: it is what stops somebody else using your name and your details.`,
    ``,
    `YOUR PHOTOGRAPHS`,
    ``,
    `- Stored privately. Nobody can open them without signing in.`,
    `- Seen only by our recruitment team.`,
    `- Used only to confirm who you are, and never shared with anyone else.`,
    ``,
    `Open your personal link and follow the steps on the page:`,
    ``,
    invite.uploadUrl,
    ``,
    `WE WILL NEVER ASK YOU FOR`,
    ``,
    `- A payment of any kind, for anything, at any stage.`,
    `- Your bank card details or a password.`,
    `- Money to release your first payment.`,
    ``,
    `If a message ever asks you for any of those in our name,`,
    `it did not come from us. Please do not pay it, and tell us so we can warn others.`,
    ``,
    `If anything here is unclear, simply reply to this email and a person will`,
    `answer you.`,
    ``,
    `Kind regards,`,
    `Recruitment Team`,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

export function identityReminderHtml(invite: IdentityReminderEmail): string {
  const name = esc(firstNameOf(invite.fullName));
  const company = esc(siteConfig.company.name);
  const url = esc(invite.uploadUrl);
  const role = invite.position ? ` for the <strong style="color:${NAVY};">${esc(invite.position)}</strong> role` : "";

  const bullet = (text: string) => `
    <tr>
      <td style="padding:0 0 8px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
        <span style="color:${AMBER};font-weight:700;">&bull;</span>&nbsp; ${text}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(identityReminderSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Your acceptance is recorded. One identity check and your agreement follows.
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
          One step left before your agreement
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Dear ${name}, thank you for accepting our offer${role}.
          <strong style="color:${NAVY};">Your acceptance is recorded and your place is held.</strong>
        </p>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          One step remains before we can issue your written agreement: a short
          <strong style="color:${NAVY};">identity check</strong>. We ask this of everyone we
          engage, and we cannot prepare a contract without it. It takes about a minute from a
          phone &mdash; a photo of your passport, national identity card or driver&rsquo;s
          licence, and a photo of you holding it.
        </p>

        <!-- Being asked for a passport by email after accepting a remote offer
             is exactly what a scam looks like. Earning the request matters more
             here than making it, so what happens to the photographs and what we
             will never ask for are both stated plainly — and the button comes
             after that reassurance, not before it, so nobody is asked to click
             before they have been given a reason to. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 26px 0;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                Why we ask
              </p>
              <p style="margin:0 0 16px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
                An agreement has to be made with a real, identified person. This confirms that the
                person we are contracting with is you &mdash; which protects you as much as us,
                because it is what stops somebody else using your name and your details.
              </p>
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                Your photographs
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bullet("Stored privately &mdash; nobody can open them without signing in.")}
                ${bullet("Seen only by our recruitment team.")}
                ${bullet("Used only to confirm who you are, never shared onward.")}
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Complete my identity check
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fffaf0;border:2px solid ${AMBER};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                We will never ask you for
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bullet("A payment of any kind, for anything, at any stage.")}
                ${bullet("Your bank card details, or a password.")}
                ${bullet("Money to release your first payment.")}
              </table>
              <p style="margin:8px 0 0 0;font:400 14px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
                If a message ever asks you for any of those in our name, it did not come from us.
                Please do not pay it, and tell us so we can warn others.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:22px 0 0 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          If anything here is unclear, simply reply to this email and a person will answer you.
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

export interface LiveVerificationEmail {
  fullName: string;
  /** Our own page, which records the open and then hands over to the provider. */
  startUrl: string;
}

/**
 * Asking somebody to finish their identity check on their phone.
 *
 * Written for the moment it is actually sent: their photographs did not settle
 * the question, and we are asking a person who has done as they were told to
 * do it again, differently. So it does not say we could not verify them —
 * that is an accusation, and the people it stings hardest are the honest ones
 * who took the picture in bad light. It says the photographs were not clear
 * enough for the check, and that this way is quicker.
 *
 * The button leads to our own page rather than straight to the provider. A
 * message asking somebody to photograph their passport, whose only link goes
 * to a domain they have never heard of, is indistinguishable from the scam it
 * is not.
 */
export function liveVerificationSubject(): string {
  return `We were unable to verify your identity — one quick step to finish it`;
}

export function liveVerificationText(invite: LiveVerificationEmail): string {
  const name = firstNameOf(invite.fullName);
  return [
    `Dear ${name},`,
    ``,
    `Thank you for sending your identity documents. Unfortunately we were not able`,
    `to complete the check from the photographs, so we cannot verify your identity`,
    `that way.`,
    ``,
    `There is a quicker way to finish it, and it takes about two minutes.`,
    ``,
    `OPEN THIS ON YOUR PHONE`,
    ``,
    invite.startUrl,
    ``,
    `Your phone camera is what makes this work, so please open the link on a`,
    `phone. If you are reading this on a computer, the page will show you a code`,
    `you can scan with your phone camera to continue there.`,
    ``,
    `WHAT HAPPENS`,
    ``,
    `- You photograph your identity document, guided step by step.`,
    `- You take a short live selfie so we can see it is really you.`,
    `- That is all. There is nothing to install and nothing to fill in.`,
    ``,
    `The check is carried out by our verification provider. Your photographs are`,
    `used only to confirm who you are.`,
    ``,
    `WE WILL NEVER ASK YOU FOR`,
    ``,
    `- A payment of any kind, for anything, at any stage.`,
    `- Your bank card details or a password.`,
    `- Money to release your first payment.`,
    ``,
    `This link is personal to you. Please do not forward it to anyone.`,
    ``,
    `If anything here is unclear, simply reply to this email and a person will`,
    `answer you.`,
    ``,
    `Kind regards,`,
    `Recruitment Team`,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

export function liveVerificationHtml(invite: LiveVerificationEmail): string {
  const name = esc(firstNameOf(invite.fullName));
  const company = esc(siteConfig.company.name);
  const url = esc(invite.startUrl);

  const bullet = (text: string) => `
    <tr>
      <td style="padding:0 0 8px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
        <span style="color:${AMBER};font-weight:700;">&bull;</span>&nbsp; ${text}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(liveVerificationSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Two minutes on your phone finishes your identity check.
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
          One quick step to finish your identity check
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Dear ${name}, thank you for sending your identity documents. Unfortunately we were not
          able to complete the check from the photographs, so
          <strong style="color:${NAVY};">we were unable to verify your identity</strong> that way.
        </p>

        <p style="margin:0 0 8px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          There is a quicker way to finish it, and it takes about
          <strong style="color:${NAVY};">two minutes</strong>.
        </p>

        <!-- Said immediately above the button, not in the small print. The
             whole thing needs a phone camera, and somebody who starts it on a
             laptop has to begin again. -->
        <p style="margin:0 0 18px 0;font:700 15px/1.5 Arial,Helvetica,sans-serif;color:#b06e0c;">
          Please open this on your phone.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Start verification
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Reading this on a computer? Open the page anyway and it will show you a code to scan with
          your phone camera. Or copy this link:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 18px 0;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                What happens
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bullet("You photograph your identity document, guided step by step.")}
                ${bullet("You take a short live selfie, so we can see it is really you.")}
                ${bullet("That is all &mdash; nothing to install, nothing to fill in.")}
              </table>
              <p style="margin:10px 0 0 0;font:400 14px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
                The check is carried out by our verification provider, and your photographs are used
                only to confirm who you are.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fffaf0;border:2px solid ${AMBER};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                We will never ask you for
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bullet("A payment of any kind, for anything, at any stage.")}
                ${bullet("Your bank card details, or a password.")}
                ${bullet("Money to release your first payment.")}
              </table>
              <p style="margin:8px 0 0 0;font:400 14px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
                This link is personal to you &mdash; please do not forward it. If a message ever
                asks you for any of those in our name, it did not come from us.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:22px 0 0 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          If anything here is unclear, simply reply to this email and a person will answer you.
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

export interface CompanyDetailsEmail {
  fullName: string;
  companyName?: string;
  /** Their own page, pre-filled with what they told us when accepting. */
  url: string;
}

/**
 * Asking a candidate who accepted through a company to confirm the company.
 *
 * The reason has to be given, because from their side this looks like a
 * fourth hoop after an assessment, a recording, an offer and a passport. It is
 * not: the agreement is with the company rather than with them, and everything
 * we hold about that company is two boxes they typed while accepting. The
 * paperwork is what turns those into something a contract can be built on.
 */
export interface OfferReminderEmail {
  fullName: string;
  position?: string;
  /** Already formatted, e.g. "$17 per hour". Omitted if the offer is unreadable. */
  rate?: string;
  /** Their own offer link, which still opens the accept and decline buttons. */
  offerUrl: string;
  /** The deadline in words: "Saturday 13 September at 14:30 UK time". */
  deadline: string;
}

/**
 * Chasing an answer to an offer, with a deadline attached.
 *
 * The hardest thing to get right here is tone. The message has to carry a
 * consequence — after this we close the file and erase what we hold — while
 * not reading as a threat to somebody who has simply been busy, or ill, or
 * waiting to hear from another employer. So the consequence is stated once,
 * plainly, as what happens rather than as a punishment, and "no" is offered as
 * a real answer beside "yes": declining takes one click and costs them
 * nothing, which is the outcome we would much rather have than silence.
 *
 * The deadline is a date and a time, never "within 48 hours". Emails are read
 * whenever they are read, and by then "48 hours" names no moment at all.
 */
export function offerReminderSubject(position?: string): string {
  return position
    ? `Your ${position} offer is waiting for your answer`
    : `Your ${siteConfig.company.name} offer is waiting for your answer`;
}

export function offerReminderText(invite: OfferReminderEmail): string {
  const name = firstNameOf(invite.fullName);
  const role = invite.position ? ` for the ${invite.position} role` : "";
  return [
    `Dear ${name},`,
    ``,
    `We wrote to you recently with an offer${role}${invite.rate ? ` at ${invite.rate}` : ""},`,
    `and we have not heard back yet.`,
    ``,
    `We are still holding the place for you. Could you let us know either way by`,
    ``,
    `${invite.deadline}`,
    ``,
    `Both answers are useful to us, and neither needs an explanation. If it is no,`,
    `saying so takes one click and there is no awkwardness in it — plans change,`,
    `and other offers come along.`,
    ``,
    `Open your offer to accept or decline:`,
    ``,
    invite.offerUrl,
    ``,
    `IF WE DO NOT HEAR FROM YOU`,
    ``,
    `We will assume you are no longer interested, close your file, and remove your`,
    `application and any documents you sent us from our system. Nothing further`,
    `will be asked of you, and you would be welcome to apply again another time.`,
    ``,
    `WE WILL NEVER ASK YOU FOR`,
    ``,
    `- A payment of any kind, for anything, at any stage.`,
    `- Your bank card details or a password.`,
    `- Money to release your first payment.`,
    ``,
    `If you need more time, simply reply to this email and say so. A person will`,
    `read it, and we would rather give you longer than lose you to a deadline.`,
    ``,
    `Kind regards,`,
    `Recruitment Team`,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

export function offerReminderHtml(invite: OfferReminderEmail): string {
  const name = esc(firstNameOf(invite.fullName));
  const company = esc(siteConfig.company.name);
  const url = esc(invite.offerUrl);
  const deadline = esc(invite.deadline);
  const role = invite.position
    ? ` for the <strong style="color:${NAVY};">${esc(invite.position)}</strong> role`
    : "";
  const rate = invite.rate ? ` at <strong style="color:${NAVY};">${esc(invite.rate)}</strong>` : "";

  const bullet = (text: string) => `
    <tr>
      <td style="padding:0 0 8px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
        <span style="color:${AMBER};font-weight:700;">&bull;</span>&nbsp; ${text}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(offerReminderSubject(invite.position))}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  We are still holding your place. Please let us know either way by ${deadline}.
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
          Your offer is still open
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Dear ${name}, we wrote to you recently with an offer${role}${rate}, and we have not
          heard back yet. <strong style="color:${NAVY};">We are still holding the place for
          you.</strong>
        </p>

        <!-- The deadline, given as a moment rather than a duration, and set
             apart so it survives being skim-read on a phone. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 24px 0;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 6px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                Please answer by
              </p>
              <p style="margin:0;font:800 19px/1.35 Arial,Helvetica,sans-serif;color:${NAVY};">
                ${deadline}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Both answers are useful to us, and neither needs an explanation. If it is no, saying so
          takes one click and there is no awkwardness in it &mdash; plans change, and other offers
          come along.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Accept or decline my offer
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

        <!-- What happens next if nothing does. Said once, as a consequence
             rather than a threat: the reader may have been ill, or waiting on
             another employer, and neither deserves to be leaned on. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 24px 0;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                If we do not hear from you
              </p>
              <p style="margin:0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
                We will assume you are no longer interested, close your file, and remove your
                application and any documents you sent us from our system. Nothing further will be
                asked of you, and you would be welcome to apply again another time.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fffaf0;border:2px solid ${AMBER};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                We will never ask you for
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bullet("A payment of any kind, for anything, at any stage.")}
                ${bullet("Your bank card details, or a password.")}
                ${bullet("Money to release your first payment.")}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:22px 0 0 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          If you need more time, simply reply to this email and say so. A person will read it, and
          we would rather give you longer than lose you to a deadline.
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

export function companyDetailsSubject(): string {
  return `Confirm your company details before we issue your ${siteConfig.company.name} agreement`;
}

export function companyDetailsText(invite: CompanyDetailsEmail): string {
  const name = firstNameOf(invite.fullName);
  return [
    `Dear ${name},`,
    ``,
    `Thank you for accepting our offer. You told us you are contracting through`,
    invite.companyName ? `${invite.companyName}, so your agreement and your` : `a company, so your agreement and your`,
    `invoices will be in the company's name rather than your own.`,
    ``,
    `Before we can draw the agreement up, we need the company's details`,
    `confirmed. Open your personal link:`,
    ``,
    invite.url,
    ``,
    `WHAT WE NEED`,
    ``,
    `- The company name and number, which we have pre-filled for you to check.`,
    `- The EIN.`,
    `- The registered address.`,
    `- The company website, or a sentence on what it does if it has none.`,
    `- A signed Form W-9.`,
    `- The Certificate of Formation, or Articles of Organization.`,
    `- The IRS EIN confirmation letter, if you have it. This one is optional.`,
    ``,
    `It takes a few minutes if the documents are to hand.`,
    ``,
    `WE WILL NEVER ASK YOU FOR`,
    ``,
    `- A payment of any kind, for anything, at any stage.`,
    `- Your bank card details or a password.`,
    `- Money to release your first payment.`,
    ``,
    `If your company is registered outside the United States, the form will ask`,
    `for details it does not have. Reply to this email instead and we will take`,
    `them another way.`,
    ``,
    `If anything here is unclear, simply reply to this email and a person will`,
    `answer you.`,
    ``,
    `Kind regards,`,
    `Recruitment Team`,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

export function companyDetailsHtml(invite: CompanyDetailsEmail): string {
  const name = esc(firstNameOf(invite.fullName));
  const company = esc(siteConfig.company.name);
  const url = esc(invite.url);
  const theirs = invite.companyName ? esc(invite.companyName) : "";

  const bullet = (text: string) => `
    <tr>
      <td style="padding:0 0 8px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
        <span style="color:${AMBER};font-weight:700;">&bull;</span>&nbsp; ${text}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(companyDetailsSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Your agreement is with your company, so we need its details confirmed.
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
          Confirm your company details
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Dear ${name}, thank you for accepting our offer. You told us you are contracting through
          ${theirs ? `<strong style="color:${NAVY};">${theirs}</strong>` : "a company"}, so your
          agreement and your invoices will be in the company&rsquo;s name rather than your own.
        </p>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Before we can draw the agreement up, we need the company&rsquo;s details confirmed. Your
          link below is pre-filled with what you told us, for you to check.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 26px 0;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                What we need
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bullet("The company name and number, pre-filled for you to check.")}
                ${bullet("The EIN and the registered address.")}
                ${bullet("The company website &mdash; or, if it has none, a sentence on what it does.")}
                ${bullet("A signed <strong style=\"color:" + NAVY + ";\">Form W-9</strong>.")}
                ${bullet("The <strong style=\"color:" + NAVY + ";\">Certificate of Formation</strong>, or Articles of Organization.")}
                ${bullet("The IRS EIN confirmation letter &mdash; optional, if you have it.")}
              </table>
              <p style="margin:10px 0 0 0;font:400 14px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
                A few minutes, if the documents are to hand.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Confirm company details
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fffaf0;border:2px solid ${AMBER};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                We will never ask you for
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bullet("A payment of any kind, for anything, at any stage.")}
                ${bullet("Your bank card details, or a password.")}
                ${bullet("Money to release your first payment.")}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:22px 0 0 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          If your company is registered outside the United States, the form will ask for details it
          does not have &mdash; reply to this email instead and we will take them another way. And
          if anything else is unclear, reply and a person will answer you.
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
  /** Where "Accept this offer" leads. Absent only when a link cannot be built. */
  acceptUrl?: string;
  /** Same page, opened on the decline path. */
  declineUrl?: string;
  /**
   * The specimen agreement, when one is published. Linked rather than
   * attached: a PDF attachment from a young sending domain is a well-known
   * spam signal, and an offer that lands in junk is worse than one without a
   * sample.
   */
  sampleUrl?: string;
  sampleVersion?: string;
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
    `Dear ${name},`,
    ``,
    `Following your interview, it is our pleasure to offer you the position of`,
    `${o.position} at ${siteConfig.company.name}.`,
    ``,
    `Your application stood out, and the team is looking forward to working with`,
    `you. The agreed terms are set out below.`,
    ``,
    `TERMS OF THE OFFER`,
    ...offerRows(o).map(([k, v]) => `  ${k}: ${v}`),
    ...(o.note ? [``, o.note] : []),
    ``,
    ...(o.acceptUrl
      ? [
          `HOW TO ACCEPT`,
          ``,
          `Please confirm your acceptance using the link below. You will be asked to`,
          `check the personal details we hold for you and correct anything that is`,
          `out of date, so that your agreement can be drawn up accurately. It takes`,
          `two or three minutes.`,
          ``,
          o.acceptUrl,
          ``,
          `This link is personal to you and remains valid for ${OFFER_LINK_TTL_DAYS} days.`,
          ``,
          ...(o.declineUrl
            ? [
                `If you have decided not to take up this offer, please let us know here:`,
                o.declineUrl,
                ``,
              ]
            : []),
        ]
      : [
          `To accept, simply reply to this email and let us know.`,
          ``,
        ]),
    ...(o.sampleUrl
      ? [
          `THE TERMS IN FULL`,
          ``,
          `Before you decide, you can read the agreement an engagement with us is`,
          `made on:`,
          ``,
          o.sampleUrl,
          ``,
          `That is a specimen for your information${o.sampleVersion ? ` (version ${o.sampleVersion})` : ""}. Your own agreement is`,
          `drawn up after you accept, with your details in it, and is sent to you`,
          `for signature.`,
          ``,
        ]
      : []),
    `WHAT HAPPENS NEXT`,
    ``,
    `When you accept, you will be asked to confirm your details and — unless you`,
    `have already sent them — a photo of your ID document and one of you holding`,
    `it. We ask this of everyone before an agreement is drawn up. It takes about`,
    `a minute.`,
    ``,
    `Once that is done, we will prepare your written agreement and send it for`,
    `signature, together with everything you need for your first day.`,
    ``,
    `Please note that this is an offer of engagement and not a contract of`,
    `employment; the written agreement follows once you accept.`,
    ``,
    `For your security: we will never ask you for a payment, a bank card, or a`,
    `password at any stage of this process. Your bank details are needed only`,
    `after the written agreement has been signed.`,
    ``,
    `If you have any questions about the offer, please reply to this email or`,
    `write to ${siteConfig.contact.recruitmentEmail} and we will be glad to help.`,
    ``,
    `We very much hope you will join us.`,
    ``,
    `Kind regards,`,
    `Recruitment Team`,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

/** HTML part of the offer. */
export function offerHtml(o: OfferEmail): string {
  const name = esc(firstNameOf(o.fullName));
  const company = esc(siteConfig.company.name);

  /**
   * The acceptance block.
   *
   * It says what the page will ask for before they click. A button that leads
   * to an unexpected form asking for identity details is exactly what a
   * cautious candidate should refuse to click — so the email sets the
   * expectation, and the anti-fraud note below reinforces what will never be
   * asked. Falls back to "reply to this email" if no link could be built,
   * because an offer with no way to accept it is worse than an old-fashioned
   * one.
   */
  /**
   * The terms in full, before the button rather than after it.
   *
   * Candidates have asked for this repeatedly, and one declined to give an
   * identity number until she had seen it. Rendered only when a document is
   * published — a link to a file that is not there is evidence against you to
   * someone deciding whether a remote offer is real.
   */
  const sample = o.sampleUrl
    ? `
        <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
          The terms in full
        </p>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Before you decide, you are welcome to read the agreement an engagement with us is made
          on: <a href="${esc(o.sampleUrl)}" style="color:#b06e0c;font-weight:bold;">the sample
          contractor agreement</a>${o.sampleVersion ? ` (version ${esc(o.sampleVersion)})` : ""}. It is a specimen for your
          information — your own agreement is drawn up after you accept, with your details in it,
          and sent to you for signature.
        </p>
`
    : "";

  const accept = o.acceptUrl
    ? `
        <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
          How to accept
        </p>

        <p style="margin:0 0 20px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Please confirm your acceptance below. You will be asked to check the personal details we
          hold for you and correct anything out of date, so your agreement can be drawn up
          accurately. It takes two or three minutes.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${esc(o.acceptUrl)}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Accept this offer
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 6px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          This link is personal to you and remains valid for ${OFFER_LINK_TTL_DAYS} days.
        </p>
        ${
          o.declineUrl
            ? `<p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Decided not to take up this offer?
          <a href="${esc(o.declineUrl)}" style="color:#b06e0c;">Let us know here</a>.
        </p>`
            : `<div style="height:20px;line-height:20px;">&nbsp;</div>`
        }
`
    : `
        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          To accept, simply <strong style="color:${NAVY};">reply to this email</strong> and let us
          know.
        </p>
`;

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
          Dear ${name},
        </p>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Following your interview, it is our pleasure to offer you the position of
          <strong style="color:${NAVY};">${esc(o.position)}</strong> at ${company}.
        </p>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Your application stood out, and the team is looking forward to working with you. The
          agreed terms are set out below.
        </p>

        <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
          Terms of the offer
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          ${rows}
        </table>

        ${
          o.note
            ? `<p style="margin:0 0 26px 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">${esc(o.note)}</p>`
            : ""
        }

        ${accept}

        ${sample}

        <p style="margin:0 0 10px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
          What happens next
        </p>

        <p style="margin:0 0 24px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          When you accept, you will be asked to confirm your details and &mdash; unless you have
          already sent them &mdash; a photo of your ID document and one of you holding it. We ask
          this of everyone before an agreement is drawn up. It takes about a minute.
        </p>

        <p style="margin:0 0 24px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Once that is done, we will prepare your written agreement and send it for signature,
          together with everything you need for your first day.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              Please note this is an offer of engagement, not a contract &mdash; the written
              agreement follows once you accept. For your security, we will
              <strong style="color:${NAVY};">never</strong> ask you for a payment, a bank card, or
              a password at any stage, and your bank details are needed only after the agreement
              has been signed.
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 0 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          If you have any questions about the offer, simply reply to this email and we will be
          glad to help. We very much hope you will join us.
        </p>

        <p style="margin:20px 0 0 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          Kind regards,<br>
          <strong style="color:${NAVY};">Recruitment Team</strong><br>
          ${company}
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

export interface VoiceAssessmentInvite {
  fullName: string;
  email: string;
  position?: string;
  /**
   * Where the recording is made — their own assessment link.
   *
   * Recordings used to be asked for on WhatsApp. A number that dozens of
   * strangers message, sending links out, is the pattern the platform bans,
   * and it did, repeatedly. It also meant matching a voice note to a name by
   * hand. Sending them to their own link solves both: nothing to match, and no
   * personal number in front of a stranger.
   */
  recordUrl: string;
}

/**
 * Subject for the merged interview-success + voice-assessment email.
 *
 * This single email now carries what used to be two separate WhatsApp
 * messages: the congratulations, and the request itself.
 *
 * It does not carry the script. The script belongs on the page where the
 * recording is made, in front of them while they read it — in the email it
 * only invited people to read from a phone they were also recording on, and
 * it made a short, clear message into a wall of text that buries the one
 * thing they have to do.
 */
export function voiceAssessmentSubject(): string {
  return `Congratulations — next step: your voice assessment`;
}

/** Plain-text part. */
export function voiceAssessmentText(invite: VoiceAssessmentInvite): string {
  const name = firstNameOf(invite.fullName);
  return [
    `Dear ${name},`,
    ``,
    // Two sentences, one line each. The role is interpolated and can be long,
    // so it ends a sentence rather than sitting mid-clause across a hand-made
    // line break, which read as three fragments.
    `Congratulations. You have passed the online interview${invite.position ? ` for the ${invite.position} role` : ""}.`,
    `We are pleased to invite you to the next stage.`,
    ``,
    `The next step is a short voice assessment. It helps us hear your pronunciation,`,
    `fluency and clarity — the things a written interview cannot show us.`,
    ``,
    `Open your personal link and follow the steps on the page:`,
    ``,
    invite.recordUrl,
    ``,
    `You will find a short passage to read aloud, and you can record it directly on the`,
    `page or attach a recording made with your phone. Please do it somewhere quiet. It`,
    `takes about a minute, and you can listen back and record again before you send it.`,
    ``,
    `The link is personal to you, so there is nothing you need to write and nothing for`,
    `us to match up.`,
    ``,
    `If you have any questions, simply reply to this email.`,
    ``,
    `Kind regards,`,
    `Recruitment Team`,
    `${siteConfig.company.name} — ${siteConfig.company.descriptor}`,
    siteConfig.url,
  ].join("\n");
}

/** HTML part. */
export function voiceAssessmentHtml(invite: VoiceAssessmentInvite): string {
  const name = esc(firstNameOf(invite.fullName));
  const company = esc(siteConfig.company.name);
  const url = esc(invite.recordUrl);
  const role = invite.position ? ` for the <strong style="color:${NAVY};">${esc(invite.position)}</strong> role` : "";

  /** One numbered line of "what happens on the page". */
  const step = (n: number, text: string) => `
    <tr>
      <td width="26" valign="top" style="padding:0 0 12px 0;font:700 15px/1.55 Arial,Helvetica,sans-serif;color:#b06e0c;">
        ${n}.
      </td>
      <td style="padding:0 0 12px 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
        ${text}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(voiceAssessmentSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  You have passed the interview. Your voice assessment takes about a minute.
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
          Congratulations, ${name}
        </h1>

        <p style="margin:0 0 16px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          You have passed the online interview${role}, and we are pleased to invite you to the
          next stage.
        </p>

        <p style="margin:0 0 26px 0;font:400 16px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
          The next step is a short <strong style="color:${NAVY};">voice assessment</strong>. It
          helps us hear your pronunciation, fluency and clarity &mdash; the things a written
          interview cannot show us. It takes about a minute.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
          <tr>
            <td align="center" bgcolor="${AMBER}" style="border-radius:999px;">
              <a href="${url}" style="display:inline-block;padding:15px 40px;font:700 16px/1 Arial,Helvetica,sans-serif;color:${NAVY};text-decoration:none;border-radius:999px;">
                Start your voice assessment
              </a>
            </td>
          </tr>
        </table>

        <!-- What is behind the button, so pressing it is not a leap of faith.
             The passage itself stays on the page: in an email it invited
             people to read from the phone they were recording on, and it
             buried the one thing they actually have to do. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;margin:0 0 26px 0;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 14px 0;font:700 12px/1 Arial,Helvetica,sans-serif;color:${NAVY};letter-spacing:1.4px;text-transform:uppercase;">
                What happens on the page
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${step(1, "A short passage is shown for you to read aloud.")}
                ${step(2, "Record it there and then, or attach a recording made with your phone.")}
                ${step(3, "Listen back, and record again if you would like to.")}
                ${step(4, "Send it. Nothing to write, nothing to attach to an email.")}
              </table>
              <p style="margin:6px 0 0 0;font:400 14px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
                Please record somewhere quiet, at your normal speaking pace.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 26px 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#7373a0;">
          Button not working? Copy this link into your browser:<br>
          <a href="${url}" style="color:#b06e0c;word-break:break-all;">${url}</a>
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;">
          <tr>
            <td style="padding:18px 22px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
              This link is personal to you. Please do not share it &mdash; it is how we know the
              recording is yours.
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
