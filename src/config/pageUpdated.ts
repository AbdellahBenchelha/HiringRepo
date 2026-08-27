/**
 * WHEN EACH PAGE LAST CHANGED
 * ---------------------------
 * One date per page, in one place, for two consumers that must agree:
 *
 *   - the sitemap's <lastmod>, which tells a crawler whether a page is worth
 *     re-reading;
 *   - the "Last updated" line printed at the top of every legal page.
 *
 * Keeping them separate would let a policy tell a visitor one date while
 * telling Google another — a small contradiction, but on a privacy policy it
 * is exactly the kind that gets noticed.
 *
 * Edit the date when you change a page, and leave it alone otherwise. A date
 * that moves when nothing changed is why search engines ignore lastmod on most
 * sites. Job listings are not here — each carries its own `updatedAt` in
 * src/config/jobs.ts, so editing one listing does not disturb the others.
 */
export const PAGE_UPDATED: Record<string, string> = {
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

/**
 * The date a visitor reads, e.g. "26 August 2026".
 *
 * Formatted in UTC on purpose: the stored value is a bare calendar date, and
 * letting the server's clock interpret it would print the day before for any
 * host running west of Greenwich.
 */
export function updatedLabel(path: string): string {
  const iso = PAGE_UPDATED[path];
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
