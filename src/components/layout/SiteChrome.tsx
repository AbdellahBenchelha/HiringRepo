"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";

// The Admin Panel has its own shell, so the public marketing header/footer are
// hidden there. Everything else keeps the site chrome exactly as before.
function hidden(pathname: string | null): boolean {
  return !!pathname && pathname.startsWith("/admin");
}

export function SiteHeader() {
  return hidden(usePathname()) ? null : <Header />;
}

export function SiteFooter() {
  return hidden(usePathname()) ? null : <Footer />;
}
