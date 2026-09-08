"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

/**
 * The three country rules, side by side.
 *
 * They were three separate items in the sidebar, which made a settings screen
 * look like three parts of the working day — sitting between the tabs where
 * candidates are actually handled. They are the same kind of thing (a list of
 * countries a rule applies to), changed rarely, and read against each other:
 * whether a country needs an ID check is a question you ask next to whether it
 * needs a CV.
 *
 * Still three routes, so an existing bookmark still lands where it did and the
 * browser's back button behaves.
 */

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/settings/verification", label: "ID verification", icon: "shield" },
  { href: "/admin/settings/cv", label: "CV requirement", icon: "upload" },
  { href: "/admin/settings/manual-invite", label: "Manual invitations", icon: "clock" },
];

export function SettingsTabs() {
  const pathname = usePathname() ?? "";

  return (
    // Scrolls rather than wraps: three tabs on a narrow phone would otherwise
    // stack into something that no longer reads as one row of choices.
    <div className="mb-6 overflow-x-auto">
      <nav
        aria-label="Settings sections"
        className="inline-flex min-w-full gap-1 rounded-2xl border border-navy-100 bg-white p-1.5 sm:min-w-0"
      >
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-navy-600 hover:bg-navy-100 hover:text-navy-900"
              }`}
            >
              <Icon name={tab.icon} className="h-4 w-4 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
