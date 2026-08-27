import Link from "next/link";
import { salaryParts, type JobPosting } from "@/config/jobs";
import { siteConfig } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";

const employmentLabels: Record<JobPosting["employmentType"], string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  TEMPORARY: "Temporary",
};

function Tag({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-2.5 py-1 text-xs font-medium text-navy-700">
      <Icon name={icon} className="h-3.5 w-3.5 text-brand-500" />
      {children}
    </span>
  );
}

export function JobCard({ job }: { job: JobPosting }) {
  const workShort = job.workArrangement.includes("Remote")
    ? "Remote"
    : job.workArrangement.split("·")[0].trim();

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-cream-300 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow">
          <Icon name="headset" className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug text-navy-900">
            <Link
              href={`/jobs/${job.slug}`}
              className="transition hover:text-brand-700 focus-visible:text-brand-700"
            >
              <span className="absolute inset-0" aria-hidden="true" />
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-navy-500">{siteConfig.company.name}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-navy-600">
        {job.shortDescription}
      </p>

      {/* Absorbs the slack so pay, tags and buttons line up across a row.
          A grid of cards is scanned horizontally, and a figure sitting at a
          different height in each card defeats the point of enlarging it.
          A spacer rather than flex-1 on the paragraph above: growing a
          line-clamped box reveals the lines it had already cut, ellipsis and
          all. */}
      <div aria-hidden="true" className="flex-1" />

      {/* Pay, on its own line and at its own size.
          It is the first thing a candidate looks for, so it is not a tag
          competing with "Remote" — the figure is the largest thing here and
          the period beside it is deliberately quieter. */}
      {job.salary ? (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-cream-300 pt-4">
          <span className="text-xl font-bold tracking-tight text-navy-900">
            {salaryParts(job.salary).amount}
          </span>
          <span className="text-sm font-medium text-navy-500">
            {salaryParts(job.salary).period}
          </span>
          {salaryParts(job.salary).note ? (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-green-700">
              {salaryParts(job.salary).note}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag icon="globe">{workShort}</Tag>
        <Tag icon="clock">{employmentLabels[job.employmentType]}</Tag>
        <Tag icon="trendingUp">{job.experienceLevel.replace(" to ", " – ")}</Tag>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-cream-300 pt-5">
        <ApplyButton
          position={job.title}
          label="Apply now"
          className="relative z-10 flex-1"
          withIcon={false}
        />
        <Link
          href={`/jobs/${job.slug}`}
          className="relative z-10 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
        >
          Details
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
