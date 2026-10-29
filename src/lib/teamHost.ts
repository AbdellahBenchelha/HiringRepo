/**
 * Which domain is which, and which admin pages belong to which panel.
 *
 * Pure module — read by the proxy, the server and the browser alike.
 *
 *   workroute.co.uk/admin  — the hiring panel: candidates, offers, emails…
 *   workroute.team/admin   — the team panel: Team, Team tickets, Team phone,
 *                            Hours & pay
 *
 * Each panel only opens on its own domain, and each domain has its own
 * sign-in (the session cookie is per domain).
 *
 *   TEAM_HOSTS       — the team domain's host names (default: workroute.team,
 *                      www.workroute.team). Comma-separated.
 *   TEAM_PORTAL_URL  — where the team domain lives (default https://workroute.team).
 */

export function teamHosts(): string[] {
  return (process.env.TEAM_HOSTS || "workroute.team,www.workroute.team")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function isTeamHost(host: string | null | undefined): boolean {
  return teamHosts().includes((host ?? "").split(":")[0].toLowerCase());
}

export function teamPortalUrl(): string {
  return (process.env.TEAM_PORTAL_URL?.trim() || "https://workroute.team").replace(/\/$/, "");
}

/** The pages of the team admin panel. Everything else under /admin is the hiring panel. */
const TEAM_ADMIN_PREFIXES = ["/admin/team", "/admin/team-tickets", "/admin/team-phone", "/admin/team-pay"];

export function isTeamAdminPath(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return TEAM_ADMIN_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));
}

/** The team panel's API. Sign-in and sign-out are shared by both panels. */
export function isTeamAdminApi(pathname: string): boolean {
  return pathname.startsWith("/api/admin/team/");
}

export function isSharedAdminApi(pathname: string): boolean {
  return pathname === "/api/admin/login" || pathname === "/api/admin/logout";
}

/** A ?next= that is safe to go to after signing in: an admin page on this site, never another site. */
export function safeAdminNext(next: string | null | undefined): string | null {
  return next && next.startsWith("/admin") && !next.startsWith("//") ? next : null;
}

/** The domain of the built-in mailboxes. TEAM_MAIL_DOMAIN overrides it. */
export function teamMailDomain(): string {
  return (process.env.TEAM_MAIL_DOMAIN?.trim() || "workroute.team").toLowerCase();
}
