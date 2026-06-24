import { recruitmentProcess } from "@/config/content";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";

export function RecruitmentProcess() {
  return (
    <section id="recruitment-process" className="section bg-navy-50/60">
      <div className="container-page">
        <SectionHeading
          eyebrow="Recruitment Process"
          title="A clear, supportive hiring journey"
          description="Here is what to expect after you apply. We aim to keep you informed at every step."
        />

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recruitmentProcess.map((step, i) => (
            <Reveal key={step.title} delay={(i % 3) * 80}>
              <li className="card h-full">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-semibold text-navy-900">{step.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">{step.description}</p>
              </li>
            </Reveal>
          ))}
        </ol>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-navy-500">
          Please note: only shortlisted candidates may be contacted, and the recruitment process can
          vary by position.
        </p>
      </div>
    </section>
  );
}
