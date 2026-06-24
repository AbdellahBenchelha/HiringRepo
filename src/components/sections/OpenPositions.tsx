import { jobs } from "@/config/jobs";
import { SectionHeading } from "@/components/SectionHeading";
import { JobCard } from "@/components/cards/JobCard";
import { Reveal } from "@/components/Reveal";

export function OpenPositions() {
  return (
    <section id="open-positions" className="section bg-white">
      <div className="container-page">
        <SectionHeading
          eyebrow="Open Positions"
          title="Find the role that fits you"
          description="Explore our current openings across phone, chat, email, technical, and sales support. New opportunities open regularly."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job, i) => (
            <Reveal key={job.slug} delay={(i % 3) * 80}>
              <JobCard job={job} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
