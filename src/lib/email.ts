/**
 * SERVER-ONLY transactional email via ZeptoMail (Zoho).
 *
 * Configure in the host's environment:
 *   ZEPTOMAIL_TOKEN        — the "Send Mail" token from the ZeptoMail console.
 *                            Paste the value only; the "Zoho-enczapikey " prefix
 *                            is added here, and including it twice fails auth.
 *   ZEPTOMAIL_FROM_ADDRESS — a verified sender on your domain, e.g.
 *                            careers@workroute.work
 *   ZEPTOMAIL_FROM_NAME    — optional display name (defaults to the company).
 *   ZEPTOMAIL_REGION       — optional: "eu" if your Zoho account is in the EU
 *                            data centre. The wrong region rejects the token.
 *
 * If the token or sender is missing, sending quietly no-ops so the application
 * form keeps working — an email failure must never cost us a candidate.
 */
import { siteConfig } from "@/config/site";

export type EmailResult =
  | { ok: true }
  | { ok: false; skipped: "not_configured" }
  | { ok: false; error: string };

function endpoint(): string {
  return process.env.ZEPTOMAIL_REGION?.toLowerCase() === "eu"
    ? "https://api.zeptomail.eu/v1.1/email"
    : "https://api.zeptomail.com/v1.1/email";
}

export async function sendEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const from = process.env.ZEPTOMAIL_FROM_ADDRESS;

  if (!token || !from) return { ok: false, skipped: "not_configured" };
  if (!opts.to || !opts.to.includes("@")) return { ok: false, error: "invalid_recipient" };

  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        // ZeptoMail expects the literal scheme word, not "Bearer".
        Authorization: `Zoho-enczapikey ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        from: { address: from, name: process.env.ZEPTOMAIL_FROM_NAME || siteConfig.company.name },
        to: [{ email_address: { address: opts.to, name: opts.toName || opts.to } }],
        reply_to: opts.replyTo
          ? [{ address: opts.replyTo, name: siteConfig.company.name }]
          : undefined,
        subject: opts.subject,
        htmlbody: opts.html,
        textbody: opts.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error(`[email] ZeptoMail rejected the send: HTTP ${res.status} ${detail.slice(0, 400)}`);
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] could not reach ZeptoMail:", err);
    return { ok: false, error: "network_error" };
  }
}
