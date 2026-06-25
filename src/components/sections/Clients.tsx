"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clients } from "@/config/content";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Icon } from "@/components/Icon";

export function Clients() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section id="clients" className="section bg-navy-50/60">
      <div className="container-page">
        {/* Header + controls */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="pill uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Our Clients
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl">
              Companies we work with
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
              We power customer experience teams at {clients.length}+ international
              brands across technology, finance, retail, healthcare, and more.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-navy-500 lg:inline">
              Drag or use arrows
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={atStart}
                aria-label="Scroll to previous clients"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700 shadow-soft transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-navy-200 disabled:hover:text-navy-700"
              >
                <Icon name="arrowRight" className="h-5 w-5 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={atEnd}
                aria-label="Scroll to more clients"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700 shadow-soft transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-navy-200 disabled:hover:text-navy-700"
              >
                <Icon name="arrowRight" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Manually scrollable track */}
        <div className="relative mt-10 [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]">
          <div
            ref={scrollerRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3"
            tabIndex={0}
            role="group"
            aria-label="Client companies — scroll horizontally to explore"
          >
            {clients.map((client, i) => (
              <article
                key={client.name}
                className="group flex min-w-[16rem] snap-start flex-col justify-between gap-8 rounded-2xl border border-navy-100 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card sm:min-w-[17rem]"
              >
                <CompanyLogo name={client.name} index={i} />
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-600">
                    {client.industry}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition duration-200 group-hover:opacity-100">
                    Partner
                    <Icon name="checkCircle" className="h-3.5 w-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
