"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mainNav, secondaryNav, type NavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";

/**
 * The site header.
 *
 * Cream and translucent, as in the approved design, so it sits on the page
 * rather than over it; a hairline and a soft shadow appear once the page has
 * scrolled, which is what keeps it legible over the sections below.
 *
 * The nav is grouped — see config/navigation. Two of the items open a panel,
 * built here rather than pulled in, because a menu that is not reachable from
 * a keyboard is worse than no menu: Escape, a click outside, and focus leaving
 * the group all close it.
 *
 * On phones and small tablets the whole nav moves into a panel that slides in
 * from the right. It takes focus when it opens, keeps the page behind it from
 * scrolling, and hands focus back to the menu button when it closes.
 */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  /**
   * Which group is open, and whether it was opened deliberately.
   *
   * Hovering opens a panel; the pointer arriving on the button to click it has
   * already opened it, so a plain toggle would read that click as "close".
   * Pinned says the person meant it: a pinned panel survives the pointer
   * leaving, and only a second press, Escape or a click elsewhere shuts it.
   */
  const [menu, setMenu] = useState<{ label: string; pinned: boolean } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLUListElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
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
      else if (mobileOpen) closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, openMenu]);

  // A click anywhere else closes the dropdown.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  // The drawer: lock the page behind it, move focus in, keep Tab inside it.
  useEffect(() => {
    if (!mobileOpen) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    const first = drawerRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>("a, button");
      if (!focusable.length) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      html.style.overflow = previous;
      document.removeEventListener("keydown", trap);
    };
  }, [mobileOpen]);

  // A drawer left open past the breakpoint would trap a desktop visitor.
  useEffect(() => {
    if (!mobileOpen) return;
    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = () => mq.matches && setMobileOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mobileOpen]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  function closeDrawer() {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }

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
      className={`sticky top-0 z-50 w-full border-b transition-shadow duration-300 ${
        scrolled
          ? "border-cream-300 shadow-[0_6px_24px_-12px_rgba(15,16,53,0.18)]"
          : "border-cream-300/70"
      }`}
    >
      {/* The background is its own layer: a blur on the header itself would
          make it the box the fixed mobile panel is positioned in. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 transition-colors duration-300 ${
          scrolled ? "bg-cream-100/90 backdrop-blur-md" : "bg-cream-100"
        }`}
      />
      <a href="#main" className="sr-only sr-only-focusable rounded bg-brand-600 text-white">
        Skip to main content
      </a>

      <nav className="container-page flex h-16 items-center gap-6 sm:h-[72px] xl:h-[76px]" aria-label="Main">
        {/* The mark */}
        <Link
          href="/#home"
          className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
          aria-label={`${siteConfig.company.name} home`}
        >
          <Logo className="h-9 w-9" />
          <span className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-navy-900">
            {siteConfig.company.shortName}
          </span>
        </Link>

        {/* The nav, centred */}
        <ul ref={navRef} className="mx-auto hidden items-center gap-1 xl:flex">
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
                  <Underline />
                </Link>
              )}
            </li>
          ))}
          {secondaryNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={LINK_CLASS}>
                {item.label}
                <Underline />
              </Link>
            </li>
          ))}
        </ul>

        {/* The one action */}
        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
          <Link
            href="/#open-positions"
            className="btn-brand group hidden !min-h-[44px] !px-5 !text-sm sm:inline-flex"
          >
            View Open Roles
            <Icon
              name="arrowRight"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded-xl text-navy-900 transition hover:bg-cream-200 xl:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile: a panel from the right, over a dimmed page. */}
      <div
        className={`fixed inset-0 z-[60] xl:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={closeDrawer}
          className={`absolute inset-0 bg-navy-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          ref={drawerRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!mobileOpen}
          className={`absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-cream-100 shadow-lift-lg transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-cream-300 px-5">
            <span className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="font-display text-xl font-extrabold tracking-[-0.03em] text-navy-900">
                {siteConfig.company.shortName}
              </span>
            </span>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-navy-900 transition hover:bg-cream-200"
            >
              <Icon name="close" className="h-6 w-6" />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto px-3 py-4">
            {mainNav.map((item) =>
              item.children ? (
                <li key={item.label} className="pt-4">
                  <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-400">
                    {item.label}
                  </p>
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link href={child.href} onClick={closeDrawer} className={MOBILE_LINK_CLASS}>
                          {child.label}
                          <Icon name="chevronRight" className="h-4 w-4 text-navy-300" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.label}>
                  <Link href={item.href!} onClick={closeDrawer} className={MOBILE_LINK_CLASS}>
                    {item.label}
                    <Icon name="chevronRight" className="h-4 w-4 text-navy-300" />
                  </Link>
                </li>
              ),
            )}
            {secondaryNav.map((item) => (
              <li key={item.href} className="mt-3 border-t border-cream-300 pt-3">
                <Link href={item.href} onClick={closeDrawer} className={MOBILE_LINK_CLASS}>
                  {item.label}
                  <Icon name="chevronRight" className="h-4 w-4 text-navy-300" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="space-y-2.5 border-t border-cream-300 p-5">
            <Link href="/#open-positions" onClick={closeDrawer} className="btn-brand w-full">
              View Open Roles
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link href="/apply" onClick={closeDrawer} className="btn-line w-full">
              Apply Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

const LINK_CLASS =
  "group relative flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg px-3.5 text-[15px] font-semibold text-navy-700 transition hover:text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const MOBILE_LINK_CLASS =
  "flex min-h-[48px] items-center justify-between rounded-xl px-3 text-base font-semibold text-navy-800 transition hover:bg-cream-200";

/** The amber line that grows under a link on hover, as on the active item in the design. */
function Underline() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-3.5 bottom-1.5 h-0.5 origin-left scale-x-0 rounded-full bg-brand-500 transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
    />
  );
}

/**
 * One group in the bar, and the panel it opens.
 *
 * A button rather than a link, because it goes nowhere — and `aria-expanded`
 * so a screen reader is told it opens something before it is pressed. Focus
 * leaving the whole group closes it.
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
          className={`h-4 w-4 text-navy-400 transition-transform duration-200 ${open ? "-rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="w-[19rem] overflow-hidden rounded-2xl bg-white p-2 shadow-lift-lg ring-1 ring-cream-300">
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
