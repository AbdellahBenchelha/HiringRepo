/**
 * Proof of address: a recent bill or bank statement showing the candidate's
 * name and home address, asked for as the last step before the final
 * agreement.
 *
 * Pure, shared by the candidate page, its API, the Admin Panel and the bulk
 * sender, so all of them agree on what was asked and where it stands.
 *
 * Optional and separate from everything else: nothing waits on it. An
 * agreement can go out without it, and "Full verified" does not depend on it.
 * It is sent by hand (one candidate, or many from the Accepted tab), and the
 * link in it never expires — every email we sent keeps working.
 *
 * Not the same as "proof of residence" (lib/residence), which asks for a
 * residence permit or ID card from the country somebody lives in. This one is
 * about the street address on the agreement.
 */

export const ADDRESS_DOC_TYPES = [
  {
    value: "utility",
    label: "Service or utility bill",
    lines: [
      "Must be within the last 3 months.",
      "Accepted documents: Bills for internet or TV service, gas, water, electricity or city tax.",
    ],
    short: "Utility bill",
  },
  {
    value: "bank",
    label: "Bank/credit card statement or account confirmation letter",
    lines: ["Must be within the last 3 months."],
    short: "Bank statement",
  },
] as const;

export type AddressDocType = (typeof ADDRESS_DOC_TYPES)[number]["value"];

export function isAddressDocType(v: unknown): v is AddressDocType {
  return ADDRESS_DOC_TYPES.some((t) => t.value === v);
}

export function addressDocTypeLabel(v: string | undefined): string {
  return ADDRESS_DOC_TYPES.find((t) => t.value === v)?.label ?? "";
}

/** Why a document is sent back — what the recruiter picks, and what the candidate reads. */
export const ADDRESS_REASK_REASONS = [
  {
    value: "old",
    label: "Older than 3 months",
    message: "The document is older than 3 months. Please send one dated within the last 3 months.",
  },
  {
    value: "name",
    label: "Name doesn't match",
    message: "The name on the document does not match your name.",
  },
  {
    value: "address",
    label: "Address doesn't match",
    message: "The address on the document does not match the address you gave us.",
  },
  {
    value: "unreadable",
    label: "Not readable",
    message: "The document is not clear enough to read.",
  },
  {
    value: "type",
    label: "Wrong type of document",
    message:
      "This type of document is not accepted. Please send a service or utility bill, or a bank/credit card statement or account confirmation letter.",
  },
] as const;

export const MAX_ADDRESS_REASON = 300;
export const MAX_ADDRESS_LENGTH = 300;

/** The wording for a preset, or the recruiter's own words, trimmed and capped. */
export function addressReaskMessage(value: string, custom?: string): string {
  const preset = ADDRESS_REASK_REASONS.find((r) => r.value === value);
  if (preset) return preset.message;
  return (custom ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_ADDRESS_REASON);
}

/** One email about it: the first request (or a resend), a reminder, or a new-document request. */
export interface AddressProofEvent {
  at: string;
  by?: string;
  kind: "request" | "reminder" | "reask";
  /** Only on "reask": what the candidate was told. */
  reason?: string;
}

/** What the candidate sent once: which document, and the address they typed. */
export interface AddressProofSubmission {
  at: string;
  type: AddressDocType;
  /** The address as they typed it on the page. */
  address: string;
  /** The address we had on file at that moment, for the comparison. */
  onFile: string;
  /** Storage key of the PDF sent with it, to find it among earlier uploads. */
  key?: string;
}

export interface AddressProofInput {
  addressProofRequestedAt?: string;
  addressProofSubmittedAt?: string;
  addressProofApprovedAt?: string;
}

export type AddressProofStatus =
  /** Nothing sent yet. */
  | "not_asked"
  /** Asked (or asked for a new document), nothing back since. */
  | "asked"
  /** A document arrived and is waiting for a recruiter. */
  | "received"
  /** A recruiter approved the document. */
  | "approved";

export function addressProofStatus(c: AddressProofInput): AddressProofStatus {
  const asked = c.addressProofRequestedAt;
  const sent = c.addressProofSubmittedAt;
  if (!asked) return sent ? (c.addressProofApprovedAt ? "approved" : "received") : "not_asked";
  if (!sent || sent < asked) return "asked";
  return c.addressProofApprovedAt && c.addressProofApprovedAt >= sent ? "approved" : "received";
}

export const ADDRESS_STATUS_LABEL: Record<AddressProofStatus, string> = {
  not_asked: "Not asked",
  asked: "Asked",
  received: "Received",
  approved: "Approved",
};

/**
 * The address we have on file, as one line: what they confirmed when they
 * accepted, or else what they typed on the application.
 */
export function addressOnFile(c: {
  address?: string;
  city?: string;
  country?: string;
  confirmedDetails?: { address?: string; city?: string; postcode?: string; country?: string };
}): string {
  const d = c.confirmedDetails;
  const parts = d?.address
    ? [d.address, [d.city, d.postcode].filter(Boolean).join(" "), d.country]
    : [c.address, c.city, c.country];
  const out: string[] = [];
  for (const raw of parts) {
    const p = (raw ?? "").trim();
    // Skip a part the line already holds — an application address often ends
    // with the city and country somebody also put in their own boxes.
    if (p && !normaliseAddress(out.join(", ")).includes(normaliseAddress(p))) out.push(p);
  }
  return out.join(", ");
}

/** For comparing two addresses: case, punctuation and spacing do not count. */
export function normaliseAddress(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,;:#\-–—/\\()'"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function addressDiffers(given: string, onFile: string): boolean {
  if (!onFile.trim()) return false;
  return normaliseAddress(given) !== normaliseAddress(onFile);
}

/** The address as the candidate may send it: one line or several, trimmed and capped. */
export function cleanAddress(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ")
    .slice(0, MAX_ADDRESS_LENGTH);
}
