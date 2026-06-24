/**
 * =============================================================================
 *  NEXACARE SUPPORT SOLUTIONS — CENTRAL SITE CONFIGURATION
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
  url: "https://www.nexacaresupport.example", // PLACEHOLDER — set your real domain

  company: {
    name: "NexaCare Support Solutions",
    shortName: "NexaCare",
    tagline: "Build Your Career. Connect With People. Make a Difference.",
    logoInitials: "NC",
    description:
      "NexaCare Support Solutions is a customer-experience and business-process outsourcing company committed to helping brands build stronger relationships with their customers. Our teams provide high-quality phone, live chat, email, technical, and sales support across different industries and international markets.",
    descriptionExtended:
      "We believe that excellent customer service begins with excellent people. That is why we invest in training, professional development, teamwork, communication, and a positive working environment. Whether you already have customer-service experience or are beginning your professional career, NexaCare gives you the tools, support, and opportunities needed to succeed.",
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
    recruitmentEmail: "careers@nexacaresupport.example", // PLACEHOLDER
    supportEmail: "support@nexacaresupport.example", // PLACEHOLDER
    privacyEmail: "privacy@nexacaresupport.example", // PLACEHOLDER
    phone: "+1 (000) 000-0000", // PLACEHOLDER
    address: {
      line1: "100 Example Business Avenue", // PLACEHOLDER
      line2: "Suite 2400", // PLACEHOLDER
      city: "Metropolis", // PLACEHOLDER
      region: "State / Region", // PLACEHOLDER
      postalCode: "00000", // PLACEHOLDER
      country: "Country", // PLACEHOLDER
    },
    businessHours: "Monday – Friday, 9:00 AM – 6:00 PM (local time)", // PLACEHOLDER
    /** Optional Google Maps embed URL. Leave empty to hide the map. */
    mapEmbedUrl: "", // PLACEHOLDER — paste a Google Maps embed URL if available
  },

  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/", icon: "linkedin" }, // PLACEHOLDER
    { label: "Facebook", href: "https://www.facebook.com/", icon: "facebook" }, // PLACEHOLDER
    { label: "Instagram", href: "https://www.instagram.com/", icon: "instagram" }, // PLACEHOLDER
    { label: "X (Twitter)", href: "https://x.com/", icon: "x" }, // PLACEHOLDER
  ],

  /** ----------------------------------------------------------------------- */
  /** LEGAL / COMPANY REGISTRATION — must be completed by the company.        */
  /** ----------------------------------------------------------------------- */
  legal: {
    registeredName: "NexaCare Support Solutions Ltd.", // PLACEHOLDER
    businessType: "Private Limited Company", // PLACEHOLDER
    registrationNumber: "REG-000000000", // PLACEHOLDER
    taxNumber: "TAX-000000000", // PLACEHOLDER
    registeredAddress:
      "100 Example Business Avenue, Suite 2400, Metropolis, 00000, Country", // PLACEHOLDER
    websiteOwner: "NexaCare Support Solutions Ltd.", // PLACEHOLDER
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

  workArrangements: ["On-site", "Remote", "Hybrid", "No preference"],

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

  /**
   * Demonstration mode.
   * When true, the application & contact forms DO NOT transmit data anywhere.
   * Submissions are clearly labelled as TEST submissions. Set to false only
   * after wiring up the backend integration points in src/lib/submit.ts.
   */
  demoMode: true,

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
  return [a.line1, a.line2, `${a.city}, ${a.region} ${a.postalCode}`, a.country]
    .filter(Boolean)
    .join(", ");
}
