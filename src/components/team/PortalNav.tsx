"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

export type PortalTab = "dashboard" | "mail" | "profile" | "tickets" | "phone" | "bank" | "documents";

const TABS: { id: PortalTab; href: string; label: string; icon: IconName }[] = [
  { id: "dashboard", href: "/", label: "Dashboard", icon: "chartBar" },
  { id: "mail", href: "/mail", label: "Mail", icon: "mail" },
  { id: "profile", href: "/profile", label: "Profile", icon: "user" },
  { id: "tickets", href: "/tickets", label: "Tickets", icon: "chatDots" },
  { id: "phone", href: "/phone", label: "Phone", icon: "phone" },
  { id: "bank", href: "/bank", label: "Bank", icon: "wallet" },
  { id: "documents", href: "/documents", label: "Documents", icon: "document" },
];

/**
 * The portal's tabs, with a count on Mail, Tickets and Phone when something new
 * has arrived. Checked every minute while the page is open, so a reply or a
 * code shows up without reloading.
 */
export function PortalNav({ active }: { active: PortalTab }) {
  const [badges, setBadges] = useState<{ tickets: number; phone: number; mail: number }>({ tickets: 0, phone: 0, mail: 0 });

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/team/badges", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { tickets: number; phone: number; mail?: number };
        if (!stop) setBadges({ tickets: data.tickets, phone: data.phone, mail: data.mail ?? 0 });
      } catch {
        /* a missed count is not worth an error */
      }
    }
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [active]);

  return (
    <nav aria-label="Portal" className="mx-auto max-w-6xl overflow-x-auto px-2 sm:px-4">
      <ul className="flex min-w-max gap-1">
        {TABS.map((t) => {
          const count = t.id === "tickets" ? badges.tickets : t.id === "phone" ? badges.phone : t.id === "mail" ? badges.mail : 0;
          const on = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  on ? "border-brand-500 text-navy-900" : "border-transparent text-navy-500 hover:text-navy-900"
                }`}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
                {count > 0 ? (
                  <span
                    data-badge={t.id}
                    className="rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
                    aria-label={`${count} new`}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
