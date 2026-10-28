import { NextResponse, type NextRequest } from "next/server";
import {
  isSharedAdminApi,
  isTeamAdminApi,
  isTeamAdminPath,
  isTeamHost,
  teamPortalUrl,
} from "@/lib/teamHost";

/**
 * Two websites from one app, each with its own admin panel.
 *
 *   workroute.co.uk        the hiring site; /admin is the hiring panel
 *   workroute.team         the team portal; /admin is the team panel
 *
 * On the team domain every portal page is quietly served from /team — so
 * workroute.team/tickets is the page in app/team/tickets. /admin, the API and
 * static files pass through, but only to the team panel's own pages and API:
 * the hiring panel does not open there, and the team panel does not open on
 * the hiring domain. See lib/teamHost for which pages belong where.
 */

const ADMIN_COOKIE = "wr_admin";

function notFound() {
  return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}

/** Files: /images/x.webp, /logo.svg, /icon.svg, /favicon.ico … */
function isFile(pathname: string): boolean {
  return /\.[a-z0-9]{2,5}$/i.test(pathname);
}

/**
 * An admin page asked for without a session goes to the sign-in, which
 * brings you back to it afterwards — so an "Add to team" link from the other
 * panel still lands on the right form.
 */
function adminPage(req: NextRequest, pathname: string, search: string) {
  if (pathname !== "/admin/login" && !req.cookies.get(ADMIN_COOKIE)) {
    const url = new URL("/admin/login", req.url);
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname, search } = req.nextUrl;

  /* ---------------- the hiring domain ---------------- */
  if (!isTeamHost(host)) {
    if (pathname === "/team" || pathname.startsWith("/team/")) {
      return NextResponse.redirect(`${teamPortalUrl()}${pathname.slice(5) || "/"}${search}`, 308);
    }
    if (isTeamAdminPath(pathname)) return NextResponse.redirect(`${teamPortalUrl()}${pathname}${search}`, 307);
    if (isTeamAdminApi(pathname)) return notFound();
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminPage(req, pathname, search);
    return NextResponse.next();
  }

  /* ---------------- the team domain ---------------- */
  const bare = host.split(":")[0].toLowerCase();
  // www. → the bare domain, so there is one address and one set of cookies.
  if (bare.startsWith("www.") && isTeamHost(bare.slice(4))) {
    const url = req.nextUrl.clone();
    url.host = bare.slice(4);
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // The team domain is private: nothing on it is for search engines.
  if (pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Only the team panel here; anything else in /admin goes to its first tab.
    if (pathname !== "/admin/login" && !isTeamAdminPath(pathname)) {
      return NextResponse.redirect(new URL("/admin/team", req.url), 307);
    }
    return adminPage(req, pathname, search);
  }
  if (pathname.startsWith("/api/admin/")) {
    return isTeamAdminApi(pathname) || isSharedAdminApi(pathname) ? NextResponse.next() : notFound();
  }
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || isFile(pathname)) return NextResponse.next();

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
