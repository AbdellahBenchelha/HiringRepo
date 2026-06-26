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
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

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
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive(item.href)
              ? "bg-brand-600 text-white"
              : "text-navy-600 hover:bg-navy-100 hover:text-navy-900"
          }`}
        >
          <Icon name={item.icon} className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy-50/60">
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

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-navy-100 bg-white p-5 lg:flex">
          <div className="px-2 pb-6">
            <Logo className="h-8 w-auto" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Admin Panel</p>
          </div>
          {navLinks}
          <button
            onClick={logout}
            className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Icon name="arrowRight" className="h-5 w-5" /> Logout
          </button>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
