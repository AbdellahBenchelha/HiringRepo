import Link from "next/link";
import type { JobPosting } from "@/config/jobs";
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700">
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
    <article className="group relative flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag icon="globe">{workShort}</Tag>
        <Tag icon="clock">{employmentLabels[job.employmentType]}</Tag>
        <Tag icon="trendingUp">{job.experienceLevel.replace(" to ", " – ")}</Tag>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-navy-100 pt-5">
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
