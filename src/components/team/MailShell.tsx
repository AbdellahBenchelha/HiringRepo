import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CopyAddress } from "@/components/team/CopyAddress";

type Folder = "inbox" | "sent";

/**
 * The frame every Mail page sits in: the member's address, New email and
 * the folders down the side, then the page itself. On a phone they run
 * across the top instead.
 */
export function MailShell({
  address,
  folder,
  unread,
  children,
}: {
  address: string;
  /** The folder being shown or read from; null while writing. */
  folder: Folder | null;
  unread: number;
  children: ReactNode;
}) {
  const folders: { id: Folder; href: string; label: string; icon: "inbox" | "send" }[] = [
    { id: "inbox", href: "/mail", label: "Inbox", icon: "inbox" },
    { id: "sent", href: "/mail?folder=sent", label: "Sent", icon: "send" },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-cream-300 bg-white shadow-lift" data-mailbox>
      <div className="lg:grid lg:min-h-[34rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex flex-wrap items-center gap-2 border-b border-cream-200 bg-cream-50 px-3 py-3 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1 lg:border-b-0 lg:border-r lg:p-4">
          <div className="w-full min-w-0 rounded-xl border border-cream-300 bg-white py-2 pl-3 pr-1 lg:mb-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              <Icon name="mailLine" className="h-3.5 w-3.5 text-brand-600" /> Your email
            </p>
            <CopyAddress address={address} />
          </div>
          <Link href="/mail/new" className="btn-primary order-last ml-auto whitespace-nowrap px-3 py-2 sm:px-4 lg:order-none lg:mb-4 lg:ml-0 lg:py-3" data-mail-new>
            <Icon name="pencil" className="h-4 w-4" /> New email
          </Link>
          <nav aria-label="Folders" className="flex gap-1 lg:flex-col">
            {folders.map((f) => {
              const current = folder === f.id;
              return (
                <Link
                  key={f.id}
                  href={f.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition sm:gap-3 sm:px-3 ${
                    current ? "bg-navy-900 text-white shadow-soft" : "text-navy-600 hover:bg-cream-200 hover:text-navy-900"
                  }`}
                >
                  <Icon name={f.icon} className={`h-4 w-4 ${current ? "text-brand-400" : "text-navy-400"}`} />
                  <span className="flex-1">{f.label}</span>
                  {f.id === "inbox" && unread ? (
                    <span
                      className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
                        current ? "bg-brand-500 text-navy-900" : "bg-navy-900 text-white"
                      }`}
                      aria-label={`${unread} unread`}
                    >
                      {unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto hidden rounded-2xl border border-cream-300 bg-white p-3 text-xs leading-relaxed text-navy-500 lg:block">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-navy-800">
              <Icon name="shieldCheck" className="h-4 w-4 text-brand-600" /> Protected mailbox
            </p>
            Pictures from the internet stay hidden until you allow them, and links open in a new tab.
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
