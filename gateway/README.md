# workroute.team gateway

Railway's Hobby plan allows 2 custom domains per service, and the main
service already uses `workroute.co.uk` and `www.workroute.co.uk`. This tiny
service owns `workroute.team` and passes every request to the main service
over Railway's private network. The main service serves the team portal and
the team admin panel; this service stores nothing.

## Setting it up on Railway

1. In the **same project as the main service**, **Create → GitHub Repo** and
   pick this repository again. It must be the same project: Railway's private
   network only connects services within one project, and from another
   project the main service's private name leads nowhere (or back to the
   gateway itself).
   It becomes a second service — rename it `team-gateway`, and give it its own
   private name (Settings → Networking → Private Networking → DNS), so the two
   services are never confused.
2. In the new service's **Settings**:
   - **Branch**: the same branch as the main service.
   - **Root Directory**: `/gateway`
   - **Watch Paths** (optional): `/gateway/**`, so changes to the main site
     do not redeploy the gateway.
3. In the new service's **Variables**, add:

   ```
   TARGET_URL=http://${{MAIN.RAILWAY_PRIVATE_DOMAIN}}:8080
   ```

   Replace `MAIN` with the main service's name exactly as Railway shows it,
   and `8080` with the port in the main service's deploy logs
   (`- Local: http://localhost:8080`).
4. **Settings → Networking → Custom Domain**: add `workroute.team`, then add
   the DNS records Railway shows at the domain registrar.
5. Open `https://workroute.team/__gateway/health` — it says `ok` when the
   gateway runs; `https://workroute.team` should show the portal sign-in.

If the portal shows "WorkRoute Team is restarting", the gateway cannot reach
the main service. Open `https://workroute.team/__gateway/check`: it says
whether the address in `TARGET_URL` was found and whether the main service
answered on that port — over IPv6 and IPv4 separately — and what to change
if not. If it says the main service answers on IPv4 only, add the variable
`TARGET_FAMILY=4` to this gateway service.
