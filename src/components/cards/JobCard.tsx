import Link from "next/link";
import type { JobPosting } from "@/config/jobs";
import { Icon } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";

export function JobCard({ job }: { job: JobPosting }) {
  return (
    <article className="card flex h-full flex-col transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon name="headset" className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-semibold text-navy-900">{job.title}</h3>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-navy-600">{job.shortDescription}</p>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="font-medium text-navy-500">Work:</dt>
          <dd className="text-navy-700">{job.workArrangement}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-navy-500">Level:</dt>
          <dd className="text-navy-700">{job.experienceLevel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-navy-500">Languages:</dt>
          <dd className="text-navy-700">{job.languages}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-2 pt-2 sm:flex-row">
        <Link href={`/jobs/${job.slug}`} className="btn-secondary flex-1">
          View Details
        </Link>
        <ApplyButton
          position={job.title}
          label="Apply for This Position"
          className="flex-1"
          withIcon={false}
        />
      </div>
    </article>
  );
}
