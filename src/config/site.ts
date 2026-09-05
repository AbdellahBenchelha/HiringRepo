/**
 * =============================================================================
 *  WORKROUTE — CENTRAL SITE CONFIGURATION
 * =============================================================================
 *
 *  This file is the single source of truth for all editable company content.
 *  A non-technical website owner should be able to update most of the site by
 *  editing the values in THIS FILE ONLY.
 *
 *  ⚠️  PLACEHOLDER NOTICE
 *  Values marked with `// PLACEHOLDER` MUST be reviewed and replaced with real,
 *  verified company information BEFORE the website is published. This includes
 *  legal/company registration details, contact details, statistics, and
 *  testimonials.
 *
 *  ⚠️  RECRUITMENT EMAIL
 *  Change `recruitmentEmail` below (and, if you use a backend, the matching
 *  server environment variable RECRUITMENT_EMAIL) to control where job
 *  applications are delivered.
 * =============================================================================
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

export const siteConfig = {
  /** Public site URL — used for canonical URLs, sitemap and Open Graph. */
  url: "https://workroute.work",

  /**
   * The specimen contractor agreement candidates can read before accepting.
   *
   * Set `file` to a PDF placed in `public/` and it appears on the offer page
   * and in the offer email. Leave it empty and nothing is shown anywhere —
   * which is the correct behaviour until there is a document to show, because
   * a link to a missing file reads worse to a candidate than no link at all.
   *
   * `version` is printed beside the link. When the document is revised, change
   * both the filename and the version: a candidate who read the old one should
   * be identifiable, and a browser that cached the old file must not serve it
   * in place of the new.
   *
   * It must be marked as a specimen on its own pages. What is linked here is
   * information, not the agreement — the agreement is issued for signature
   * after acceptance, with their own details in it.
   */
  sampleAgreement: {
    /** e.g. "sample-contractor-agreement-2026-09.pdf". Empty = not published. */
    file: "sample-contractor-agreement-2026-09.pdf",
    version: "September 2026",
  },

  /**
   * The timezone the business runs on, as an IANA name.
   *
   * Only the dashboard uses it, and only to decide where one day ends and the
   * next begins: counted in UTC, "today" would reset at 1am local and every
   * daily figure would be an hour out of step with the person reading it.
   *
   * An IANA name rather than a fixed offset on purpose — Morocco sits at UTC+1
   * but drops to UTC+0 for Ramadan, so a hardcoded "+1" would be wrong for a
   * month a year, and wrong differently each year.
   */
  timeZone: "Africa/Casablanca",

  company: {
    name: "WorkRoute",
    shortName: "WorkRoute",
    descriptor: "Customer Experience",
    tagline: "Build Your Career. Connect With People. Make a Difference.",
    logoInitials: "WR",
    description:
      "WorkRoute is a customer-experience and business-process outsourcing company committed to helping brands build stronger relationships with their customers. Our teams provide high-quality phone, live chat, email, technical, and sales support across different industries and international markets.",
    descriptionExtended:
      "We believe that excellent customer service begins with excellent people. That is why we invest in training, professional development, teamwork, communication, and a positive working environment. Whether you already have customer-service experience or are beginning your professional career, WorkRoute gives you the tools, support, and opportunities needed to succeed.",
    values: [
      {
        title: "Customer First",
        description:
          "Every decision starts with the people we serve and the experiences we create for them.",
      },
      {
        title: "Respect and Inclusion",
        description:
          "We welcome people of all backgrounds and build teams where everyone belongs.",
      },
      {
        title: "Clear Communication",
        description:
          "We listen carefully and speak clearly, in every language and on every channel.",
      },
      {
        title: "Teamwork",
        description:
          "We achieve more together, supporting one another to deliver our best work.",
      },
      {
        title: "Continuous Improvement",
        description:
          "We learn, measure, and refine so our service keeps getting better.",
      },
      {
        title: "Professional Integrity",
        description:
          "We act honestly, protect customer trust, and do the right thing.",
      },
    ],
  },

  /** ----------------------------------------------------------------------- */
  /** CONTACT — editable placeholders, review before publishing.              */
  /** ----------------------------------------------------------------------- */
  contact: {
    recruitmentEmail: "careers@workroute.work",
    supportEmail: "support@workroute.work",
    privacyEmail: "privacy@workroute.work",
    /** Also the WhatsApp Business number candidates send voice recordings to. */
    phone: "+44 7451 272838",
    address: {
      line1: "65 Stroude Road",
      line2: "",
      city: "Skeabrae",
      region: "",
      postalCode: "KW17 0AX",
      country: "United Kingdom",
    },
    businessHours: "Monday – Friday, 9:00 AM – 6:00 PM (local time)", // PLACEHOLDER
    /** Optional Google Maps embed URL. Leave empty to hide the map. */
    mapEmbedUrl: "", // PLACEHOLDER — paste a Google Maps embed URL if available
  },

  /**
   * Countries you accept applicants from, used by the JobPosting structured
   * data that feeds the Google Jobs listing.
   *
   * Google requires real country names here for a fully remote role — it will
   * not accept a placeholder — and it uses them to decide who sees the
   * listing. Leaving a country out hides your jobs from candidates there.
   *
   * WorkRoute recruits worldwide, so this is the same master list the
   * application form's country picker uses. Deriving it rather than keeping a
   * second copy means the two can never disagree — a country you accept
   * applications from is always a country Google shows your jobs in.
   */
  hiringCountries: countries.filter((name) => !notHiringFrom.includes(name)),

  /** How long a listing stays valid, in days, from its datePosted. */
  jobValidityDays: 90,

  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/workroute-services-private-limited/", icon: "linkedin" },
    { label: "Facebook", href: "https://www.facebook.com/WorkRouteService/", icon: "facebook" },
    { label: "X (Twitter)", href: "https://x.com/WorkRouteCo", icon: "x" },
  ],

  /** ----------------------------------------------------------------------- */
  /** LEGAL / COMPANY REGISTRATION — must be completed by the company.        */
  /** ----------------------------------------------------------------------- */
  legal: {
    registeredName: "WorkRoute Ltd.", // PLACEHOLDER
    businessType: "Private Limited Company", // PLACEHOLDER
    registrationNumber: "REG-000000000", // PLACEHOLDER
    taxNumber: "TAX-000000000", // PLACEHOLDER
    registeredAddress:
      "65 Stroude Road, Skeabrae, KW17 0AX, United Kingdom",
    websiteOwner: "WorkRoute Ltd.", // PLACEHOLDER
    hostingProvider: "Your Hosting Provider Inc., 1 Datacenter Road, Country", // PLACEHOLDER
    /** How long applicant data is retained, in months. Used across legal pages. */
    applicantDataRetentionMonths: 12, // PLACEHOLDER — confirm with legal counsel
  },

  /** ----------------------------------------------------------------------- */
  /** COMPANY STATISTICS — REVIEW & VERIFY before publishing.                 */
  /** These are illustrative placeholders only.                               */
  /** ----------------------------------------------------------------------- */
  stats: [
    { value: "10M+", label: "Customer interactions supported" }, // PLACEHOLDER
    { value: "15+", label: "Languages covered" }, // PLACEHOLDER
    { value: "1,200+", label: "Team members" }, // PLACEHOLDER
    { value: "30+", label: "Markets served" }, // PLACEHOLDER
    { value: "50,000+", label: "Training hours delivered" }, // PLACEHOLDER
  ],

  /**
   * Languages available in the application form's language picker.
   * Edit this list to match the languages your roles require.
   */
  languages: [
    "English",
    "Spanish",
    "French",
    "German",
    "Portuguese",
    "Italian",
    "Dutch",
    "Arabic",
    "Mandarin Chinese",
    "Hindi",
    "Russian",
    "Polish",
    "Turkish",
    "Japanese",
    "Korean",
  ],

  proficiencyLevels: ["Beginner", "Intermediate", "Advanced", "Fluent", "Native"],

  workArrangements: ["Remote"],

  employmentTypes: ["Full-time", "Part-time", "Temporary", "No preference"],

  supportTypes: [
    "Phone",
    "Live chat",
    "Email",
    "Technical support",
    "Sales",
    "Retention",
    "Social media support",
  ],

  educationLevels: [
    "High school / secondary",
    "Vocational / professional certificate",
    "Associate degree",
    "Bachelor's degree",
    "Master's degree",
    "Doctorate",
    "Other",
  ],

  referralSources: [
    "Company website",
    "LinkedIn",
    "Job board",
    "Social media",
    "Referred by an employee",
    "Search engine",
    "Career fair / event",
    "Other",
  ],

  /** File-upload constraints used by the form and the uploader component. */
  upload: {
    maxFileSizeMB: 5,
    acceptedExtensions: [".pdf", ".doc", ".docx"],
    acceptedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;

/** Convenience: a single-line, human-readable office address. */
export function formatAddress(): string {
  const a = siteConfig.contact.address;
  const regionPostal = [a.region, a.postalCode].filter(Boolean).join(" ");
  const cityLine = [a.city, regionPostal].filter(Boolean).join(", ");
  return [a.line1, a.line2, cityLine, a.country].filter(Boolean).join(", ");
}
