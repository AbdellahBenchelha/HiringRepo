import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmailPreview } from "@/components/admin/EmailPreview";
import { siteConfig } from "@/config/site";
import {
  EMAIL_CATALOGUE,
  STAGE_LABEL,
  STAGE_ORDER,
  catalogueEntry,
  previewDocument,
  type CatalogueEntry,
} from "@/lib/emailCatalogue";

export const metadata: Metadata = {
  title: "Email templates",
  robots: { index: false, follow: false },
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** What the warm-up cap does to this email, in one line. */
const KIND_NOTE: Record<CatalogueEntry["kind"], { label: string; tone: string }> = {
  campaign: {
    label: "Counts toward the daily warm-up cap",
    tone: "border-navy-200 bg-navy-50 text-navy-600",
  },
  reactive: {
    label: "Always sent, even when the warm-up cap is reached",
    tone: "border-green-200 bg-green-50 text-green-700",
  },
  both: {
    label: "Always sent on applying · counts toward the cap when you resend it",
    tone: "border-green-200 bg-green-50 text-green-700",
  },
};

/**
 * Every email candidates receive, to read and nothing else.
 *
 * One template rendered per visit, chosen by `?t=`. Rendering all fourteen
 * and switching between them in the browser would send every one of them —
 * a few hundred kilobytes of email HTML — to open the page, when the person
 * opening it is going to read one. The URL also means a template can be sent
 * to somebody else as a link.
 */
export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const entry = catalogueEntry(one(params.t));
  const rendered = entry.render();
  const kind = KIND_NOTE[entry.kind];

  // The sender a candidate sees in their inbox. Not a secret — it is printed
  // on every email — and showing it makes the preview read as the inbox does.
  const fromName = process.env.ZEPTOMAIL_FROM_NAME?.trim() || siteConfig.company.name;
  const fromAddress = process.env.ZEPTOMAIL_FROM_ADDRESS?.trim();

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Email templates</h1>
        <p className="mt-1 text-sm text-navy-500">
          Every email candidates receive, shown with sample details. View only — nothing here can
          be edited or sent.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------- */}
        {/* The list                                                         */}
        {/* ---------------------------------------------------------------- */}
        <nav aria-label="Email templates" className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-5 rounded-2xl border border-navy-100 bg-white p-3 shadow-sm">
            {STAGE_ORDER.map((stage) => (
              <div key={stage}>
                <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-navy-400">
                  {STAGE_LABEL[stage]}
                </p>
                <ul className="space-y-0.5">
                  {EMAIL_CATALOGUE.filter((e) => e.stage === stage).map((e) => {
                    const active = e.id === entry.id;
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/admin/emails?t=${e.id}`}
                          scroll={false}
                          aria-current={active ? "page" : undefined}
                          data-template-source={e.source}
                          className={`block rounded-xl px-3 py-2 text-sm transition ${
                            active
                              ? "bg-brand-50 font-semibold text-navy-900 ring-1 ring-brand-200"
                              : "text-navy-600 hover:bg-cream-100 hover:text-navy-900"
                          }`}
                        >
                          {e.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* ---------------------------------------------------------------- */}
        {/* The email                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="min-w-0 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">
            {STAGE_LABEL[entry.stage]}
          </p>
          <h2 className="mt-1 text-xl font-bold text-navy-900">{entry.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">{entry.when}</p>
          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${kind.tone}`}
          >
            {kind.label}
          </span>

          {/* The two lines a candidate reads before deciding whether to open
              it at all. Laid out like an inbox rather than as labelled
              fields, because that is where they are actually seen. */}
          <dl className="mt-5 space-y-1.5 rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-sm">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-navy-400">From</dt>
              <dd className="min-w-0 break-words text-navy-800">
                <strong className="font-semibold">{fromName}</strong>
                {fromAddress ? <span className="text-navy-500"> &lt;{fromAddress}&gt;</span> : null}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-navy-400">Subject</dt>
              <dd className="min-w-0 break-words font-semibold text-navy-900" data-testid="email-subject">
                {rendered.subject}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <EmailPreview
              key={entry.id}
              html={previewDocument(rendered.html)}
              text={rendered.text}
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
