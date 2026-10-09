import { Icon, type IconName } from "@/components/Icon";
import {
  Accent,
  DotGrid,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
} from "@/components/ui/marketing";

const highlights: { icon: IconName; label: string }[] = [
  { icon: "home", label: "100% remote" },
  { icon: "graduation", label: "Paid training" },
  { icon: "chartBar", label: "Promote from within" },
];

/** The closing call to action: compact, navy, no photo. */
export function CtaBand() {
  return (
    <section
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden bg-navy-900 py-16 sm:py-20"
    >
      {/* Navy shapes in two corners and amber lines through them */}
      <span
        aria-hidden="true"
        className="absolute -bottom-24 -left-20 -z-10 h-72 w-96 rotate-[-18deg] rounded-[3rem] bg-navy-800/70"
      />
      <span
        aria-hidden="true"
        className="absolute -right-16 -top-20 -z-10 h-64 w-80 rotate-[-18deg] rounded-[3rem] bg-navy-800/70"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 360"
        preserveAspectRatio="none"
        fill="none"
        className="absolute inset-0 -z-10 h-full w-full"
      >
        <path d="M-20 120c90 30 150 120 130 250" stroke="#F5A623" strokeOpacity="0.55" strokeWidth="1.5" />
        <path d="M1460 60c-80 40-130 140-110 280" stroke="#F5A623" strokeOpacity="0.5" strokeWidth="1.5" />
      </svg>
      <DotGrid className="left-10 top-12 hidden md:block" cols={5} rows={3} tone="white" />
      <DotGrid className="bottom-12 right-10 hidden md:block" cols={5} rows={3} tone="white" />

      <div className="container-page text-center">
        <SectionLabel tone="dark">Join Our Team</SectionLabel>
        <h2 id="cta-title" className="h-section mx-auto mt-4 max-w-3xl text-balance !text-white">
          Ready to start your <Accent tone="dark">customer-support career?</Accent>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-navy-200 sm:text-lg">
          Apply in minutes. A CV is optional, and our team will review every application.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <PrimaryButton href="/apply" className="w-full sm:w-auto sm:px-10">
            Apply Now
          </PrimaryButton>
          <SecondaryButton href="/jobs" tone="dark" className="w-full sm:w-auto sm:px-10">
            Browse All Positions
          </SecondaryButton>
        </div>
        <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:divide-x sm:divide-white/15">
          {highlights.map((h) => (
            <li key={h.label} className="flex items-center gap-2.5 sm:pl-6 sm:first:pl-0">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-brand-400 ring-1 ring-inset ring-white/10"
              >
                <Icon name={h.icon} className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-navy-100">{h.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
