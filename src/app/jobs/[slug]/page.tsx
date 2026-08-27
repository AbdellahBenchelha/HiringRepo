import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { jobs, getJobBySlug, salaryParts } from "@/config/jobs";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";

export function generateStaticParams() {
  return jobs.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) return buildMetadata({ title: "Position not found", description: "", path: "/jobs" });
  return buildMetadata({
    title: job.title,
    description: job.shortDescription,
    path: `/jobs/${job.slug}`,
  });
}

/**
 * JobPosting structured data — this is what makes a listing eligible for the
 * Google Jobs box above the normal results.
 *
 * Two details Google is strict about:
 *   validThrough — a posting with no end date is treated as indefinitely open
 *     and gets deprioritised, so it is derived from datePosted.
 *   applicantLocationRequirements — for a TELECOMMUTE role this must name real
 *     countries. A placeholder is rejected, and the values decide which
 *     candidates are shown the listing at all.
 *   baseSalary — recommended, not required: Search Console reports it missing
 *     as a non-critical issue and the listing stays valid without it. Emitted
 *     only for jobs that actually declare pay, because a figure here is a
 *     public statement about what the role pays, and one that contradicts the
 *     page is worse than one that is absent. It carries base pay only:
 *     commission is real pay but not base pay, so inflating this figure with
 *     it would misreport what the role guarantees.
 */
function jobPostingJsonLd(slug: string) {
  const job = getJobBySlug(slug);
  if (!job) return null;

  const posted = new Date(job.datePosted);
  const validThrough = new Date(posted);
  validThrough.setDate(validThrough.getDate() + siteConfig.jobValidityDays);

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: `${job.shortDescription} Responsibilities include: ${job.responsibilities.join(
      "; "
    )}. Requirements: ${job.requirements.join("; ")}.${
      job.salary?.detail ? ` ${job.salary.detail}` : ""
    }`,
    identifier: {
      "@type": "PropertyValue",
      name: siteConfig.company.name,
      value: job.slug,
    },
    datePosted: job.datePosted,
    validThrough: validThrough.toISOString().slice(0, 10),
    employmentType: job.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: siteConfig.company.name,
      sameAs: siteConfig.url,
      logo: `${siteConfig.url}/logo-mark.svg`,
    },
    applicantLocationRequirements: siteConfig.hiringCountries.map((name) => ({
      "@type": "Country",
      name,
    })),
    jobLocationType: "TELECOMMUTE",
    directApply: true,
    ...(job.salary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.salary.currency,
            value: {
              "@type": "QuantitativeValue",
              // A range needs min and max; a fixed rate needs a single value.
              // Sending both, or a range whose ends are equal, is what trips
              // the Rich Results test.
              ...(job.salary.max !== undefined && job.salary.max !== job.salary.min
                ? { minValue: job.salary.min, maxValue: job.salary.max }
                : { value: job.salary.min }),
              unitText: job.salary.unit,
            },
          },
        }
      : {}),
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const jsonLd = jobPostingJsonLd(slug);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <PageHeader eyebrow="Open Position" title={job.title} description={job.shortDescription}>
        <div className="flex flex-wrap gap-3">
          <ApplyButton position={job.title} label="Apply for This Position" />
          <Link href="/jobs" className="btn-secondary">
            Back to all positions
          </Link>
        </div>
      </PageHeader>

      <section className="section bg-white">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_18rem]">
          <div className="max-w-2xl space-y-10">
            <div>
              <h2 className="text-2xl">Responsibilities</h2>
              <ul className="mt-4 space-y-2.5">
                {job.responsibilities.map((r) => (
                  <li key={r} className="flex items-start gap-3 text-navy-700">
                    <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl">Requirements</h2>
              <ul className="mt-4 space-y-2.5">
                {job.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-3 text-navy-700">
                    <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-cream-200/80 p-6">
              <h2 className="text-xl">Ready to apply?</h2>
              <p className="mt-2 text-sm text-navy-600">
                The position will be pre-selected for you in the application form. A CV is optional.
              </p>
              <div className="mt-4">
                <ApplyButton position={job.title} label="Apply for This Position" />
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                At a glance
              </h2>

              {/* Pay is set apart rather than enlarged. It stays the first
                  thing in the panel and the only tinted block, which is enough
                  to make it the fact the eye lands on — the surrounding rows
                  are plain text on white.
                  Shown as well as marked up: Google expects structured data to
                  reflect what a visitor can actually read on the page. */}
              {job.salary ? (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    Pay
                  </p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-lg font-bold tracking-tight text-navy-900">
                      {salaryParts(job.salary).amount}
                    </span>
                    <span className="text-xs font-medium text-navy-600">
                      {salaryParts(job.salary).period}
                    </span>
                  </p>
                  {salaryParts(job.salary).note ? (
                    <p className="mt-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                        <Icon name="wallet" className="h-3 w-3" />
                        {salaryParts(job.salary).note}
                      </span>
                    </p>
                  ) : null}
                  {job.salary.detail ? (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-navy-600">
                      {job.salary.detail}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-navy-500">Work arrangement</dt>
                  <dd className="mt-0.5 text-navy-800">{job.workArrangement}</dd>
                </div>
                <div>
                  <dt className="font-medium text-navy-500">Experience level</dt>
                  <dd className="mt-0.5 text-navy-800">{job.experienceLevel}</dd>
                </div>
                <div>
                  <dt className="font-medium text-navy-500">Required languages</dt>
                  <dd className="mt-0.5 text-navy-800">{job.languages}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
