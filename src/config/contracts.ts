/**
 * SPECIMEN EMPLOYMENT CONTRACT — SITE CONFIGURATION
 * =================================================
 *
 * The specimen contract is the example document a candidate can download and
 * read BEFORE accepting a job offer. The offer email links to /sample-contract.
 *
 * WHERE THINGS LIVE
 *   docs/contracts/sample-employment-contract.md  the text (edit this)
 *   src/config/contract-document.json             version + output metadata
 *   public/documents/*.pdf                        generated — do not edit
 *   npm run build:contract                        regenerates the PDF
 *
 * ⚠️  UNLISTED BY DESIGN. This page is excluded from the sitemap, from the
 *     header and footer navigation, and from search engines (noindex here plus
 *     robots.txt and an X-Robots-Tag header on the PDF itself). Candidates
 *     reach it through the link in their offer email. Removing those
 *     exclusions publishes the company's employment terms to everyone.
 *
 * ⚠️  PLACEHOLDER CONTENT. The specimen text is a jurisdiction-neutral starting
 *     point, not legal advice. Have it reviewed by a qualified legal
 *     professional for the country of employment before any candidate sees it.
 */

import meta from "./contract-document.json";

export interface ContractDocument {
  title: string;
  subtitle: string;
  /** Version label shown on the page and printed in the PDF footer. */
  version: string;
  /** ISO date the version was issued. */
  issued: string;
  language: string;
  /** Which roles this specimen matches — shown so nobody assumes it covers all. */
  appliesTo: string;
  /** Public path of the generated PDF. */
  downloadPath: string;
  /** Filename suggested to the browser when the candidate saves the file. */
  downloadName: string;
  pages: number;
  bytes: number;
  sizeLabel: string;
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export const contractDocument: ContractDocument = {
  title: meta.title,
  subtitle: meta.subtitle,
  version: meta.version,
  issued: meta.issued,
  language: meta.language,
  appliesTo: meta.appliesTo,
  downloadPath: meta.downloadPath,
  downloadName: meta.downloadPath.split("/").pop() ?? "sample-employment-contract.pdf",
  pages: meta.generated.pages,
  bytes: meta.generated.bytes,
  sizeLabel: formatSize(meta.generated.bytes),
};

/** Path of the unlisted page recruiters link to from the offer email. */
export const contractPagePath = "/sample-contract";

/**
 * Plain-language summary of the specimen, shown on the page itself.
 * Many candidates read on a phone and will not open a PDF — the summary must
 * stand on its own. Keep it in step with the clauses in the markdown source.
 */
export interface ContractSummaryItem {
  heading: string;
  description: string;
  icon: string;
}

export const contractSummary: ContractSummaryItem[] = [
  {
    heading: "Position, place of work and start date",
    description:
      "Your job title, who you report to, the site or work arrangement (on-site, hybrid or remote), and the day your employment begins.",
    icon: "mapPin",
  },
  {
    heading: "Probationary period",
    description:
      "How long the probationary period lasts and the notice either side gives during it.",
    icon: "ladder",
  },
  {
    heading: "Working hours and shifts",
    description:
      "Weekly hours, how shifts are scheduled and how much notice you get, plus rest breaks and rest periods.",
    icon: "clock",
  },
  {
    heading: "Pay, bonuses and overtime",
    description:
      "Gross pay and pay date, any bonus, language or shift premiums that apply to the role, and how approved overtime is compensated.",
    icon: "wallet",
  },
  {
    heading: "Leave, holidays and absence",
    description:
      "Paid annual leave, public holidays, and what to do when you are ill or need other leave.",
    icon: "check",
  },
  {
    heading: "Training and onboarding",
    description:
      "Required training is working time and is paid. What we provide, and what we ask you to complete.",
    icon: "graduation",
  },
  {
    heading: "Confidentiality and customer data",
    description:
      "How customer information must be handled, during the job and after it ends — with the protections for reporting wrongdoing left intact.",
    icon: "shield",
  },
  {
    heading: "Quality monitoring and your data",
    description:
      "Whether calls or screens are recorded for quality and training, what is kept, for how long, and who can see it.",
    icon: "headset",
  },
  {
    heading: "Notice and ending the contract",
    description:
      "The notice period after probation, what happens on your last day, and your final pay and documents.",
    icon: "handshake",
  },
];
