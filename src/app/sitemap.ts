import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { jobs } from "@/config/jobs";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const staticPaths = [
    "",
    "/about",
    "/careers",
    "/jobs",
    "/apply",
    "/contact",
    "/privacy-policy",
    "/applicant-privacy",
    "/cookie-policy",
    "/terms",
    "/legal-notice",
    "/equal-opportunity",
    "/accessibility",
    "/data-retention",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/jobs" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/jobs" || path === "/apply" ? 0.9 : 0.6,
  }));

  const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${base}/jobs/${job.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...jobEntries];
}
