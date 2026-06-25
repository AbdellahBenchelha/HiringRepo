"use client";

import { useMemo, useState } from "react";
import { jobs } from "@/config/jobs";
import { SectionHeading } from "@/components/SectionHeading";
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
    <section id="open-positions" className="section bg-navy-50/50">
      <div className="container-page">
        <SectionHeading
          eyebrow="Open Positions"
          title="Find the role that fits you"
          description="Explore our current openings across phone, chat, email, technical, and sales support. New opportunities open regularly."
        />

        {/* Search + filters */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="relative">
            <Icon
              name="chat"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles, skills, or keywords…"
              aria-label="Search open positions"
              className="w-full rounded-full border border-navy-200 bg-white py-3.5 pl-12 pr-4 text-navy-900 shadow-soft transition placeholder:text-navy-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {categories.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active === i
                    ? "bg-brand-600 text-white shadow-soft"
                    : "border border-navy-200 bg-white text-navy-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-sm font-medium text-navy-500" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "role" : "roles"} available
        </p>

        {filtered.length > 0 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job) => (
              <JobCard key={job.slug} job={job} />
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center">
            <p className="font-semibold text-navy-900">No roles match your search</p>
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
