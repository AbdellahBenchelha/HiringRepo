import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { jobs, getJobBySlug } from "@/config/jobs";
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

function jobPostingJsonLd(slug: string) {
  const job = getJobBySlug(slug);
  if (!job) return null;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: `${job.shortDescription} Responsibilities include: ${job.responsibilities.join(
      "; "
    )}. Requirements: ${job.requirements.join("; ")}.`,
    datePosted: job.datePosted,
    employmentType: job.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: siteConfig.company.name,
      sameAs: siteConfig.url,
    },
    applicantLocationRequirements: { "@type": "Country", name: "Multiple" },
    jobLocationType: "TELECOMMUTE",
    directApply: true,
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

            <div className="rounded-2xl bg-navy-50/70 p-6">
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
