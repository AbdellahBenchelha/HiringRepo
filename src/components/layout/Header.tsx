"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mainNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";
import { Logo } from "@/components/layout/Logo";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-shadow ${
        scrolled ? "bg-white/95 shadow-soft backdrop-blur" : "bg-white"
      }`}
    >
      <a href="#main" className="sr-only sr-only-focusable rounded bg-brand-600 text-white">
        Skip to main content
      </a>
      <nav className="container-page flex h-16 items-center justify-between lg:h-20" aria-label="Main">
        <Link href="/#home" className="flex items-center gap-3" aria-label={`${siteConfig.company.name} home`}>
          <Logo />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight text-navy-900 sm:text-lg">
              {siteConfig.company.shortName}
            </span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-700 sm:text-[10px] sm:tracking-[0.18em]">
              {siteConfig.company.descriptor}
            </span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 xl:flex">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-navy-700 transition hover:bg-navy-50 hover:text-navy-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden xl:block">
            <ApplyButton label="Apply Now" />
          </div>
          <button
            type="button"
            className="rounded-full p-2.5 text-navy-700 transition hover:bg-navy-50 xl:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Icon name={mobileOpen ? "close" : "menu"} className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen ? (
        <div id="mobile-menu" className="border-t border-navy-100 bg-white xl:hidden">
          <ul className="container-page flex flex-col gap-1 py-4">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-navy-800 transition hover:bg-navy-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="px-1 pt-2">
              <div onClick={() => setMobileOpen(false)}>
                <ApplyButton label="Apply Now" className="w-full" />
              </div>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
