import type { ReactNode } from "react";
import Link from "next/link";
import { footerNav } from "@/config/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * Shared layout for all legal pages: a consistent header, a sidebar of related
 * legal documents, and a styled content area (uses the .prose-legal styles).
 */
export function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow="Legal & Privacy" title={title} description={intro} />
      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_18rem] lg:py-16">
        <article className="prose-legal">
          <p className="text-sm text-navy-500">Last updated: {lastUpdated}</p>
          {children}
        </article>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
              Related documents
            </h2>
            <ul className="mt-4 space-y-2">
              {footerNav.legal.concat(footerNav.candidateResources).map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-700 transition hover:text-brand-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

/** Notice that legal copy must be reviewed by a qualified professional. */
export function LegalReviewNotice() {
  return (
    <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <strong>Important:</strong> This document is a professionally written starting point and does
      not constitute legal advice. It should be reviewed and adapted by a qualified legal
      professional based on the company&apos;s country of operation and applicable laws before
      publication.
    </div>
  );
}
