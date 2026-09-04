"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "trendingUp" },
  { href: "/admin/candidates", label: "Candidates", icon: "users" },
  { href: "/admin/interviews", label: "Interviews", icon: "chat" },
  { href: "/admin/accepted", label: "Accepted", icon: "checkCircle" },
  { href: "/admin/settings/verification", label: "ID checks", icon: "shield" },
  { href: "/admin/settings/manual-invite", label: "Manual invites", icon: "clock" },
  { href: "/admin/settings/cv", label: "CV requirement", icon: "upload" },
];

const NAV_KEY = "wr_admin_nav";

/**
 * Restores the collapsed sidebar before anything is painted.
 *
 * Deliberately an inline script and not React state. Every admin page mounts
 * its own shell, so state read from storage in an effect would render the
 * sidebar full width and then snap it narrow — on every single page load. This
 * runs while the browser is still parsing the markup above the sidebar, so a
 * collapsed sidebar is simply never drawn wide.
 *
 * Wrapped in try/catch because storage throws outright in some privacy modes,
 * and a sidebar preference is not worth a blank admin panel.
 */
const RESTORE = `try{if(localStorage.getItem(${JSON.stringify(NAV_KEY)})==="1")document.documentElement.classList.add("nav-collapsed")}catch(e){}`;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  /**
   * The class on <html> is the state; there is no React copy of it to drift.
   * It also survives navigation between admin pages for free, which a value in
   * this component would not — the shell remounts with every page.
   */
  function toggleNav() {
    const root = document.documentElement;
    const collapsed = root.classList.toggle("nav-collapsed");
    try {
      localStorage.setItem(NAV_KEY, collapsed ? "1" : "0");
    } catch {
      /* the sidebar still works, it just will not be remembered */
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.replace("/admin/login");
    router.refresh();
  }

  const navLinks = (
    <nav className="space-y-1">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          // The label is what a screen reader announces whether or not the text
          // is on screen, and the tooltip is how a collapsed icon explains
          // itself to everyone else.
          aria-label={item.label}
          title={item.label}
          className={`admin-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive(item.href)
              ? "bg-brand-600 text-white"
              : "text-navy-600 hover:bg-navy-100 hover:text-navy-900"
          }`}
        >
          <Icon name={item.icon} className="h-5 w-5 shrink-0" />
          <span className="admin-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy-50/60">
      <script dangerouslySetInnerHTML={{ __html: RESTORE }} />

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-navy-100 bg-white px-4 py-3 lg:hidden">
        <Logo className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-navy-600 hover:bg-navy-100"
          aria-label="Toggle menu"
        >
          <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
        </button>
      </div>

      {open ? (
        <div className="border-b border-navy-100 bg-white px-4 py-3 lg:hidden">
          {navLinks}
          <button onClick={logout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
            <Icon name="arrowRight" className="h-5 w-5" /> Logout
          </button>
        </div>
      ) : null}

      {/* Full width on purpose. This was capped at max-w-7xl, a reading width
          borrowed from the marketing pages, which left the candidates table
          scrolling sideways while several hundred pixels sat empty either
          side. An admin table should use the screen it is given. */}
      <div className="flex w-full">
        {/* Desktop sidebar. Its width and its labels are governed by the
            nav-collapsed class on <html>; see globals.css. */}
        <aside className="admin-nav sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-navy-100 bg-white p-5 transition-[width,padding] duration-200 lg:flex">
          <div className="admin-nav-head flex items-start justify-between gap-2 px-2 pb-6">
            <div className="admin-nav-label min-w-0">
              <Logo className="h-8 w-auto" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Admin Panel
              </p>
            </div>
            <button
              type="button"
              onClick={toggleNav}
              className="shrink-0 rounded-lg p-1.5 text-navy-400 transition hover:bg-navy-100 hover:text-navy-700"
              aria-label="Show or hide the menu labels"
              title="Show or hide the menu labels"
            >
              <Icon name="chevronLeft" className="admin-nav-collapse h-5 w-5" />
              <Icon name="chevronRight" className="admin-nav-expand h-5 w-5" />
            </button>
          </div>

          {navLinks}

          <button
            onClick={logout}
            aria-label="Logout"
            title="Logout"
            className="admin-nav-item mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <Icon name="arrowRight" className="h-5 w-5 shrink-0" />
            <span className="admin-nav-label">Logout</span>
          </button>
        </aside>

        {/* A div, not a <main>: the root layout already provides the page's
            single main landmark, and nesting a second one inside it is invalid
            markup that leaves assistive technology with two "main"s to choose
            between. */}
        <div className="admin-main min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
