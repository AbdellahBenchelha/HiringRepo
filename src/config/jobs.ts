/**
 * OPEN POSITIONS
 * --------------
 * Edit, add, or remove job postings here. Each job's `slug` is used to build a
 * human-readable URL (e.g. /jobs/customer-support-representative) and to power
 * the JobPosting structured data for SEO.
 *
 * Pay is NOT published. `payBand` below is an internal figure only: it fills
 * in the offer form in the Admin Panel and warns when an offer is typed below
 * it. Nothing renders it on a page, and no `baseSalary` is emitted in the
 * JobPosting structured data.
 *
 * It was public once, on the job cards and in the "At a glance" panel. It came
 * off at the registrar's request, so if you are adding it back, that is the
 * thing to check first — and it would have to go back in three places at once
 * (card, panel, structured data) rather than by setting a field.
 */

/** ISO 4217 currency, e.g. "USD", "EUR", "GBP", "MAD", "NGN". */
export type CurrencyCode = string;

/**
 * What this role is worth paying, for our own use.
 *
 * Not advertised anywhere. It is where the offer form starts, and what an
 * offer is measured against before it is sent — a candidate who came through
 * six stages and is then offered below the band is the complaint worth making
 * hard to cause by accident.
 *
 * `max` is optional: leave it out for a single fixed rate. The units are
 * schema.org's because the offer shares them, not because anything is indexed.
 */
export interface PayBand {
  currency: CurrencyCode;
  min: number;
  max?: number;
  unit: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
}

export interface JobPosting {
  slug: string;
  title: string;
  shortDescription: string;
  workArrangement: string;
  experienceLevel: string;
  languages: string;
  /** Date the listing was published (ISO) — used by JobPosting structured data. */
  datePosted: string;
  /**
   * Date this listing's content last changed (ISO), if it has since posting.
   * Feeds the sitemap's lastmod, which is how a search engine decides whether
   * a page is worth re-reading. Bump it when you edit a job — pay, title,
   * responsibilities — and leave it alone otherwise. A date that moves when
   * nothing changed is why Google ignores the field on most sites.
   */
  updatedAt?: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "TEMPORARY";
  /** Omit entirely rather than guessing — see the note at the top of this file. */
  payBand?: PayBand;
  responsibilities: string[];
  requirements: string[];
}

export const jobs: JobPosting[] = [
  {
    slug: "customer-support-representative",
    title: "Customer Support Representative",
    payBand: { currency: "USD", min: 20, max: 28, unit: "HOUR" },
    shortDescription:
      "Be the friendly, knowledgeable voice that helps customers across phone, email, and live chat — resolving issues and creating positive experiences.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
    updatedAt: "2026-08-27",
    employmentType: "FULL_TIME",
    responsibilities: [
      "Respond to customer inquiries by phone, email, or live chat",
      "Provide clear and accurate information",
      "Resolve customer problems professionally",
      "Record interactions in the company system",
      "Escalate complex cases when necessary",
      "Maintain a high level of customer satisfaction",
    ],
    requirements: [
      "Strong communication skills",
      "Professional and friendly attitude",
      "Good computer skills",
      "Ability to listen and solve problems",
      "Ability to work independently and as part of a team",
      "Previous experience is preferred but not always required",
    ],
  },
  {
    slug: "call-center-agent",
    title: "Call Center Agent",
    payBand: { currency: "USD", min: 18, max: 25, unit: "HOUR" },
    shortDescription:
      "Handle inbound or outbound calls with confidence, helping customers understand products and services while meeting quality and performance standards.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
    updatedAt: "2026-08-27",
    employmentType: "FULL_TIME",
    responsibilities: [
      "Handle inbound or outbound calls",
      "Understand customer needs",
      "Explain products or services clearly",
      "Follow approved scripts and procedures",
      "Meet quality and performance standards",
      "Maintain accurate customer records",
    ],
    requirements: [
      "Clear and confident verbal communication",
      "Active listening and a customer-focused mindset",
      "Comfort working toward quality and performance targets",
      "Good computer and data-entry skills",
      "Reliability and punctuality",
      "Previous call-center experience is an advantage",
    ],
  },
  {
    slug: "live-chat-and-email-support-agent",
    title: "Live Chat and Email Support Agent",
    payBand: { currency: "USD", min: 19, max: 26, unit: "HOUR" },
    shortDescription:
      "Deliver fast, accurate, and professional written support across live chat and email, managing multiple conversations with care.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "Strong written English required; additional languages a plus",
    datePosted: "2026-08-17",
    updatedAt: "2026-08-27",
    employmentType: "FULL_TIME",
    responsibilities: [
      "Answer customer questions through live chat and email",
      "Write clear, professional, and grammatically correct responses",
      "Manage several conversations efficiently",
      "Follow company procedures and response-time standards",
    ],
    requirements: [
      "Excellent written communication and grammar",
      "Ability to multitask across several conversations",
      "Strong attention to detail",
      "Comfortable using digital support tools",
      "Self-motivated and organized",
      "Previous written-support experience is an advantage",
    ],
  },
  {
    slug: "technical-support-representative",
    title: "Technical Support Representative",
    payBand: { currency: "USD", min: 29, max: 35, unit: "HOUR" },
    shortDescription:
      "Guide customers through technical issues with patience and clarity, turning frustration into confidence with simple, helpful solutions.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
    updatedAt: "2026-08-27",
    employmentType: "FULL_TIME",
    responsibilities: [
      "Help customers troubleshoot basic technical problems",
      "Explain solutions using simple language",
      "Document technical issues",
      "Escalate advanced cases to the appropriate team",
    ],
    requirements: [
      "Comfort with everyday technology and software",
      "Patience and a methodical problem-solving approach",
      "Clear communication for non-technical audiences",
      "Good documentation habits",
      "Willingness to learn new products and tools",
      "Technical or help-desk experience is an advantage",
    ],
  },
  {
    slug: "sales-and-retention-agent",
    title: "Sales and Retention Agent",
    // Base only — commission is paid on top of this rate, and folding it in
    // would make every offer built from this band too high.
    payBand: { currency: "USD", min: 22, max: 30, unit: "HOUR" },
    shortDescription:
      "Build relationships, understand customer needs, and present the right solutions — helping customers stay and grow with the brands we support.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
    updatedAt: "2026-08-27",
    employmentType: "FULL_TIME",
    responsibilities: [
      "Contact prospective or existing customers",
      "Present suitable services and offers",
      "Identify customer needs",
      "Handle objections professionally",
      "Work toward sales and retention targets",
    ],
    requirements: [
      "Persuasive yet respectful communication",
      "Resilience and a positive, goal-oriented attitude",
      "Ability to understand and match customer needs",
      "Comfort working toward sales and retention targets",
      "Good record-keeping skills",
      "Sales or retention experience is an advantage",
    ],
  },
];

export function getJobBySlug(slug: string): JobPosting | undefined {
  return jobs.find((job) => job.slug === slug);
}
