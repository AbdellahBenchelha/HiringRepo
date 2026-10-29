# workroute.team mailboxes — setup

Members read and write their @workroute.team email in the **Mail** tab of the
team portal. Two outside services do the delivery:

- **Receiving — Cloudflare Email Routing** (free). Every email to
  anything@workroute.team goes to the worker in this folder, which passes it to
  the portal.
- **Sending — Resend** (free up to 3,000 emails a month, 100 a day). Kept apart
  from ZeptoMail, which sends the hiring emails.

## 1. Railway — two secrets on the main service (HiringRepo)

- `TEAM_MAIL_INBOUND_SECRET` — a long random value. Make one with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `RESEND_API_KEY` — from step 3.

## 2. Cloudflare — receiving

1. Cloudflare → workroute.team → **Email → Email Routing** → **Get started /
   Enable**. Let Cloudflare add the records it proposes (MX and TXT).
2. **Workers & Pages → Create → Create Worker**. Name it
   `workroute-team-mail` → **Deploy** → **Edit code** → replace everything with
   `worker.js` from this folder → **Deploy**.
3. The worker → **Settings → Variables and Secrets → Add**: type **Secret**,
   name `INBOUND_SECRET`, value = the same as `TEAM_MAIL_INBOUND_SECRET`.
4. Back in **Email Routing → Routing rules → Catch-all address** → **Edit** →
   Action **Send to a Worker** → `workroute-team-mail` → **Save**, and make
   sure the catch-all is **enabled**.

## 3. Resend — sending

1. resend.com → sign up → **Domains → Add domain** → `workroute.team`.
2. Resend shows DNS records (a DKIM `TXT`, plus `MX` and `TXT` records on
   `send`). Add each one in Cloudflare → DNS exactly as shown, **DNS only**.
   They do not clash with the Email Routing records: Resend's live on `send.`
3. Back in Resend → **Verify**. Wait until the domain says **Verified**.
4. **API Keys → Create API key** → permission **Sending access**, domain
   `workroute.team` → copy it into Railway as `RESEND_API_KEY`.

## Check

- Send an email from your own mailbox to a member's address
  (e.g. `aisha.benali@workroute.team`). It appears in their Mail tab within
  seconds, and they get a "You have new email" note on their personal email.
- Reply from the portal. It arrives from `aisha.benali@workroute.team`.
- Mail to an address nobody has is in the team admin panel → Team →
  **Mail to unknown addresses**.

If nothing arrives: the worker's **Logs** in Cloudflare show what the portal
answered — `401` means the two secrets differ, `503` means
`TEAM_MAIL_INBOUND_SECRET` is not set on Railway.
