"use client";

import { testimonials } from "@/config/content";
import { images } from "@/config/images";
import { TestimonialCard } from "@/components/cards/TestimonialCard";
import { Icon, type IconName } from "@/components/Icon";
import { CarouselButtons } from "@/components/ui/CarouselButtons";
import { useCarousel } from "@/components/ui/useCarousel";
import { Accent, DotGrid, ResponsiveImage, SectionLabel } from "@/components/ui/marketing";

/** What life here is like, in the words the rest of the site already uses. */
const highlights: { icon: IconName; title: string; text: string }[] = [
  { icon: "home", title: "100% remote", text: "Work from wherever you're based." },
  { icon: "usersGroup", title: "Paid training", text: "Paid onboarding and ongoing training." },
  { icon: "chartBar", title: "Promote from within", text: "Many of our leaders started on the front line." },
];

/**
 * "Life at WorkRoute" — one team photo and the team's own words.
 *
 * On a wide screen the quotes run in a row beneath the copy and rest on the
 * bottom edge of the photo, as in the approved design: the photo spans both
 * grid rows, so it reaches down behind the quotes exactly as far as it is
 * taller than the copy. Three quotes show at a time and the rest slide in;
 * two on a tablet, one on a phone.
 */
export function Testimonials() {
  const { ref, atStart, atEnd, grabbing, step, handlers } = useCarousel();

  return (
    <section
      id="testimonials"
      aria-labelledby="life-title"
      className="section-pad relative isolate overflow-hidden bg-[#FBFAF6]"
    >
      <DotGrid className="bottom-24 right-6 hidden xl:block" cols={7} rows={6} />

      <div className="container-page relative">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-0">
          {/* Copy */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <SectionLabel>Life at WorkRoute</SectionLabel>
            <h2 id="life-title" className="h-section mt-5 text-balance lg:!text-[3.25rem]">
              What our <Accent>team says</Accent>
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-[clamp(1.0625rem,0.98rem+0.45vw,1.3125rem)] leading-relaxed text-navy-500">
              Hear directly from the people who have built their careers with us.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map((h) => (
                <li
                  key={h.title}
                  className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,16,53,0.04),0_14px_34px_-22px_rgba(15,16,53,0.18)] ring-1 ring-cream-300/50 sm:flex-col xl:flex-row"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFF1DC] to-[#FFE8C7] text-brand-500"
                  >
                    <Icon name={h.icon} className="h-[22px] w-[22px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-extrabold leading-snug text-navy-900">
                      {h.title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-navy-500">{h.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* The team photo, on a warm shape */}
          <div className="relative mx-auto w-full max-w-xl lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none lg:self-start">
            <span
              aria-hidden="true"
              className="absolute -right-6 -top-8 h-[75%] w-[70%] rounded-[46%_54%_42%_58%/52%_44%_56%_48%] bg-gradient-to-bl from-[#FFE3B8] to-[#FFF1DC] sm:-right-10"
            />
            <span
              aria-hidden="true"
              className="absolute -left-10 top-1/3 hidden h-1/2 w-1/3 rounded-[50%] bg-gradient-to-tr from-[#FFEFD6] to-transparent lg:block"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 60 300"
              fill="none"
              className="absolute -right-10 top-1/4 hidden h-1/2 w-10 sm:block"
            >
              <path d="M5 5c55 60 60 220 0 290" stroke="#F5A623" strokeOpacity="0.5" strokeWidth="1.5" />
            </svg>
            <div className="relative aspect-[1.28] overflow-hidden rounded-[2rem] shadow-lift-lg lg:aspect-[1.12]">
              <ResponsiveImage
                image={images.lifeTeam}
                sizes="(min-width: 1024px) 580px, 92vw"
                className="object-[62%_center]"
              />
            </div>
          </div>

          {/* The quotes, resting on the photo's lower edge on a wide screen.
              Placed explicitly from column 1: auto-placement would refuse the
              cell the photo already covers and open new columns instead. */}
          <div className="relative z-10 min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:pt-10">
            <div
              ref={ref}
              id="reviews-track"
              role="region"
              aria-roledescription="carousel"
              aria-label="What our team says. Use the arrow keys or the buttons to move."
              tabIndex={0}
              {...handlers}
              className={`no-scrollbar -mx-4 flex gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-1 sm:mx-0 sm:scroll-px-0 sm:px-px sm:gap-5 lg:gap-6 ${
                grabbing ? "cursor-grabbing select-none snap-none" : "cursor-grab snap-x snap-mandatory"
              }`}
            >
              {testimonials.map((t, i) => (
                <div
                  key={t.name}
                  className="w-[86%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)]"
                >
                  <TestimonialCard testimonial={t} index={i} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-navy-500">
                {testimonials.length} team members have shared their experience of building a career
                at WorkRoute.
              </p>
              <CarouselButtons
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                atStart={atStart}
                atEnd={atEnd}
                controls="reviews-track"
                label="reviews"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
