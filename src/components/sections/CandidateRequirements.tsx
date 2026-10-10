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
 * The photo sits in a slanted frame on a navy shape with amber arcs, and the
 * three qualities from the intro float on its lower edge. The requirements
 * run two to a row with the application button in the last cell, as in the
 * approved design; on a phone they stack and the button runs the full width.
 */
export function CandidateRequirements() {
  return (
    <section
      id="who-we-are-looking-for"
      aria-labelledby="looking-title"
      className="section-pad relative isolate overflow-hidden bg-navy-900"
    >
      <span
        aria-hidden="true"
        className="absolute -right-40 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(245,166,35,0.10),transparent)]"
      />

      <div className="container-page grid items-center gap-14 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-14 xl:gap-20">
        {/* Photo on its navy shape, with the three qualities beside it */}
        <Reveal className="relative mx-auto w-full max-w-md pb-14 sm:max-w-lg lg:max-w-none lg:pb-0">
          <span
            aria-hidden="true"
            className="absolute -left-8 -top-10 h-[108%] w-[112%] rounded-[46%_54%_40%_60%/52%_40%_60%_48%] bg-[#1C1D52] sm:-left-12"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 400 460"
            fill="none"
            className="absolute -left-8 top-0 hidden h-full w-[115%] sm:block"
          >
            <path d="M40 120C-10 230 0 330 70 410" stroke="#F5A623" strokeWidth="2" strokeOpacity="0.9" />
            <path d="M370 70c30 60 30 130 -5 190" stroke="#F5A623" strokeWidth="2" strokeOpacity="0.9" />
          </svg>
          <DotGrid className="-left-4 top-2 hidden sm:block" cols={4} rows={4} />

          {/* Slanted frame: the box is skewed and the photo counter-skewed,
              so its edges lean and the person stays upright. */}
          <div className="relative ml-6 mr-0 mt-6 -skew-y-6 overflow-hidden rounded-[2.5rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] sm:ml-10">
            <div className="aspect-[1.08] skew-y-6 scale-[1.14]">
              <ResponsiveImage
                image={images.lookingFor}
                sizes="(min-width: 1024px) 460px, 90vw"
                className="object-[36%_center]"
              />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)] sm:bottom-12 sm:-left-2 lg:bottom-16">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFEBCF] to-[#FFE0B2] text-brand-500 sm:h-16 sm:w-16"
            >
              <Icon name="usersGroup" className="h-7 w-7 sm:h-8 sm:w-8" />
            </span>
            <span aria-hidden="true" className="h-14 w-0.5 rounded-full bg-brand-200" />
            <ul className="space-y-1 text-[15px] font-medium leading-snug text-navy-900">
              <li>Friendly</li>
              <li>Reliable</li>
              <li>Eager to learn</li>
            </ul>
          </div>
        </Reveal>

        {/* Copy and the requirements */}
        <div>
          <SectionLabel tone="dark">Who We Are Looking For</SectionLabel>
          <h2 id="looking-title" className="h-section mt-5 text-balance !text-white lg:!text-[3.25rem]">
            Motivated people ready to deliver <Accent tone="dark">great service</Accent>
          </h2>
          <p className="mt-5 text-pretty text-[clamp(1rem,0.95rem+0.3vw,1.125rem)] leading-relaxed text-navy-200">
            Applications are welcome from both experienced candidates and motivated beginners,
            depending on the position. If you are friendly, reliable, and eager to learn, we would
            love to hear from you.
          </p>

          <ul className="mt-8 grid gap-3.5 sm:grid-cols-2 sm:gap-4">
            {candidateRequirements.map((req) => (
              <li
                key={req}
                className="flex min-h-[4.5rem] items-center gap-4 rounded-2xl bg-[#17184A] px-4 py-3.5 ring-1 ring-inset ring-white/[0.08] transition duration-300 hover:bg-[#1D1F57] hover:ring-white/15"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3A2F3A] text-brand-400"
                >
                  <Icon name="checkThick" className="h-5 w-5" />
                </span>
                <span className="text-[15px] leading-snug text-navy-100">{req}</span>
              </li>
            ))}
            <li className="flex sm:items-stretch">
              <PrimaryButton href="/apply" className="w-full !min-h-[4.5rem] !rounded-2xl !text-base">
                Start Your Application
              </PrimaryButton>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
