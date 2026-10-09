import Link from "next/link";
import { faqs } from "@/config/content";
import { images } from "@/config/images";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Icon } from "@/components/Icon";
import {
  Accent,
  DotGrid,
  PEACH_BG,
  PeachBackdrop,
  ResponsiveImage,
  SectionLabel,
} from "@/components/ui/marketing";

/**
 * Frequently asked questions.
 *
 * A warmer, peach-washed section, so it reads as its own part of the page
 * between the cream sections around it — with soft lighter shapes and fine
 * amber arcs, as in the approved design. The photo sits in a slanted frame on
 * a peach shape, and the way to a person rests on its lower edge.
 */
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className={`section-pad relative isolate overflow-hidden ${PEACH_BG}`}
    >
      <PeachBackdrop />
      <DotGrid className="left-10 top-32 hidden lg:block" cols={3} rows={4} />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>FAQ</SectionLabel>
          <h2 id="faq-title" className="h-section mt-5 text-balance lg:!text-[3.25rem]">
            Frequently asked <Accent>questions</Accent>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[clamp(1rem,0.95rem+0.3vw,1.125rem)] leading-relaxed text-navy-600">
            Answers to the questions candidates ask us most often. Can&apos;t find what you need?
            We&apos;re happy to help.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
          {/* Photo in a slanted frame, and the way to a person */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative pb-36 lg:sticky lg:top-28">
              {/* The shapes behind the photo */}
              <span
                aria-hidden="true"
                className="absolute -left-6 top-10 h-[78%] w-[96%] rounded-[48%_52%_40%_60%/56%_42%_58%_44%] bg-gradient-to-br from-[#FFE2B5] to-[#FFF0DA]"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 400 420"
                fill="none"
                className="absolute -left-8 -top-4 h-[95%] w-[112%]"
              >
                <path
                  d="M60 30C-10 120 -10 300 90 390M360 120c40 70 40 170 -10 230"
                  stroke="#F5A623"
                  strokeOpacity="0.6"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Slanted frame: the box is skewed and the photo counter-skewed,
                  so its edges lean and the person stays upright. */}
              <div className="relative ml-2 mr-4 mt-8 -skew-y-3 overflow-hidden rounded-[2.25rem] shadow-lift-lg sm:ml-6">
                <div className="aspect-[1.42] skew-y-3 scale-[1.08]">
                  <ResponsiveImage
                    image={images.faq}
                    sizes="(min-width: 1024px) 480px, 92vw"
                    className="object-[42%_30%]"
                  />
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 rounded-[1.75rem] bg-gradient-to-br from-[#FFFAF3] to-white p-5 shadow-[0_24px_60px_-24px_rgba(15,16,53,0.28)] ring-1 ring-white sm:inset-x-4 sm:p-7 lg:-right-2">
                <div className="flex items-start gap-4 sm:gap-5">
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFEBCC] to-[#FFE0B0] text-brand-500 sm:h-[4.5rem] sm:w-[4.5rem]"
                  >
                    <Icon name="headsetLine" className="h-7 w-7 sm:h-9 sm:w-9" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-extrabold tracking-[-0.025em] text-navy-900 sm:text-2xl">
                      Still have questions?
                    </p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600 sm:text-base">
                      Our recruitment team will get back to you as soon as possible.
                    </p>
                  </div>
                </div>
                <Link href="/#contact" className="btn-brand group mt-5 w-full !min-h-[52px] sm:ml-[5.75rem] sm:w-[calc(100%-5.75rem)]">
                  Contact Us
                  <Icon
                    name="arrowRight"
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* The questions */}
          <div>
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </div>
    </section>
  );
}
