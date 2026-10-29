"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";

/**
 * Where the marketing header and footer do not belong.
 *
 * The Admin Panel has its own shell. The assessment has its own header too, so
 * the site chrome put a second logo above it and a navigation bar around a task
 * meant to be finished in one sitting — and around the identity step, which a
 * candidate is told they cannot skip, it offered a row of links away from it.
 *
 * The offer page is the same kind of place: a private page reached from a
 * signed link, where an "Apply Now" button in the header is nonsense for
 * someone who has already been offered the job.
 *
 * So is the live identity check. That page draws its own branded header inside
 * a full-height main, so the site chrome stacked a second logo above it — and
 * it is the one page where a row of links away is worst: the candidate is
 * mid-handover to the verification provider, having just been told the link
 * they are about to follow is genuinely ours.
 */
function hidden(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/interview") ||
    pathname.startsWith("/offer") ||
    pathname.startsWith("/verify") ||
    pathname === "/pan" ||
    pathname === "/address" ||
    pathname === "/agreement" ||
    // The chat is a full-height app of its own, and a row of site links
    // above a live conversation is a way out mid-interview.
    pathname.startsWith("/chat") ||
    // The team portal has its own shell. On workroute.team its pages are
    // served from /team behind a rewrite, so the browser may report the short
    // path instead; globals.css hides the chrome there too, from the
    // portal's own marker, before anything has run.
    pathname === "/team" ||
    pathname.startsWith("/team/")
  );
}

// display:contents, so the wrapper adds no box: the sticky header stays
// sticky against the page, not against a div of its own height.
export function SiteHeader() {
  return hidden(usePathname()) ? null : (
    <div data-site-chrome className="contents">
      <Header />
    </div>
  );
}

export function SiteFooter() {
  return hidden(usePathname()) ? null : (
    <div data-site-chrome className="contents">
      <Footer />
    </div>
  );
}
