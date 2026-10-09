"use client";

import { clients } from "@/config/content";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CarouselButtons } from "@/components/ui/CarouselButtons";
import { useCarousel } from "@/components/ui/useCarousel";
import { Arc, DotGrid, Glow, SectionHeading } from "@/components/ui/marketing";

/**
 * "Companies we work with" — a two-row slider of client cards.
 *
 * Five columns show on a wide screen, three on a tablet, two on a phone, so
 * no screen size is handed the whole list at once. The track snaps to whole
 * columns; swipe, drag, the arrow buttons and the arrow keys all move it.
 */
export function Clients() {
  const { ref, atStart, atEnd, grabbing, step, handlers } = useCarousel();

  return (
    <section
      id="clients"
      aria-labelledby="clients-title"
      className="section-pad relative overflow-hidden bg-gradient-to-b from-cream-100 to-[#FBF6EC]"
    >
      <Glow className="-right-48 -top-48 h-[32rem] w-[32rem]" />
      <Glow className="-bottom-64 -left-40 h-[30rem] w-[30rem] opacity-70" />
      <Arc className="-right-40 -top-56 h-[30rem] w-[30rem]" opacity={0.35} />
      <DotGrid className="bottom-10 left-6 hidden md:block" cols={9} rows={4} tone="navy" />

      <div className="container-page relative">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="clients-title"
            label="Our Clients"
            title="Companies we work with"
            intro={`We power customer experience teams at ${clients.length}+ international brands across technology, finance, retail, healthcare, and more.`}
          />
          <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
            <span className="whitespace-nowrap text-sm font-medium text-navy-500">
              <span className="hidden lg:inline">Drag to explore</span>
              <span className="lg:hidden">Swipe to explore</span>
            </span>
            <CarouselButtons
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              atStart={atStart}
              atEnd={atEnd}
              controls="clients-track"
              label="clients"
            />
          </div>
        </div>

        <div className="relative mt-10 [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
          <div
            ref={ref}
            id="clients-track"
            role="region"
            aria-roledescription="carousel"
            aria-label={`Client companies, ${clients.length} in all. Use the arrow keys or the buttons to move.`}
            tabIndex={0}
            {...handlers}
            className={`no-scrollbar grid auto-cols-[calc((100%-0.75rem)/2)] grid-flow-col grid-rows-2 gap-3 overflow-x-auto px-px pb-4 pt-1 sm:auto-cols-[calc((100%-2rem)/3)] sm:gap-4 lg:auto-cols-[calc((100%-4rem)/5)] ${
              grabbing ? "cursor-grabbing select-none snap-none" : "cursor-grab snap-x snap-mandatory"
            }`}
          >
            {clients.map((client, i) => (
              <article
                key={client.name}
                className="card-soft group flex min-w-0 snap-start items-center px-3 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift-lg sm:px-4 sm:py-4"
              >
                <CompanyLogo name={client.name} industry={client.industry} index={i} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
