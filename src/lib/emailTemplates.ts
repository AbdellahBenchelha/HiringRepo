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

/** Subject line for the assessment invitation. */
export function interviewInviteSubject(position?: string): string {
  return position
    ? `Your ${position} assessment — ${siteConfig.company.name}`
    : `Your online assessment — ${siteConfig.company.name}`;
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

/** Subject for the reminder chasing an unfinished assessment. */
export function reminderSubject(position?: string): string {
  return position
    ? `Reminder: your ${position} assessment is waiting`
    : `Reminder: your assessment is waiting`;
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
