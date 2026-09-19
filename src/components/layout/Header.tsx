"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mainNav, secondaryNav, type NavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";
import { Logo } from "@/components/layout/Logo";

/**
 * The site header.
 *
 * White rather than cream, which is the one place this site breaks its own
 * "never pure white" rule and should: a white bar over a cream page separates
 * itself without needing a heavy border or a shadow, and the crispness is most
 * of what reads as professional. The page behind it stays cream.
 *
 * The nav is grouped — see config/navigation. Two of the four items open a
 * panel, which is built here rather than pulled in, because a menu that is not
 * reachable from a keyboard is worse than no menu: the three things that make
 * one real are Escape, a click outside, and focus leaving the group, and all
 * three are cheap when you own the component.
 */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  /**
   * Which group is open, and whether it was opened deliberately.
   *
   * The two are not the same thing, and conflating them is the classic way
   * these menus end up broken. Hovering opens a panel; the pointer arriving on
   * the button to click it has already opened it, so a plain toggle would read
   * that click as "close" and the panel would vanish the instant it was
   * pressed. Pinned says the person meant it: a pinned panel survives the
   * pointer leaving, and only a second press, Escape or a click elsewhere
   * shuts it.
   */
  const [menu, setMenu] = useState<{ label: string; pinned: boolean } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLUListElement>(null);
  /** Lets a pointer leave one group and arrive at the next without a flicker. */
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu = menu?.label ?? null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes whichever of the two is open, innermost first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openMenu) setMenu(null);
      else if (mobileOpen) setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, openMenu]);

  // A click anywhere else closes the dropdown. Without this the panel outlives
  // the intent behind it and follows you down the page.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  /** Pointer arrived on a group. Opens it, without claiming it was meant. */
  const hoverEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu((m) => (m?.label === label ? m : { label, pinned: false }));
  };

  /** Pointer left. A pinned panel stays; a hovered one goes, after a beat. */
  const hoverLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenu((m) => (m?.pinned ? m : null)), 120);
  };

  /** Pressed. Pins it open, or closes it if this press is the second one. */
  const toggle = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu((m) => (m?.label === label && m.pinned ? null : { label, pinned: true }));
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-cream-300 bg-white transition-shadow ${
        scrolled ? "shadow-[0_1px_16px_rgba(15,16,53,0.07)]" : ""
      }`}
    >
      <a href="#main" className="sr-only sr-only-focusable rounded bg-brand-600 text-white">
        Skip to main content
      </a>

      <nav className="container-page flex h-16 items-center gap-6 lg:h-[72px]" aria-label="Main">
        {/* ---------------------------------------------------------------- */}
        {/* The mark                                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex shrink-0 items-center">
          <Link
            href="/#home"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
            aria-label={`${siteConfig.company.name} home`}
          >
            <Logo className="h-9 w-9" />
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-bold tracking-tight text-navy-900">
                {siteConfig.company.shortName}
              </span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.17em] text-navy-400">
                {siteConfig.company.descriptor}
              </span>
            </span>
          </Link>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* The nav, centred                                                 */}
        {/* ---------------------------------------------------------------- */}
        <ul ref={navRef} className="mx-auto hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && hoverEnter(item.label)}
              onMouseLeave={() => item.children && hoverLeave()}
            >
              {item.children ? (
                <GroupButton
                  item={item}
                  open={openMenu === item.label}
                  onToggle={() => toggle(item.label)}
                  onClose={() => setMenu(null)}
                />
              ) : (
                <Link href={item.href!} className={LINK_CLASS}>
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* ---------------------------------------------------------------- */}
        {/* Secondary, then the one action                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <div className="hidden items-center gap-4 lg:flex">
            <span aria-hidden="true" className="h-6 w-px bg-cream-300" />
            {secondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-1 py-2 text-[15px] font-medium text-navy-500 transition hover:text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:block">
            <ApplyButton label="Apply Now" className="!px-6 !py-2.5 !text-[15px]" />
          </div>

          <button
            type="button"
            className="-mr-2 rounded-xl p-2.5 text-navy-700 transition hover:bg-cream-200 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Icon name={mobileOpen ? "close" : "menu"} className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile                                                             */}
      {/* ------------------------------------------------------------------ */}
      {/* Flat, with the groups as headings. A dropdown inside a dropdown is a
          thing to fight with on a phone, and there are only six links. */}
      {mobileOpen ? (
        <div
          id="mobile-menu"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-cream-300 bg-white lg:hidden"
        >
          <ul className="container-page flex flex-col gap-0.5 py-4">
            {mainNav.map((item) =>
              item.children ? (
                <li key={item.label} className="pt-3">
                  <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-400">
                    {item.label}
                  </p>
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={MOBILE_LINK_CLASS}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href!}
                    onClick={() => setMobileOpen(false)}
                    className={MOBILE_LINK_CLASS}
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
            {secondaryNav.map((item) => (
              <li key={item.href} className="mt-3 border-t border-cream-200 pt-3">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={MOBILE_LINK_CLASS}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="px-1 pt-3">
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

const LINK_CLASS =
  "flex items-center gap-1 rounded-lg px-3.5 py-2 text-[15px] font-medium text-navy-700 transition hover:text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const MOBILE_LINK_CLASS =
  "block rounded-xl px-4 py-3 text-base font-medium text-navy-800 transition hover:bg-cream-100";

/**
 * One group in the bar, and the panel it opens.
 *
 * A button rather than a link, because it goes nowhere — and `aria-expanded`
 * so a screen reader is told it opens something before it is pressed. Focus
 * leaving the whole group closes it, which is what makes tabbing through the
 * header behave the way the mouse does.
 */
function GroupButton({
  item,
  open,
  onToggle,
  onClose,
}: {
  item: NavItem;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onClose();
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`${LINK_CLASS} ${open ? "text-navy-900" : ""}`}
      >
        {item.label}
        <Icon
          name="chevronDown"
          className={`h-4 w-4 text-navy-400 transition-transform duration-200 ${
            open ? "-rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="w-[19rem] overflow-hidden rounded-2xl border border-cream-300 bg-white p-2 shadow-[0_16px_48px_rgba(15,16,53,0.13)]">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                className="block rounded-xl px-3.5 py-3 transition hover:bg-cream-100 focus-visible:bg-cream-100 focus-visible:outline-none"
              >
                <span className="block text-[15px] font-semibold text-navy-900">{child.label}</span>
                {child.description ? (
                  <span className="mt-0.5 block text-[13px] leading-snug text-navy-500">
                    {child.description}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
