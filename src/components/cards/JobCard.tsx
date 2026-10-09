import Link from "next/link";
import { salaryParts, type JobPosting } from "@/config/jobs";
import { Icon, type IconName } from "@/components/Icon";

const employmentLabels: Record<JobPosting["employmentType"], string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  TEMPORARY: "Temporary",
};

/** An icon for the kind of work, read from the slug so a new job still gets one. */
function jobIcon(slug: string): IconName {
  if (slug.includes("call-center")) return "phone";
  if (slug.includes("chat") || slug.includes("email")) return "chat";
  if (slug.includes("technical")) return "laptop";
  if (slug.includes("sales")) return "chartBar";
  if (slug.includes("support")) return "headset";
  return "briefcase";
}

function Tag({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-2.5 py-1 text-xs font-semibold text-navy-700 ring-1 ring-inset ring-cream-300">
      <Icon name={icon} className="h-3.5 w-3.5 text-navy-400" />
      {children}
    </span>
  );
}

/**
 * One open role. Every card has the same weight — there is no featured job.
 *
 * The whole card opens the job page; "Apply now" goes straight to the form
 * with the position filled in, as before.
 */
export function JobCard({ job }: { job: JobPosting }) {
  const workShort = job.workArrangement.includes("Remote")
    ? "Remote"
    : job.workArrangement.split("·")[0].trim();
  const pay = job.salary ? salaryParts(job.salary) : null;

  return (
    <article className="card-soft card-hover group relative flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="icon-tile h-12 w-12 rounded-2xl transition duration-300 group-hover:bg-brand-500 group-hover:text-white"
        >
          <Icon name={jobIcon(job.slug)} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h3 className="h-card text-[1.0625rem] sm:text-lg">
            <Link
              href={`/jobs/${job.slug}`}
              className="transition hover:text-brand-700 focus-visible:text-brand-700 focus-visible:outline-none"
            >
              {/* Makes the whole card the link to the job page. */}
              <span className="absolute inset-0 rounded-2xl" aria-hidden="true" />
              {job.title}
            </Link>
          </h3>
          {/* Pay first when there is any: it is what candidates scan for. */}
          {pay ? (
            <p className="mt-1 font-display text-[1.1875rem] font-extrabold tracking-[-0.01em] text-brand-700">
              {pay.amount}
              <span className="ml-1 text-sm font-bold text-navy-500">{pay.period}</span>
              {pay.note ? (
                <span className="ml-1 text-xs font-semibold text-navy-500">{pay.note}</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag icon="mapPin">{workShort}</Tag>
        <Tag icon="briefcase">{employmentLabels[job.employmentType]}</Tag>
      </div>

      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-navy-600">
        {job.shortDescription}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-cream-300 pt-4">
        <Link
          href={`/apply?position=${encodeURIComponent(job.title)}`}
          className="relative z-10 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg text-sm font-bold text-navy-900 underline decoration-brand-400 decoration-2 underline-offset-4 transition hover:text-brand-800"
        >
          Apply now
        </Link>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition duration-300 group-hover:translate-x-0.5 group-hover:bg-brand-500 group-hover:text-navy-900"
        >
          <Icon name="arrowRight" className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}
