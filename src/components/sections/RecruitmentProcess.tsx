import { recruitmentProcess } from "@/config/content";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { Accent, DotGrid, Glow, PrimaryButton, SectionLabel } from "@/components/ui/marketing";

/** In the order of recruitmentProcess. */
const stepIcons: IconName[] = ["fileEdit", "fileSearch", "monitorUser", "microphone", "users", "fileCheck"];

/**
 * The hiring journey.
 *
 * Six steps across on a wide screen with a small connector between each, as
 * in the approved design; three to a row on a tablet; and on a phone a
 * vertical timeline, which is how a sequence reads when there is no width for
 * one.
 */
export function RecruitmentProcess() {
  return (
    <section
      id="recruitment-process"
      aria-labelledby="process-title"
      className="section-pad relative overflow-hidden bg-gradient-to-b from-cream-100 to-[#FBF6EC]"
    >
      <Glow className="-left-48 top-24 h-[34rem] w-[34rem]" />
      <Glow className="-right-48 bottom-0 h-[30rem] w-[30rem] opacity-70" />
      <DotGrid className="left-8 top-24 hidden lg:block" cols={4} rows={4} />
      <DotGrid className="bottom-12 right-8 hidden lg:block" cols={4} rows={3} />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Recruitment Process</SectionLabel>
          <h2 id="process-title" className="h-section mt-4 text-balance">
            A clear, supportive <Accent>hiring journey</Accent>
          </h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-pretty">
            Here is what to expect after you apply. We keep you informed at every step along the
            way.
          </p>
        </div>

        <ol className="mt-12 grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-6 xl:gap-6">
          {recruitmentProcess.map((step, i) => (
            <li key={step.title} className="relative">
              <Reveal delay={(i % 3) * 80} className="h-full">
                <ProcessStep
                  number={i + 1}
                  icon={stepIcons[i % stepIcons.length]}
                  title={step.title}
                  description={step.description}
                  last={i === recruitmentProcess.length - 1}
                />
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <PrimaryButton href="/apply" className="w-full sm:w-auto sm:px-10">
            Start your application
          </PrimaryButton>
          <p className="flex max-w-xl items-start gap-2 text-left text-sm text-navy-600 sm:items-center">
            <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 sm:mt-0" />
            <span>
              <strong className="font-semibold text-navy-900">Good to know:</strong> only
              shortlisted candidates may be contacted, and the process can vary by position.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function ProcessStep({
  number,
  icon,
  title,
  description,
  last,
}: {
  number: number;
  icon: IconName;
  title: string;
  description: string;
  last: boolean;
}) {
  return (
    <div className="flex h-full gap-4 sm:block">
      {/* Phone: the timeline rail */}
      <div aria-hidden="true" className="flex flex-col items-center sm:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-extrabold text-navy-900 shadow-amber">
          {number}
        </span>
        {!last ? <span className="mt-2 w-0.5 flex-1 rounded-full bg-gradient-to-b from-brand-300 to-brand-100" /> : null}
      </div>

      <article className="card-soft card-hover relative mb-4 flex-1 p-5 sm:mb-0 sm:h-full sm:text-center xl:px-4">
        <span className="sr-only">Step {number}: </span>
        <span
          aria-hidden="true"
          className="absolute left-4 top-4 hidden h-7 w-7 items-center justify-center rounded-full bg-brand-100 font-display text-xs font-extrabold text-brand-800 sm:flex"
        >
          {number}
        </span>
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 ring-8 ring-brand-50/40 sm:mx-auto sm:mt-3 sm:h-16 sm:w-16"
        >
          <Icon name={icon} className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <h3 className="h-card mt-4 !text-base">{title}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-navy-600">{description}</p>
      </article>

      {/* Wide screen: the connector to the next step */}
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute -right-[25px] top-[4.75rem] z-10 hidden items-center xl:flex"
        >
          <span className="h-px w-2 bg-brand-300" />
          <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-400 bg-cream-100" />
          <span className="h-px w-2 bg-brand-300" />
        </span>
      ) : null}
    </div>
  );
}
