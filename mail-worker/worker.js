/**
 * Cloudflare Email Worker for workroute.team.
 *
 * Cloudflare Email Routing hands every email sent to anything@workroute.team
 * to this worker (catch-all rule → "Send to a Worker"). It passes the message,
 * exactly as it arrived, to the team portal, which files it in the right
 * member's Mail tab. Nothing is kept here.
 *
 * Settings (Worker → Settings → Variables and Secrets):
 *   INBOUND_SECRET  (Secret)  — the same value as TEAM_MAIL_INBOUND_SECRET on Railway
 *   PORTAL_URL      (Text, optional) — default https://workroute.team/api/team/mail/inbound
 *
 * No packages to install: paste this file into the worker's code editor.
 */
export default {
  async email(message, env) {
    const url = env.PORTAL_URL || "https://workroute.team/api/team/mail/inbound";
    const raw = await new Response(message.raw).arrayBuffer();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "message/rfc822",
        "x-mail-secret": env.INBOUND_SECRET || "",
        "x-envelope-to": message.to,
        "x-envelope-from": message.from,
      },
      body: raw,
    });

    if (res.status === 413) {
      message.setReject("Message too large");
      return;
    }
    if (!res.ok) {
      // Fails the delivery, so it shows in the worker's logs instead of the
      // email quietly disappearing. 401 here means INBOUND_SECRET does not
      // match TEAM_MAIL_INBOUND_SECRET on Railway.
      throw new Error(`Team portal answered ${res.status}`);
    }
  },
};
