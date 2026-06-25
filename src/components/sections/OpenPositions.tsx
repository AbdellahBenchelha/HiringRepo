"use client";

import { useMemo, useState } from "react";
import { jobs } from "@/config/jobs";
import { JobCard } from "@/components/cards/JobCard";
import { Icon } from "@/components/Icon";

const categories = [
  { label: "All roles", match: () => true },
  { label: "Customer Support", match: (slug: string) => slug.includes("customer-support") },
  { label: "Calls", match: (slug: string) => slug.includes("call-center") },
  { label: "Chat & Email", match: (slug: string) => slug.includes("live-chat") },
  { label: "Technical", match: (slug: string) => slug.includes("technical") },
  { label: "Sales", match: (slug: string) => slug.includes("sales") },
];

export function OpenPositions() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // Stable per-category counts for the filter chips.
  const counts = useMemo(
    () => categories.map((c) => jobs.filter((j) => c.match(j.slug)).length),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inCategory = categories[active].match;
    return jobs.filter((job) => {
      if (!inCategory(job.slug)) return false;
      if (!q) return true;
      const haystack = [
        job.title,
        job.shortDescription,
        job.languages,
        job.experienceLevel,
        ...job.responsibilities,
        ...job.requirements,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, active]);

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

        {/* Toolbar: search + filters */}
        <div className="sticky top-20 z-20 mt-10">
          <div className="rounded-2xl border border-navy-100 bg-white/95 p-3 shadow-soft backdrop-blur sm:p-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search roles, skills, or keywords…"
                  aria-label="Search open positions"
                  className="w-full rounded-xl border border-transparent bg-navy-50 py-3 pl-12 pr-4 text-navy-900 transition placeholder:text-navy-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <p
                className="shrink-0 px-1 text-sm font-medium text-navy-500 lg:px-2"
                aria-live="polite"
              >
                <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "role" : "roles"} shown
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-navy-100 pt-3">
              {categories.map((cat, i) => {
                const isActive = active === i;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
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
          </div>
        </div>

        {/* Results */}
        {filtered.length > 0 ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job) => (
              <JobCard key={job.slug} job={job} />
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-navy-400 shadow-soft ring-1 ring-inset ring-navy-100">
              <Icon name="search" className="h-5 w-5" />
            </span>
            <p className="mt-4 font-semibold text-navy-900">No roles match your search</p>
            <p className="mt-1 text-sm text-navy-600">
              Try a different keyword or category — new positions open regularly.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActive(0);
              }}
              className="btn-secondary mt-5"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
