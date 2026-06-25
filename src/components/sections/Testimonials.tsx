"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { testimonials } from "@/config/content";
import { TestimonialCard } from "@/components/cards/TestimonialCard";
import { Icon } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";

export function Testimonials() {
  const [featured, ...rest] = testimonials;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [grabbing, setGrabbing] = useState(false);

  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const start = useRef({ x: 0, left: 0 });

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

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragging.current = true;
    dragMoved.current = false;
    start.current = { x: e.clientX, left: el.scrollLeft };
    setGrabbing(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - start.current.x;
    if (Math.abs(dx) > 3) dragMoved.current = true;
    el.scrollLeft = start.current.left - dx;
  };

  const endDrag = () => {
    dragging.current = false;
    setGrabbing(false);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (dragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <section id="testimonials" className="section bg-white">
      <div className="container-page">
        {/* Header */}
        <div className="max-w-2xl">
          <span className="pill uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Life at WorkRoute
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem]">
            What our team says
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
            Hear directly from the people who have built their careers with us.
          </p>
        </div>

        {/* Featured + rating panel */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TestimonialCard testimonial={featured} index={0} featured />
          </div>

          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-navy-100 bg-navy-50/50 p-8">
            <div>
              <div className="flex gap-0.5 text-amber-400" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" className="h-6 w-6" />
                ))}
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-navy-900">
                Loved by our team
              </p>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                {testimonials.length} team members have shared their experience of
                building a career at WorkRoute.
              </p>
            </div>
            <ApplyButton label="Join the team" className="w-full sm:w-auto" />
          </div>
        </div>

        {/* More reviews — manual-scroll wall */}
        <div className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
                More from the team
              </h3>
              <p className="mt-1 text-sm text-navy-500">Drag, or use the arrows, to read more</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={atStart}
                aria-label="Previous reviews"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700 shadow-soft transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-navy-200 disabled:hover:text-navy-700"
              >
                <Icon name="arrowRight" className="h-5 w-5 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={atEnd}
                aria-label="More reviews"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700 shadow-soft transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-navy-200 disabled:hover:text-navy-700"
              >
                <Icon name="arrowRight" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative mt-6 [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]">
            <div
              ref={scrollerRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onClickCapture={onClickCapture}
              className={`no-scrollbar flex gap-4 overflow-x-auto pb-3 ${
                grabbing ? "cursor-grabbing select-none" : "cursor-grab"
              }`}
              role="group"
              aria-label="Team reviews — drag or use arrows to explore"
            >
              {rest.map((t, i) => (
                <div key={t.name} className="w-[19rem] shrink-0 sm:w-[21rem]">
                  <TestimonialCard testimonial={t} index={i + 1} compact />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
