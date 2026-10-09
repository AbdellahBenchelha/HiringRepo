"use client";

import { useMemo, useState } from "react";
import { jobs } from "@/config/jobs";
import { JobCard } from "@/components/cards/JobCard";
import { Icon } from "@/components/Icon";
import { Accent, Arc, Glow, PrimaryButton, SectionLabel } from "@/components/ui/marketing";

const categories = [
  { label: "All roles", match: () => true },
  { label: "Customer Support", match: (slug: string) => slug.includes("customer-support") },
  { label: "Calls", match: (slug: string) => slug.includes("call-center") },
  { label: "Chat & Email", match: (slug: string) => slug.includes("live-chat") },
  { label: "Technical", match: (slug: string) => slug.includes("technical") },
  { label: "Sales", match: (slug: string) => slug.includes("sales") },
];

export function OpenPositions() {
  const [active, setActive] = useState(0);

  // Stable per-category counts for the filter chips.
  const counts = useMemo(
    () => categories.map((c) => jobs.filter((j) => c.match(j.slug)).length),
    [],
  );

  const filtered = useMemo(() => jobs.filter((job) => categories[active].match(job.slug)), [active]);

  return (
    <section
      id="open-positions"
      aria-labelledby="positions-title"
      className="section-pad relative isolate overflow-hidden bg-gradient-to-b from-[#FBFAF7] via-cream-100 to-[#FBF7F0]"
    >
      {/* Soft shapes: warm top left, a cool grey-blue top right, fine amber curves */}
      <Glow className="-left-48 -top-32 h-[30rem] w-[30rem] opacity-70" />
      <span
        aria-hidden="true"
        className="absolute -right-32 -top-24 -z-10 h-[30rem] w-[24rem] rotate-[24deg] rounded-[45%] bg-gradient-to-bl from-[#E9EDF6] to-transparent opacity-80"
      />
      <Arc className="-left-80 top-40 -z-10 hidden h-[34rem] w-[34rem] lg:block" opacity={0.3} />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Open Positions</SectionLabel>
          <h2 id="positions-title" className="h-section mt-4 text-balance">
            Find the role that <Accent>fits you</Accent>
          </h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-pretty">
            Explore our current openings across phone, chat, email, technical, and sales support.
            New opportunities open regularly.
          </p>
        </div>

        {/* Filter */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div
            role="group"
            aria-label="Filter roles by type"
            className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:max-w-full sm:flex-wrap sm:justify-center sm:px-0"
          >
            {categories.map((cat, i) => {
              const isActive = active === i;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={isActive}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                    isActive
                      ? "bg-navy-900 text-white shadow-lift"
                      : "bg-white text-navy-700 ring-1 ring-inset ring-cream-300 hover:ring-brand-300"
                  }`}
                >
                  {cat.label}
                  <span
                    className={`rounded-full px-1.5 text-xs font-bold tabular-nums ${
                      isActive ? "bg-white/15 text-white" : "bg-cream-200 text-navy-500"
                    }`}
                  >
                    {counts[i]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-sm font-medium text-navy-500" aria-live="polite">
            <span className="font-bold text-navy-900">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "role" : "roles"} shown
          </p>
        </div>

        {/* Results */}
        {/* Wrapped rather than a grid, so a last row that is not full sits in
            the middle instead of leaving a hole on the right. */}
        <ul key={active} className="mt-8 flex animate-fade-in flex-wrap justify-center gap-5 lg:gap-6">
          {filtered.map((job) => (
            <li
              key={job.slug}
              className="w-full md:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              <JobCard job={job} />
            </li>
          ))}
        </ul>

        {/* Open application */}
        <div className="relative isolate mt-8 overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFF6E9] via-[#FFF1DD] to-[#FFE7C4] p-6 ring-1 ring-inset ring-brand-200/60 sm:p-8 lg:mt-10 lg:px-10">
          <span
            aria-hidden="true"
            className="absolute -right-20 -top-28 -z-10 h-72 w-[30rem] rotate-[-12deg] rounded-[50%] bg-white/45"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 600 160"
            preserveAspectRatio="none"
            fill="none"
            className="absolute inset-y-0 right-0 -z-10 hidden h-full w-1/2 md:block"
          >
            <path d="M40 150C160 90 300 140 600 40" stroke="#F5A623" strokeOpacity="0.35" strokeWidth="1.5" />
          </svg>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5 sm:items-center">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE7C2] to-[#FFDCA6] text-brand-500 sm:h-20 sm:w-20"
              >
                <Icon name="fileAdd" className="h-8 w-8 sm:h-9 sm:w-9" />
              </span>
              <div>
                <p className="font-display text-xl font-extrabold tracking-[-0.025em] text-navy-900 sm:text-[1.75rem]">
                  Don&apos;t see the right role?
                </p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600 sm:text-[17px]">
                  Send a general application and we&apos;ll reach out when something fits your skills.
                </p>
              </div>
            </div>
            <PrimaryButton href="/apply" className="w-full shrink-0 !min-h-[56px] md:w-auto md:px-10">
              Submit your CV
            </PrimaryButton>
          </div>
        </div>
      </div>
    </section>
  );
}
