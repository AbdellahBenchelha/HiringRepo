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

export const siteConfig = {
  /** Public site URL — used for canonical URLs, sitemap and Open Graph. */
  url: "https://workroute.work",

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
    phone: "+44 78 3130 4534",
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
   * listing. Add every country you genuinely recruit from; leaving one out
   * hides your jobs from candidates there.
   */
  hiringCountries: [
    // --- Europe ---
    "Albania", "Andorra", "Austria", "Belgium", "Bosnia and Herzegovina",
    "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia",
    "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland",
    "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta",
    "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia",
    "Norway", "Poland", "Portugal", "Romania", "San Marino", "Serbia",
    "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Ukraine",
    "United Kingdom",
    // --- North America ---
    "United States", "Canada",
    // --- Türkiye ---
    "Turkey",
    // --- Middle East ---
    "Bahrain", "Egypt", "Israel", "Jordan", "Kuwait", "Lebanon", "Oman",
    "Qatar", "Saudi Arabia", "United Arab Emirates",
  ] as string[],

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
    /**
     * Leave empty until you have the real values — the Legal Notice omits any
     * row that is blank. These previously read "REG-000000000" and
     * "TAX-000000000", which is worse than showing nothing: an invented
     * company number on a legal-identification page is a false statement about
     * the company, and UK limited companies are required to publish accurate
     * details.
     */
    registrationNumber: "", // TODO — Companies House number
    taxNumber: "", // TODO — VAT number, if registered
    registeredAddress:
      "65 Stroude Road, Skeabrae, KW17 0AX, United Kingdom",
    websiteOwner: "WorkRoute Ltd.", // PLACEHOLDER
    hostingProvider: "Railway Corp., 548 Market St, San Francisco, CA 94104, United States",
    /** How long applicant data is retained, in months. Used across legal pages. */
    applicantDataRetentionMonths: 12, // PLACEHOLDER — confirm with legal counsel
  },

  /** ----------------------------------------------------------------------- */
  /** COMPANY STATISTICS — REVIEW & VERIFY before publishing.                 */
  /** These are illustrative placeholders only.                               */
  /** ----------------------------------------------------------------------- */
  /**
   * Facts about how the roles work, shown in place of company statistics.
   *
   * These replaced invented figures — team size, interaction counts, markets
   * served — which were layout placeholders that reached the live site. Every
   * line here is something the company can stand behind, and none of it needs
   * revisiting as the company grows.
   *
   * If real, verifiable numbers become available, they belong here, but only
   * once they are true.
   */
  highlights: [
    { value: "100%", label: "Remote — every role, no commute" },
    { value: "Paid", label: "Training from day one" },
    { value: "5", label: "Support channels: phone, chat, email, technical, sales" },
    { value: "Internal", label: "Promotions — we hire team leads from the front line" },
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
