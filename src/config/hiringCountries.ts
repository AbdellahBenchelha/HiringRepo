/**
 * Countries you accept applicants from, used by the JobPosting structured data
 * that feeds the Google Jobs listing.
 *
 * Google requires real country names here for a fully remote role — it will
 * not accept a placeholder — and it uses them to decide who sees the listing.
 * Leaving a country out hides your jobs from candidates there.
 *
 * WorkRoute recruits worldwide, so this is the same master list the
 * application form's country picker uses. Deriving it rather than keeping a
 * second copy means the two can never disagree — a country you accept
 * applications from is always a country Google shows your jobs in.
 *
 * Kept out of siteConfig on purpose: siteConfig is read by components that
 * run in the browser, and the full country list was being sent to every
 * visitor on every page for the sake of one server-rendered tag.
 */
import { countries } from "@/config/countries";

/**
 * Countries left out of the Google Jobs listing.
 *
 * Empty on purpose: WorkRoute recruits worldwide. Add a country name here —
 * spelled exactly as it appears in config/countries.ts — if one ever has to
 * come off, and it disappears from every job's structured data at once.
 *
 * The usual reason is not preference but practicality: a handful of countries
 * are under sanctions that make paying a resident there unlawful for a
 * UK-registered company, and no payment provider will route money to them.
 * Advertising a job you could not actually pay someone for wastes their time
 * and yours. Worth a word with an accountant before hiring in one.
 */
const notHiringFrom: string[] = [];

export const hiringCountries = countries.filter((name) => !notHiringFrom.includes(name));
