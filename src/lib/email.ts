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

/**
 * Normalise the configured token.
 *
 * The ZeptoMail console displays the credential as "Zoho-enczapikey abc123…",
 * and pasting it whole is the single easiest mistake to make — the scheme word
 * is then sent twice and the API answers 401 SERR_157. Copying from the console
 * also tends to bring along surrounding whitespace or a trailing newline.
 * Both are stripped here so either form of the value works.
 */
function normaliseToken(raw: string): { token: string; hadPrefix: boolean } {
  let token = raw.trim().replace(/^["']|["']$/g, "");
  const hadPrefix = /^zoho-enczapikey\s+/i.test(token);
  if (hadPrefix) token = token.replace(/^zoho-enczapikey\s+/i, "").trim();
  return { token, hadPrefix };
}

export async function sendEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const rawToken = process.env.ZEPTOMAIL_TOKEN;
  const from = process.env.ZEPTOMAIL_FROM_ADDRESS?.trim();

  if (!rawToken || !from) return { ok: false, skipped: "not_configured" };
  const { token, hadPrefix } = normaliseToken(rawToken);
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

      if (res.status === 401) {
        // Describe the credential without printing it: length and shape are
        // enough to tell these cases apart.
        const region = process.env.ZEPTOMAIL_REGION?.toLowerCase() === "eu" ? "eu" : "global";
        // eslint-disable-next-line no-console
        console.error(
          `[email] 401 diagnostics — token length ${token.length}` +
            `${hadPrefix ? " (a 'Zoho-enczapikey ' prefix was found and stripped)" : ""}` +
            `, endpoint region '${region}', sender '${from}'.\n` +
            `[email] Check, in order: (1) the account is out of ZeptoMail's review and the ` +
            `Mail Agent is active; (2) ZEPTOMAIL_REGION matches your Zoho data centre — an EU ` +
            `token on the global endpoint returns exactly this error; (3) the value is the ` +
            `Mail Agent's "Send Mail" token, not an SMTP password or a Mail Agent key.`,
        );
      }
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] could not reach ZeptoMail:", err);
    return { ok: false, error: "network_error" };
  }
}
