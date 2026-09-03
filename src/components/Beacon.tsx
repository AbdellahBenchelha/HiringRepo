"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells the server a page was looked at.
 *
 * Fires on first load and on every client-side navigation, which a server-side
 * count would miss entirely — moving between job listings never reaches the
 * server at all.
 *
 * `sendBeacon` rather than a fetch: the browser takes ownership of the request
 * and delivers it even if the page is being closed, so the last page of a
 * visit is not the one that always goes missing. It cannot fail visibly, and
 * nothing here is awaited, so a counter can never delay or break a page.
 *
 * There is no identifier in this call and nothing is stored in the browser —
 * see src/lib/visitorId.ts for how visitors are told apart without one.
 */
export function Beacon() {
  const pathname = usePathname();
  /**
   * React runs effects twice in development, and a re-render with the same
   * path must not count twice either.
   */
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastSent.current) return;
    // The admin panel is not the website; the server drops these too, but
    // there is no reason to send them.
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return;
    lastSent.current = pathname;

    const body = JSON.stringify({
      p: pathname + window.location.search,
      r: document.referrer,
    });

    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/track", blob)) return;
    } catch {
      /* fall through to fetch */
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
