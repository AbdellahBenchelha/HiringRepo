import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { jobs, getJobBySlug, salaryParts, type JobPosting } from "@/config/jobs";
import { siteConfig } from "@/config/site";
import { hiringCountries } from "@/config/hiringCountries";
import { countryCode } from "@/config/countryCodes";
import { benefits, recruitmentProcess } from "@/config/content";
import { jobImage } from "@/config/images";
import { buildMetadata } from "@/lib/seo";
import { Icon, type IconName } from "@/components/Icon";
import { employmentLabels, jobIcon } from "@/components/cards/JobCard";
import { SHOWN as FEATURED_BENEFITS } from "@/components/sections/WhyJoinUs";
import {
  Arc,
  DotGrid,
  PEACH_BG,
  PeachBackdrop,
  PrimaryButton,
  ResponsiveImage,
  SecondaryButton,
  SectionLabel,
} from "@/components/ui/marketing";

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
    // ISO 3166-1 alpha-2, not the country's name. Google reads this field as a
    // code and answers "Invalid country code" for anything else — which
    // invalidates the whole listing, not just the one entry. A country with no
    // code on file is left out rather than sent as prose.
    applicantLocationRequirements: hiringCountries
      .map((name) => countryCode(name))
      .filter((code): code is string => !!code)
      .map((code) => ({ "@type": "Country", name: code })),
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
  const pay = job.salary ? salaryParts(job.salary) : null;
  const photo = jobImage(job.slug);
  const applyHref = `/apply?position=${encodeURIComponent(job.title)}`;
  const remote = job.workArrangement.includes("Remote");
  const offers = FEATURED_BENEFITS.map((f) => ({
    ...f,
    benefit: benefits.find((b) => b.title === f.title),
  })).filter((f) => f.benefit);
  const others = jobs.filter((j) => j.slug !== job.slug);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Header: the role, its facts, and its photo                        */}
      {/* ---------------------------------------------------------------- */}
      <header className={`relative isolate overflow-hidden ${PEACH_BG}`}>
        <PeachBackdrop />
        <DotGrid className="right-10 top-8 hidden lg:block" cols={5} rows={3} />

        <div className="container-page grid items-center gap-12 pb-16 pt-8 sm:pb-20 sm:pt-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-12 lg:pb-24 xl:gap-16">
          <div>
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-navy-500">
                <li>
                  <Link href="/" className="transition hover:text-navy-900">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <Icon name="chevronRight" className="h-4 w-4 text-navy-300" />
                </li>
                <li>
                  <Link href="/jobs" className="transition hover:text-navy-900">
                    Open Positions
                  </Link>
                </li>
                <li aria-hidden="true">
                  <Icon name="chevronRight" className="h-4 w-4 text-navy-300" />
                </li>
                <li aria-current="page" className="font-semibold text-navy-800">
                  {job.title}
                </li>
              </ol>
            </nav>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SectionLabel>Open Position</SectionLabel>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-800 ring-1 ring-inset ring-green-200">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-600" />
                Hiring now
              </span>
            </div>

            <h1 className="h-display mt-5 text-balance !text-[clamp(2.25rem,1.5rem+3vw,3.75rem)]">
              {job.title}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-[clamp(1rem,0.95rem+0.3vw,1.1875rem)] leading-relaxed text-navy-600">
              {job.shortDescription}
            </p>

            <ul className="mt-7 flex flex-wrap gap-2.5">
              {pay ? (
                <li className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 shadow-soft ring-1 ring-brand-200">
                  <Icon name="wallet" className="h-4 w-4 text-brand-500" />
                  <span className="font-display text-[15px] font-extrabold text-brand-700">
                    {pay.amount}
                    {pay.period.replace(/^per /, "/")}
                  </span>
                </li>
              ) : null}
              <Chip icon="mapPinLine">{remote ? "Remote" : job.workArrangement}</Chip>
              <Chip icon="briefcaseLine">{employmentLabels[job.employmentType]}</Chip>
              <Chip icon="chartBar">{job.experienceLevel}</Chip>
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href={applyHref} className="w-full !min-h-[54px] sm:w-auto sm:px-8">
                Apply for This Position
              </PrimaryButton>
              <SecondaryButton href="/jobs" className="w-full !min-h-[54px] sm:w-auto sm:px-7">
                Back to all positions
              </SecondaryButton>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-navy-500">
              <Icon name="checkCircle" className="h-4 w-4 text-brand-600" />
              A CV is optional — apply in minutes.
            </p>
          </div>

          {/* The role's photo, with its pay and the remote promise beside it */}
          <div className="relative mx-auto mt-8 w-full max-w-lg sm:mt-4 lg:mt-0 lg:max-w-none">
            <span
              aria-hidden="true"
              className="absolute -right-6 -top-8 h-[88%] w-[90%] rounded-[46%_54%_42%_58%/52%_44%_56%_48%] bg-gradient-to-bl from-[#FFD9A0] to-[#FFEFD8] sm:-right-10"
            />
            <Arc className="-right-24 top-6 hidden h-[28rem] w-[28rem] sm:block" opacity={0.45} />
            <div className="relative aspect-[1.18] overflow-hidden rounded-[2rem] shadow-lift-lg ring-1 ring-white/70">
              <ResponsiveImage
                image={photo.image}
                priority
                sizes="(min-width: 1024px) 540px, 92vw"
                style={{ objectPosition: photo.position }}
              />
            </div>

            {pay ? (
              <div className="absolute -bottom-6 left-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lift-lg ring-1 ring-cream-300/60 sm:-left-8">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#FFEBCF] to-[#FFE0B2] text-brand-500"
                >
                  <Icon name="wallet" className="h-5 w-5" />
                </span>
                <span className="leading-tight">
                  <span className="block font-display text-lg font-extrabold text-navy-900">
                    {pay.amount}
                  </span>
                  <span className="block text-xs text-navy-500">
                    {pay.period}
                    {pay.note ? ` ${pay.note}` : ""}
                  </span>
                </span>
              </div>
            ) : null}
            {remote ? (
              <div className="absolute -top-12 right-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lift-lg ring-1 ring-cream-300/60 sm:-right-6 sm:-top-8 lg:-top-5">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#FFEBCF] to-[#FFE0B2] text-brand-500"
                >
                  <Icon name="home" className="h-5 w-5" />
                </span>
                <span className="leading-tight">
                  <span className="block font-display text-[15px] font-extrabold text-navy-900">
                    100% remote
                  </span>
                  <span className="block text-xs text-navy-500">Work from wherever you&apos;re based</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Body                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-cream-100 py-14 sm:py-20">
        <div className="container-page grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <div className="min-w-0 space-y-8">
            <ListCard
              icon="list"
              title="Responsibilities"
              subtitle="What you will do day to day."
              items={job.responsibilities}
              tone="amber"
            />
            <ListCard
              icon="checkCircle"
              title="Requirements"
              subtitle="What helps you succeed in this role."
              items={job.requirements}
              tone="navy"
            />

            {/* What we offer */}
            <div className={CARD}>
              <CardHeading icon="gift" title="What we offer" subtitle="The same for every role at WorkRoute." />
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {offers.map(({ title, icon, benefit }) => (
                  <li
                    key={title}
                    className="flex gap-3 rounded-2xl bg-[#FFFAF3] p-4 ring-1 ring-inset ring-[#F6E7D2]"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFEBCF] to-[#FFE0B2] text-brand-500"
                    >
                      <Icon name={icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[15px] font-extrabold text-navy-900">
                        {benefit!.title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-navy-500">
                        {benefit!.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* How hiring works */}
            <div className={CARD}>
              <CardHeading
                icon="fileCheck"
                title="How hiring works"
                subtitle="What to expect after you apply. The process can vary by position."
              />
              <ol className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                {recruitmentProcess.map((step, i) => (
                  <li key={step.title} className="flex gap-3.5">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-extrabold text-navy-900 shadow-amber"
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="sr-only">Step {i + 1}: </span>
                      <span className="block font-display text-[15px] font-extrabold leading-snug text-navy-900">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-navy-500">
                        {step.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Closing call to action */}
            <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-navy-900 p-7 sm:p-10">
              <span
                aria-hidden="true"
                className="absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(245,166,35,0.35),transparent)]"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 600 240"
                preserveAspectRatio="none"
                fill="none"
                className="absolute inset-0 -z-10 h-full w-full"
              >
                <path d="M420 250c40-90 110-160 200-190" stroke="#F5A623" strokeOpacity="0.45" strokeWidth="1.5" />
              </svg>
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-white sm:text-[1.875rem]">
                    Ready to apply?
                  </h2>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed text-navy-200">
                    The position will be pre-selected for you in the application form. A CV is
                    optional.
                  </p>
                </div>
                <PrimaryButton href={applyHref} className="w-full shrink-0 !min-h-[54px] md:w-auto md:px-8">
                  Apply for This Position
                </PrimaryButton>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className={`${CARD} !p-6`}>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-navy-500">At a glance</h2>

              {/* Shown as well as marked up: Google expects structured data
                  to reflect what a visitor can actually read on the page. */}
              {job.salary && pay ? (
                <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#FFF5E6] to-[#FFEBCF] p-4 ring-1 ring-inset ring-brand-200/70">
                  <p className="text-xs font-semibold text-navy-500">Pay</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.02em] text-brand-800">
                      {pay.amount}
                    </span>
                    <span className="text-sm font-semibold text-navy-600">{pay.period}</span>
                  </p>
                  {pay.note ? (
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-wide text-green-700">{pay.note}</p>
                  ) : null}
                  {job.salary.detail ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-navy-600">{job.salary.detail}</p>
                  ) : null}
                </div>
              ) : null}

              <dl className="mt-5 space-y-4">
                <Fact icon="mapPinLine" label="Work arrangement">
                  {job.workArrangement}
                </Fact>
                <Fact icon="briefcaseLine" label="Employment type">
                  {employmentLabels[job.employmentType]}
                </Fact>
                <Fact icon="chartBar" label="Experience level">
                  {job.experienceLevel}
                </Fact>
                <Fact icon="chatsLine" label="Required languages">
                  {job.languages}
                </Fact>
                <Fact icon="calendar" label="Posted">
                  {formatDate(job.datePosted)}
                </Fact>
              </dl>

              <PrimaryButton href={applyHref} className="mt-6 w-full !min-h-[52px]">
                Apply now
              </PrimaryButton>
            </div>

            {others.length ? (
              <div className={`${CARD} !p-6`}>
                <h2 className="font-display text-lg font-extrabold tracking-[-0.015em] text-navy-900">
                  Other open positions
                </h2>
                <ul className="mt-4 space-y-2">
                  {others.map((o) => (
                    <li key={o.slug}>
                      <OtherJob job={o} />
                    </li>
                  ))}
                </ul>
                <Link
                  href="/jobs"
                  className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-brand-700 transition hover:text-brand-800"
                >
                  View all positions
                  <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}

const CARD =
  "rounded-[1.75rem] bg-white p-6 shadow-[0_1px_3px_rgba(15,16,53,0.04),0_22px_50px_-30px_rgba(15,16,53,0.22)] ring-1 ring-cream-300/50 sm:p-8";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Chip({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2 text-sm font-semibold text-navy-700 shadow-soft ring-1 ring-cream-300/70">
      <Icon name={icon} className="h-4 w-4 text-navy-500" />
      {children}
    </li>
  );
}

function CardHeading({ icon, title, subtitle }: { icon: IconName; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF3E0] to-[#FFE6C4] text-brand-500"
      >
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-navy-900 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ListCard({
  icon,
  title,
  subtitle,
  items,
  tone,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  items: string[];
  tone: "amber" | "navy";
}) {
  return (
    <div className={CARD}>
      <CardHeading icon={icon} title={title} subtitle={subtitle} />
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-2xl bg-[#FFFAF3] px-4 py-3.5 ring-1 ring-inset ring-[#F6E7D2]"
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                tone === "amber" ? "bg-brand-500 text-navy-900" : "bg-navy-900 text-brand-400"
              }`}
            >
              <Icon name="checkThick" className="h-3.5 w-3.5" />
            </span>
            <span className="text-[15px] leading-snug text-navy-700">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One label and value in the facts list. The icon sits inside the <dt> and
 * is positioned beside both, because a <dl> group may hold only <dt> and <dd>
 * — a wrapper around them for the layout made the list unreadable to screen
 * readers.
 */
function Fact({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-[2.25rem] pl-12">
      <dt className="text-xs font-semibold text-navy-500">
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF1DC] text-brand-500"
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 text-sm font-medium leading-snug text-navy-900">{children}</dd>
    </div>
  );
}

function OtherJob({ job }: { job: JobPosting }) {
  const pay = job.salary ? salaryParts(job.salary) : null;
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-cream-100"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFF3E0] to-[#FFEBD0] text-brand-500 transition group-hover:from-brand-400 group-hover:to-brand-500 group-hover:text-white"
      >
        <Icon name={jobIcon(job.slug)} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-snug text-navy-900">{job.title}</span>
        {pay ? (
          <span className="block text-xs font-semibold text-brand-700">
            {pay.amount}
            {pay.period.replace(/^per /, "/")}
          </span>
        ) : null}
      </span>
      <Icon
        name="chevronRight"
        className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-600"
      />
    </Link>
  );
}
