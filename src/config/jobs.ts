/**
 * OPEN POSITIONS
 * --------------
 * Edit, add, or remove job postings here. Each job's `slug` is used to build a
 * human-readable URL (e.g. /jobs/customer-support-representative) and to power
 * the JobPosting structured data for SEO.
 *
 * Salary amounts are intentionally NOT shown on job cards. If you want to
 * display compensation, add a `salary` field and render it where appropriate —
 * keeping it here keeps it editable from a single place.
 */

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
  responsibilities: string[];
  requirements: string[];
}

export const jobs: JobPosting[] = [
  {
    slug: "customer-support-representative",
    title: "Customer Support Representative",
    shortDescription:
      "Be the friendly, knowledgeable voice that helps customers across phone, email, and live chat — resolving issues and creating positive experiences.",
    workArrangement: "On-site · Hybrid · Remote (role dependent)",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-01-15",
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
    shortDescription:
      "Handle inbound or outbound calls with confidence, helping customers understand products and services while meeting quality and performance standards.",
    workArrangement: "On-site · Hybrid (role dependent)",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-01-15",
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
    shortDescription:
      "Deliver fast, accurate, and professional written support across live chat and email, managing multiple conversations with care.",
    workArrangement: "Remote · Hybrid (role dependent)",
    experienceLevel: "Entry level to experienced",
    languages: "Strong written English required; additional languages a plus",
    datePosted: "2026-01-15",
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
    shortDescription:
      "Guide customers through technical issues with patience and clarity, turning frustration into confidence with simple, helpful solutions.",
    workArrangement: "On-site · Hybrid · Remote (role dependent)",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-01-15",
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
    shortDescription:
      "Build relationships, understand customer needs, and present the right solutions — helping customers stay and grow with the brands we support.",
    workArrangement: "On-site · Hybrid (role dependent)",
    experienceLevel: "Entry level to experienced",
    languages: "English required; additional languages an advantage",
    datePosted: "2026-01-15",
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
