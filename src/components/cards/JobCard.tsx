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
  if (slug.includes("call-center")) return "phoneLine";
  if (slug.includes("chat") || slug.includes("email")) return "chatsLine";
  if (slug.includes("technical")) return "laptopLine";
  if (slug.includes("sales")) return "chartBar";
  if (slug.includes("support")) return "headsetLine";
  return "briefcaseLine";
}

function Tag({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-3 py-1.5 text-[13px] font-medium text-navy-700 ring-1 ring-inset ring-cream-300/80">
      <Icon name={icon} className="h-4 w-4 text-navy-600" />
      {children}
    </span>
  );
}

/**
 * One open role. Every card has the same weight — there is no featured job.
 *
 * The whole card opens the job page, which has the Apply button with the
 * position filled in.
 */
export function JobCard({ job }: { job: JobPosting }) {
  const workShort = job.workArrangement.includes("Remote")
    ? "Remote"
    : job.workArrangement.split("·")[0].trim();
  const pay = job.salary ? salaryParts(job.salary) : null;

  return (
    <article className="group relative flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,16,53,0.04),0_18px_44px_-26px_rgba(15,16,53,0.2)] ring-1 ring-cream-300/50 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(15,16,53,0.05),0_30px_60px_-28px_rgba(15,16,53,0.28)] hover:ring-brand-200/80 sm:p-6">
      <div className="flex items-start gap-4 sm:gap-5">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF3E0] to-[#FFEBD0] text-brand-500 transition duration-300 group-hover:from-brand-400 group-hover:to-brand-500 group-hover:text-white sm:h-[4.5rem] sm:w-[4.5rem]"
        >
          <Icon name={jobIcon(job.slug)} className="h-8 w-8 sm:h-9 sm:w-9" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="font-display text-lg font-extrabold leading-snug tracking-[-0.015em] text-navy-900 sm:text-xl">
            <Link
              href={`/jobs/${job.slug}`}
              className="transition group-hover:text-navy-800 focus-visible:outline-none"
            >
              {/* Makes the whole card the link to the job page. */}
              <span className="absolute inset-0 rounded-2xl" aria-hidden="true" />
              {job.title}
            </Link>
          </h3>
          {/* Pay first when there is any: it is what candidates scan for. */}
          {pay ? (
            <p className="mt-1.5 font-display text-[1.1875rem] font-extrabold tracking-[-0.01em] text-brand-700">
              {pay.amount}
              {pay.period.replace(/^per /, "/")}
              {pay.note ? (
                <span className="ml-1.5 text-xs font-semibold text-navy-500">{pay.note}</span>
              ) : null}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Tag icon="mapPinLine">{workShort}</Tag>
            <Tag icon="briefcaseLine">{employmentLabels[job.employmentType]}</Tag>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-1 items-end gap-4">
        <p className="flex-1 text-[15px] leading-relaxed text-navy-500">
          {job.shortDescription}
        </p>
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFEFD8] text-brand-600 transition duration-300 group-hover:translate-x-0.5 group-hover:bg-brand-500 group-hover:text-navy-900"
        >
          <Icon name="arrowRight" className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}
