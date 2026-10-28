import { NextResponse, type NextRequest } from "next/server";

/**
 * Two websites from one app: workroute.co.uk is the hiring site, and
 * workroute.team is the team portal.
 *
 * On the team domain every page path is quietly served from /team — so
 * workroute.team/tickets is the page in app/team/tickets — while the Admin
 * Panel, the API and static files pass through unchanged. On any other
 * domain /team does not exist: it is sent to the team domain instead, so the
 * portal is only ever used, and bookmarked, at its own address.
 *
 *   TEAM_HOSTS       — the team domain's host names (default: workroute.team,
 *                      www.workroute.team). Comma-separated.
 *   TEAM_PORTAL_URL  — where the portal lives (default https://workroute.team).
 */

function teamHosts(): string[] {
  return (process.env.TEAM_HOSTS || "workroute.team,www.workroute.team")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function portalUrl(): string {
  return (process.env.TEAM_PORTAL_URL || "https://workroute.team").replace(/\/$/, "");
}

/** Things served as they are on both domains. */
function passThrough(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    // Files: /images/x.webp, /logo.svg, /icon.svg, /favicon.ico …
    /\.[a-z0-9]{2,5}$/i.test(pathname)
  );
}

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname, search } = req.nextUrl;
  const hosts = teamHosts();

  if (!hosts.includes(host)) {
    if (pathname === "/team" || pathname.startsWith("/team/")) {
      return NextResponse.redirect(`${portalUrl()}${pathname.slice(5) || "/"}${search}`, 308);
    }
    return NextResponse.next();
  }

  // www. → the bare domain, so there is one address and one set of cookies.
  if (host.startsWith("www.") && hosts.includes(host.slice(4))) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4);
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // The team domain is private: nothing on it is for search engines.
  if (pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (pathname === "/admin") return NextResponse.redirect(new URL("/admin/team", req.url), 307);
  if (passThrough(pathname)) return NextResponse.next();

  // An old-style /team/... link on the team domain: drop the prefix.
  if (pathname === "/team" || pathname.startsWith("/team/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(5) || "/";
    return NextResponse.redirect(url, 308);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/team${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
