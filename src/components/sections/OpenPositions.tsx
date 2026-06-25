"use client";

import { useMemo, useState } from "react";
import { jobs } from "@/config/jobs";
import { JobCard } from "@/components/cards/JobCard";
import { Icon } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";

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
    []
  );

  const filtered = useMemo(
    () => jobs.filter((job) => categories[active].match(job.slug)),
    [active]
  );

  return (
    <section id="open-positions" className="section bg-white">
      <div className="container-page">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="pill uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Open Positions
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem]">
              Find the role that fits you
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
              Explore our current openings across phone, chat, email, technical,
              and sales support. New opportunities open regularly.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-navy-100 bg-navy-50/60 px-5 py-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft ring-1 ring-inset ring-navy-100">
              <Icon name="briefcase" className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-2xl font-bold tabular-nums text-navy-900">{jobs.length}</p>
              <p className="text-xs font-medium text-navy-500">open roles right now</p>
            </div>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="sticky top-20 z-20 mt-10">
          <div className="flex flex-col gap-3 rounded-2xl border border-navy-100 bg-white/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              <span className="hidden shrink-0 px-2 text-xs font-semibold uppercase tracking-wider text-navy-400 sm:inline">
                Filter
              </span>
              {categories.map((cat, i) => {
                const isActive = active === i;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={isActive}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-brand-600 text-white shadow-soft"
                        : "bg-navy-50 text-navy-700 hover:bg-navy-100"
                    }`}
                  >
                    {cat.label}
                    <span
                      className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-navy-400"
                      }`}
                    >
                      {counts[i]}
                    </span>
                  </button>
                );
              })}
            </div>

            <p
              className="shrink-0 px-2 text-sm font-medium text-navy-500"
              aria-live="polite"
            >
              <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "role" : "roles"} shown
            </p>
          </div>
        </div>

        {/* Results */}
        <div
          key={active}
          className="mt-8 grid animate-fade-in gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((job) => (
            <JobCard key={job.slug} job={job} />
          ))}
        </div>

        {/* Open application CTA */}
        <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl border border-navy-100 bg-navy-50/50 px-6 py-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft ring-1 ring-inset ring-navy-100">
              <Icon name="sparkles" className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold text-navy-900">Don&apos;t see the right role?</p>
              <p className="mt-0.5 text-sm text-navy-600">
                Send a general application and we&apos;ll reach out when something
                fits your skills.
              </p>
            </div>
          </div>
          <ApplyButton label="Submit your CV" className="shrink-0" />
        </div>
      </div>
    </section>
  );
}
