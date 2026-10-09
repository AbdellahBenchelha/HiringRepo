"use client";

import { useMemo, useState } from "react";
import { jobs } from "@/config/jobs";
import { JobCard } from "@/components/cards/JobCard";
import { Icon } from "@/components/Icon";
import { Accent, Glow, PrimaryButton, SectionLabel } from "@/components/ui/marketing";

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
      className="section-pad relative overflow-hidden bg-gradient-to-b from-cream-100 via-white/40 to-cream-100"
    >
      <Glow className="-right-40 -top-24 h-[28rem] w-[28rem] opacity-70" />

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
        <ul key={active} className="mt-8 grid animate-fade-in gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <li key={job.slug}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>

        {/* Open application */}
        <div className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-50 via-[#FFF4DC] to-brand-100/80 p-5 ring-1 ring-inset ring-brand-200/70 sm:p-7">
          <span
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-200/40 blur-2xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-lift sm:h-14 sm:w-14"
              >
                <Icon name="fileEdit" className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <div>
                <p className="font-display text-lg font-extrabold tracking-[-0.02em] text-navy-900 sm:text-xl">
                  Don&apos;t see the right role?
                </p>
                <p className="mt-1 text-sm text-navy-600 sm:text-[15px]">
                  Send a general application and we&apos;ll reach out when something fits your skills.
                </p>
              </div>
            </div>
            <PrimaryButton href="/apply" className="w-full shrink-0 sm:w-auto sm:px-8">
              Submit your CV
            </PrimaryButton>
          </div>
        </div>
      </div>
    </section>
  );
}
