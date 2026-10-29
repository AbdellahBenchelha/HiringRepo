import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { listAnnouncements, type TeamMember } from "@/lib/teamStore";
import { PortalNav, type PortalTab } from "@/components/team/PortalNav";
import { Announcements } from "@/components/team/Announcements";
import { SignOutButton } from "@/components/team/SignOutButton";

/**
 * Every signed-in portal page: the header, the tabs, any announcements, and
 * the page itself in a reading-width column.
 */
export async function PortalShell({
  member,
  active,
  title,
  intro,
  wide,
  hideTitle,
  children,
}: {
  member: TeamMember;
  active: PortalTab;
  title: string;
  intro?: ReactNode;
  /** Use the whole width of the screen (Mail). */
  wide?: boolean;
  /** Keep the page title for screen readers only. */
  hideTitle?: boolean;
  children: ReactNode;
}) {
  const dismissed = new Set(member.dismissedAnnouncements ?? []);
  const announcements = (await listAnnouncements())
    .filter((a) => a.active && !dismissed.has(a.id))
    .slice(0, 3)
    .map(({ id, title: t, body, createdAt }) => ({ id, title: t, body, createdAt }));

  return (
    <>
      <header className="border-b border-cream-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="h-9 w-9" />
            <div className="min-w-0">
              <p className="font-display text-lg font-extrabold leading-none text-navy-900">WorkRoute</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Team portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden truncate text-sm text-navy-500 sm:block">{member.fullName}</p>
            <SignOutButton />
          </div>
        </div>
        <PortalNav active={active} />
      </header>

      <div className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${wide ? "max-w-none" : "max-w-6xl"}`}>
        <Announcements items={announcements} />
        {hideTitle ? (
          <h1 className="sr-only">{title}</h1>
        ) : (
          <div className="mb-6">
            <h1 className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>
            {intro ? <div className="mt-1 text-sm text-navy-500">{intro}</div> : null}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
