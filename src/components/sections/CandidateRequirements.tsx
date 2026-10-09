import { candidateRequirements } from "@/config/content";
import { images } from "@/config/images";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import {
  Accent,
  DotGrid,
  PrimaryButton,
  ResponsiveImage,
  SectionLabel,
} from "@/components/ui/marketing";

/**
 * "Who we are looking for" — the dark section.
 *
 * The requirements sit two to a row with the application button in the last
 * cell, as in the approved design; on a phone they stack and the button runs
 * the full width.
 */
export function CandidateRequirements() {
  return (
    <section
      id="who-we-are-looking-for"
      aria-labelledby="looking-title"
      className="section-pad relative isolate overflow-hidden bg-navy-900"
    >
      {/* Navy shapes and amber lines, all decoration */}
      <span
        aria-hidden="true"
        className="absolute -left-40 top-1/2 -z-10 h-[38rem] w-[38rem] -translate-y-1/2 rounded-[42%_58%_55%_45%/48%_40%_60%_52%] bg-navy-800/80"
      />
      <span
        aria-hidden="true"
        className="absolute -right-32 -top-40 -z-10 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgba(245,166,35,0.16),transparent)]"
      />
      <DotGrid className="left-6 top-10 hidden sm:block" cols={5} rows={4} />

      <div className="container-page grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 xl:gap-20">
        {/* Photo, with the card that names the three things we look for */}
        <Reveal className="relative mx-auto w-full max-w-md pb-10 sm:pb-6 lg:max-w-none">
          <svg
            aria-hidden="true"
            viewBox="0 0 400 400"
            fill="none"
            className="absolute -right-10 -top-10 hidden h-[115%] w-[115%] sm:block"
          >
            <path
              d="M330 40c60 70 70 190 10 270"
              stroke="#F5A623"
              strokeOpacity="0.55"
              strokeWidth="1.5"
            />
          </svg>
          <div className="relative aspect-[4/3.3] overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            <ResponsiveImage
              image={images.lookingFor}
              sizes="(min-width: 1024px) 460px, 92vw"
              className="object-[62%_center]"
            />
          </div>
          <div className="absolute bottom-0 left-4 flex items-center gap-4 rounded-2xl bg-white px-4 py-3.5 shadow-lift-lg sm:-left-6 sm:bottom-10">
            <span aria-hidden="true" className="icon-tile h-12 w-12 rounded-full">
              <Icon name="users" className="h-6 w-6" />
            </span>
            <span aria-hidden="true" className="h-10 w-px bg-cream-300" />
            <ul className="space-y-0.5 text-sm font-semibold leading-snug text-navy-900">
              <li>Friendly</li>
              <li>Reliable</li>
              <li>Eager to learn</li>
            </ul>
          </div>
        </Reveal>

        {/* Copy and the requirements */}
        <div>
          <SectionLabel tone="dark">Who We Are Looking For</SectionLabel>
          <h2 id="looking-title" className="h-section mt-4 text-balance !text-white">
            Motivated people ready to deliver <Accent tone="dark">great service</Accent>
          </h2>
          <p className="lead mt-4 text-pretty !text-navy-200">
            Applications are welcome from both experienced candidates and motivated beginners,
            depending on the position. If you are friendly, reliable, and eager to learn, we would
            love to hear from you.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {candidateRequirements.map((req) => (
              <li
                key={req}
                className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3.5 ring-1 ring-inset ring-white/10 transition duration-300 hover:bg-white/[0.08]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400"
                >
                  <Icon name="check" className="h-4 w-4" />
                </span>
                <span className="text-sm leading-snug text-navy-100">{req}</span>
              </li>
            ))}
            <li className="flex sm:items-stretch">
              <PrimaryButton href="/apply" className="w-full sm:min-h-full">
                Start your application
              </PrimaryButton>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
