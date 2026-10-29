/**
 * SERVER-ONLY. Sending a member's email from their @workroute.team address,
 * through Resend.
 *
 * Kept apart from ZeptoMail on purpose: ZeptoMail sends the hiring emails and
 * is meant for automatic messages, not person-to-person mail. A problem here
 * must never cost the hiring site its email.
 *
 *   RESEND_API_KEY   — from resend.com → API Keys ("Sending access" is enough)
 *   RESEND_API_BASE  — optional; a test points this at a local stand-in
 */

export interface OutgoingMail {
  from: { address: string; name: string };
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  html: string;
  inReplyTo?: string;
  references?: string[];
  attachments: { filename: string; content: Buffer }[];
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export function mailSendingReady(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

/** "Aisha Benali" <aisha.benali@workroute.team>, with the name made safe for a header. */
function fromHeader(f: OutgoingMail["from"]): string {
  const name = f.name.replace(/["\r\n<>]/g, "").trim();
  return name ? `${name} <${f.address}>` : f.address;
}

export async function sendTeamMail(m: OutgoingMail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, error: "not_configured" };
  const base = (process.env.RESEND_API_BASE?.trim() || "https://api.resend.com").replace(/\/$/, "");
  const headers: Record<string, string> = {};
  if (m.inReplyTo) headers["In-Reply-To"] = m.inReplyTo;
  if (m.references?.length) headers.References = m.references.join(" ");
  try {
    const res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromHeader(m.from),
        to: m.to,
        cc: m.cc.length ? m.cc : undefined,
        subject: m.subject,
        text: m.text,
        html: m.html,
        headers: Object.keys(headers).length ? headers : undefined,
        attachments: m.attachments.length
          ? m.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") }))
          : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`[mail] Resend refused: HTTP ${res.status} ${data.name ?? ""} ${data.message ?? ""}`.trim());
      return { ok: false, error: data.message || `http_${res.status}` };
    }
    return { ok: true, id: data.id ?? "" };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[mail] could not reach Resend:", err);
    return { ok: false, error: "network_error" };
  }
}
