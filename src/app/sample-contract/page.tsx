import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { contractDocument, contractSummary } from "@/config/contracts";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentDownloadCard } from "@/components/cards/DocumentDownloadCard";
import { Icon, type IconName } from "@/components/Icon";

/**
 * UNLISTED PAGE — candidates reach it from the link in their job offer email.
 *
 * It is intentionally NOT in the sitemap, NOT in the header/footer navigation,
 * and NOT indexable. See src/config/contracts.ts before changing that.
 */
export const metadata: Metadata = {
  title: "Sample Employment Contract",
  description:
    "The example employment contract we send with a job offer, so you can read our standard terms before you decide.",
  robots: { index: false, follow: false, nocache: true },
};

const formattedIssueDate = new Date(contractDocument.issued).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function SampleContractPage() {
  const { contact } = siteConfig;

  return (
    <>
      <PageHeader
        eyebrow="For candidates with an offer"
        title="Sample Employment Contract"
        description="Read our standard employment terms before you decide. Take the time you need, and ask us anything that is not clear."
      />

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_18rem] lg:py-16">
        <div className="min-w-0 max-w-3xl">
          {/* The single most important message on the page. */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <strong>This is an example, not an offer.</strong> It shows the terms we normally use, with
            personal details left as placeholders. Your own offer letter, and the contract you are
            given to sign, are the documents that count. Nothing here creates an obligation for you
            or for us.
          </div>

          <section className="mt-8">
            <DocumentDownloadCard
              title={contractDocument.title}
              description="The full specimen contract, exactly as it is laid out in the real document. Download it, read it at your own pace, and share it with anyone you want to advise you."
              href={contractDocument.downloadPath}
              downloadName={contractDocument.downloadName}
              meta={[
                { label: "Format", value: "PDF" },
                { label: "Pages", value: String(contractDocument.pages) },
                { label: "Size", value: contractDocument.sizeLabel },
                { label: "Language", value: contractDocument.language },
                { label: "Version", value: `${contractDocument.version} (${formattedIssueDate})` },
              ]}
              note={`Applies to: ${contractDocument.appliesTo}. Other contract types — for example fixed-term or part-time — use a different template, which we will send you if it applies to your offer.`}
            />
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">
              What the contract covers
            </h2>
            <p className="mt-3 leading-relaxed text-navy-600">
              A short summary, in plain language, so you can get the shape of it without opening the
              PDF. The document itself is the complete text.
            </p>

            <ul className="mt-6 space-y-4">
              {contractSummary.map((item) => (
                <li key={item.heading} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"
                  >
                    <Icon name={item.icon as IconName} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-navy-900">{item.heading}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">
              Before you accept
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-navy-700">
              <li>
                Check your offer letter against this document. The offer letter contains your
                personal terms — job title, pay, hours, start date and place of work.
              </li>
              <li>
                Ask about anything that is unclear. Questions are welcome and will never count
                against you.
              </li>
              <li>
                Take your time within the deadline in your offer letter. If you need longer, tell us
                and we will do our best to accommodate it.
              </li>
              <li>
                The final contract may differ from this specimen depending on the role, the site, the
                country of employment and any collective agreement that applies there.
              </li>
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
              Questions about the contract?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-600">
              Reply to your offer email, or contact our recruitment team directly.
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <a
                  href={`mailto:${contact.recruitmentEmail}`}
                  className="break-all font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  {contact.recruitmentEmail}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="text-navy-700">{contact.phone}</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="text-navy-700">{contact.businessHours}</span>
              </li>
            </ul>

            <div className="mt-6 border-t border-navy-100 pt-4">
              <h3 className="text-sm font-semibold text-navy-900">Related</h3>
              <ul className="mt-2 space-y-2">
                <li>
                  <Link
                    href="/applicant-privacy"
                    className="text-sm text-navy-700 transition hover:text-brand-700"
                  >
                    Applicant Privacy Notice
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-sm text-navy-700 transition hover:text-brand-700">
                    Recruitment process
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-navy-700 transition hover:text-brand-700">
                    Contact us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
