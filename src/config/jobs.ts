/**
 * OPEN POSITIONS
 * --------------
 * Edit, add, or remove job postings here. Each job's `slug` is used to build a
 * human-readable URL (e.g. /jobs/customer-support-representative) and to power
 * the JobPosting structured data for SEO.
 *
 * Pay: set `salary` on a job to publish it. It appears in the "At a glance"
 * panel and as `baseSalary` in the JobPosting structured data, which is what
 * Google Search Console asks for and what lets a listing appear in salary
 * filters. Leave it off and neither is emitted — never guess a figure, because
 * this is published to candidates and to Google as a statement of fact.
 */

/** ISO 4217 currency, e.g. "USD", "EUR", "GBP", "MAD", "NGN". */
export type CurrencyCode = string;

/**
 * What the role pays.
 *
 * `max` is optional: leave it out for a single fixed rate. The period must be
 * one of schema.org's, because Google reads `unitText` literally.
 */
export interface Salary {
  currency: CurrencyCode;
  min: number;
  max?: number;
  unit: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
  /**
   * Short qualifier shown beside the rate, e.g. "plus commission". Kept short
   * because it has to fit on a job card next to the figure.
   */
  note?: string;
  /**
   * A fuller sentence, shown only in the job page's "At a glance" panel and
   * appended to the indexed description. Room to explain what the note means.
   */
  detail?: string;
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
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "TEMPORARY";
  /** Omit entirely rather than guessing — see the note at the top of this file. */
  salary?: Salary;
  responsibilities: string[];
  requirements: string[];
}

export const jobs: JobPosting[] = [
  {
    slug: "customer-support-representative",
    title: "Customer Support Representative",
    salary: { currency: "USD", min: 20, max: 28, unit: "HOUR" },
    shortDescription:
      "Be the friendly, knowledgeable voice that helps customers across phone, email, and live chat — resolving issues and creating positive experiences.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
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
    salary: { currency: "USD", min: 18, max: 25, unit: "HOUR" },
    shortDescription:
      "Handle inbound or outbound calls with confidence, helping customers understand products and services while meeting quality and performance standards.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
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
    salary: { currency: "USD", min: 19, max: 26, unit: "HOUR" },
    shortDescription:
      "Deliver fast, accurate, and professional written support across live chat and email, managing multiple conversations with care.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "Strong written English required; additional languages a plus",
    datePosted: "2026-08-17",
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
    salary: { currency: "USD", min: 29, max: 35, unit: "HOUR" },
    shortDescription:
      "Guide customers through technical issues with patience and clarity, turning frustration into confidence with simple, helpful solutions.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
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
    salary: {
      currency: "USD",
      min: 22,
      max: 30,
      unit: "HOUR",
      // Base only. Commission is real pay but not base pay, so it is described
      // rather than folded into the figure Google reads as baseSalary.
      note: "plus commission",
      detail: "Commission is paid on top of the base rate.",
    },
    shortDescription:
      "Build relationships, understand customer needs, and present the right solutions — helping customers stay and grow with the brands we support.",
    workArrangement: "Remote",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-08-17",
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

const UNIT_LABEL: Record<Salary["unit"], string> = {
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

/**
 * Human-readable pay, e.g. "$5 – $8 per hour".
 *
 * Intl.NumberFormat gives the right symbol and grouping for the currency
 * without a table of our own. No decimals: nobody advertises $5.00 an hour.
 *
 * Formatted as en-US rather than the en-GB used for dates elsewhere, because
 * en-GB renders USD as "US$5" — correct, but not how a job advert reads. The
 * unambiguous currency code goes to Google in the structured data regardless.
 */
export function formatSalary(salary: Salary): string {
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: salary.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const amount =
    salary.max !== undefined && salary.max !== salary.min
      ? `${money(salary.min)} – ${money(salary.max)}`
      : money(salary.min);
  const rate = `${amount} per ${UNIT_LABEL[salary.unit]}`;
  return salary.note ? `${rate} ${salary.note}` : rate;
}

export function getJobBySlug(slug: string): JobPosting | undefined {
  return jobs.find((job) => job.slug === slug);
}
