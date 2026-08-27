import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { jobs } from "@/config/jobs";
import { PAGE_UPDATED } from "@/config/pageUpdated";

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
