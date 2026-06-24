import { jobs } from "@/config/jobs";
import { buildMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { JobCard } from "@/components/cards/JobCard";
import { RecruitmentProcess } from "@/components/sections/RecruitmentProcess";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata = buildMetadata({
  title: "Open Positions",
  description:
    "Browse all open customer-support and call-center positions at NexaCare Support Solutions and apply online today.",
  path: "/jobs",
});

export default function JobsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Open Positions"
        title="Explore our open positions"
        description="Find the role that fits your skills and goals. A CV is optional — we welcome experienced candidates and motivated beginners alike."
      />
      <section className="section bg-white">
        <div className="container-page">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.slug} job={job} />
            ))}
          </div>
        </div>
      </section>
      <RecruitmentProcess />
      <CtaBand />
    </>
  );
}
