import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { jobs } from "@/config/jobs";

/**
 * lastmod has to be the date the page's content actually changed.
 *
 * It used to be `new Date()` — the moment of the build — which stamped all
 * nineteen URLs with the same fresh timestamp on every deploy, including pages
 * untouched for months. Google's documented response to a sitemap whose
 * lastmod is obviously unreliable is to ignore the field entirely, so the one
 * time it matters — telling a crawler that five job listings changed today —
 * it was already being discounted.
 *
 * These dates are therefore written down rather than computed. That means
 * editing one when you change a page, which is the cost of the field meaning
 * something. Job listings carry their own `updatedAt` and need nothing here.
 */
const PAGE_UPDATED: Record<string, string> = {
  "": "2026-06-25",
  "/about": "2026-08-12",
  "/careers": "2026-06-25",
  "/jobs": "2026-06-25",
  "/apply": "2026-08-26",
  "/contact": "2026-06-25",
  "/privacy-policy": "2026-08-26",
  "/applicant-privacy": "2026-06-25",
  "/cookie-policy": "2026-06-25",
  "/terms": "2026-06-25",
  "/legal-notice": "2026-08-22",
  "/equal-opportunity": "2026-06-25",
  "/accessibility": "2026-06-25",
  "/data-retention": "2026-06-25",
};

/** The most recent change to any listing. */
function newestJobChange(): string {
  return jobs
    .map((job) => job.updatedAt ?? job.datePosted)
    .reduce((latest, d) => (d > latest ? d : latest), "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const newestJob = newestJobChange();

  const staticEntries: MetadataRoute.Sitemap = Object.entries(PAGE_UPDATED).map(
    ([path, updated]) => ({
      url: `${base}${path}`,
      // The home page and the listings index both render the jobs, so editing
      // a listing changes them too — whichever date is later is the true one.
      lastModified: new Date(
        path === "" || path === "/jobs" ? (newestJob > updated ? newestJob : updated) : updated,
      ),
      changeFrequency: path === "" || path === "/jobs" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/jobs" || path === "/apply" ? 0.9 : 0.6,
    }),
  );

  const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${base}/jobs/${job.slug}`,
    lastModified: new Date(job.updatedAt ?? job.datePosted),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...jobEntries];
}
