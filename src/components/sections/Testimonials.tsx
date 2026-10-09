"use client";

import { testimonials } from "@/config/content";
import { images } from "@/config/images";
import { TestimonialCard } from "@/components/cards/TestimonialCard";
import { Icon, type IconName } from "@/components/Icon";
import { CarouselButtons } from "@/components/ui/CarouselButtons";
import { useCarousel } from "@/components/ui/useCarousel";
import {
  Accent,
  DotGrid,
  ResponsiveImage,
  SectionLabel,
} from "@/components/ui/marketing";

const highlights: { icon: IconName; label: string }[] = [
  { icon: "home", label: "100% remote" },
  { icon: "graduation", label: "Paid training" },
  { icon: "chartBar", label: "Promote from within" },
];

/**
 * "Life at WorkRoute" — the team's own words.
 *
 * The photos are a mosaic of four people from the character sheet, none of
 * whom appears anywhere else on the page. The quotes slide: three at a time on
 * a wide screen, two on a tablet, one (with the next peeking in) on a phone.
 */
export function Testimonials() {
  const { ref, atStart, atEnd, grabbing, step, handlers } = useCarousel();

  return (
    <section
      id="testimonials"
      aria-labelledby="life-title"
      className="section-pad relative overflow-hidden bg-cream-100"
    >
      <span
        aria-hidden="true"
        className="absolute -right-24 -top-16 h-[28rem] w-[34rem] rounded-[48%_52%_40%_60%/55%_45%_55%_45%] bg-gradient-to-br from-brand-100/80 to-brand-50/30"
      />

      <div className="container-page relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          {/* Copy */}
          <div>
            <SectionLabel>Life at WorkRoute</SectionLabel>
            <h2 id="life-title" className="h-section mt-4 text-balance">
              What our <Accent>team says</Accent>
            </h2>
            <p className="lead mt-4 text-pretty">
              Hear directly from the people who have built their careers with us.
            </p>
            <ul className="mt-8 grid grid-cols-3 gap-3">
              {highlights.map((h) => (
                <li
                  key={h.label}
                  className="card-soft flex flex-col items-center gap-2 px-2 py-4 text-center sm:flex-row sm:px-4 sm:text-left lg:flex-col lg:px-2 lg:text-center xl:flex-row xl:px-4 xl:text-left"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500"
                  >
                    <Icon name={h.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[13px] font-bold leading-tight text-navy-900 sm:text-sm">
                    {h.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Photo mosaic */}
          <div className="relative">
            <DotGrid className="-bottom-6 -right-2 hidden sm:block" cols={8} rows={5} tone="navy" />
            <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
              {images.life.map((img, i) => (
                <div
                  key={img.src}
                  className={`overflow-hidden rounded-2xl shadow-lift ring-1 ring-white/70 ${
                    i % 2 === 1 ? "translate-y-5 sm:translate-y-8" : ""
                  }`}
                >
                  <div className="aspect-[1.55]">
                    <ResponsiveImage image={img} sizes="(min-width: 1024px) 290px, 46vw" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The quotes */}
        <div className="mt-16 sm:mt-20">
          <div className="flex items-end justify-between gap-4">
            <p className="max-w-md text-sm text-navy-600">
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
          <div
            ref={ref}
            id="reviews-track"
            role="region"
            aria-roledescription="carousel"
            aria-label="What our team says. Use the arrow keys or the buttons to move."
            tabIndex={0}
            {...handlers}
            className={`no-scrollbar -mx-4 mt-6 flex gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-1 sm:mx-0 sm:scroll-px-0 sm:px-px sm:gap-5 ${
              grabbing ? "cursor-grabbing select-none snap-none" : "cursor-grab snap-x snap-mandatory"
            }`}
          >
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
              >
                <TestimonialCard testimonial={t} index={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
