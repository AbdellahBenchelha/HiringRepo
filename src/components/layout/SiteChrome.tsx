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
 */
function hidden(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/admin") || pathname.startsWith("/interview");
}

export function SiteHeader() {
  return hidden(usePathname()) ? null : <Header />;
}

export function SiteFooter() {
  return hidden(usePathname()) ? null : <Footer />;
}
