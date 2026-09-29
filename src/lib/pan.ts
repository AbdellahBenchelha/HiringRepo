/**
 * The Indian PAN card, offered at acceptance by candidates living in India.
 *
 * Pure, shared by the offer form, the confirm route and the Admin Panel, so
 * the three agree on who is asked and what the answer means.
 *
 * Required at acceptance: the final agreement needs tax details, so an offer
 * cannot be accepted from India until the front of the card has arrived. (It
 * began as optional — "No / skip" answers recorded then are kept as they are.)
 *
 * The GSTIN beside it is optional: only GST-registered people have one, most
 * individual contractors do not, and having it simply speeds the agreement up.
 *
 * Asked of people living in India — the country confirmed on the form — not of
 * Indian nationals elsewhere, because PAN is a tax identifier and tax follows
 * residence. Only the card is asked for: no number typed in, and never Aadhaar.
 *
 * Front and back, with the back optional: the e-PAN most people are now issued
 * is a single-page PDF with nothing on the reverse.
 */
import type { CandidateDocument, DocumentKind } from "@/lib/documents";

export const PAN_KINDS = ["panFront", "panBack"] as const satisfies readonly DocumentKind[];

export type PanAnswer = "yes" | "no";

export function isPanAnswer(v: unknown): v is PanAnswer {
  return v === "yes" || v === "no";
}

/** Is this person asked, from the country of residence being confirmed now? */
export function panExpected(country: string | undefined): boolean {
  return (country ?? "").trim().toLowerCase() === "india";
}

/** The current PAN document of this kind, if one arrived and passed checks. */
export function currentPanDocument(
  documents: CandidateDocument[] | undefined,
  kind: (typeof PAN_KINDS)[number],
): CandidateDocument | undefined {
  return (documents ?? []).find((d) => d.kind === kind && !d.supersededAt && d.status !== "blocked");
}

export interface PanInput {
  documents?: CandidateDocument[];
  panAnswer?: PanAnswer;
  panDeletedAt?: string;
}

export type PanStatus =
  /** Not asked — outside India, or accepted before the question existed. */
  | "not_asked"
  /** Chose "No / skip", or left the question unanswered. */
  | "no"
  /** The front is on file (the back may or may not be). */
  | "provided"
  /** Said yes, but nothing arrived — the upload failed or was abandoned. */
  | "missing"
  /** Provided, then deleted from the Admin Panel. */
  | "deleted";

export function panStatus(c: PanInput): PanStatus {
  if (currentPanDocument(c.documents, "panFront")) return "provided";
  if (c.panDeletedAt) return "deleted";
  if (c.panAnswer === "no") return "no";
  if (c.panAnswer === "yes") return "missing";
  return "not_asked";
}

/* ------------------------------------------------------------------------ */
/* GSTIN                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * The Goods and Services Tax Identification Number: 15 characters —
 * a 2-digit state code, the holder's 10-character PAN, an entity number, the
 * letter Z, and a check character computed from the other fourteen.
 */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** What somebody typed, tidied: capitals, no spaces or dashes. */
export function normaliseGstin(raw: unknown): string {
  return typeof raw === "string" ? raw.toUpperCase().replace(/[\s-]/g, "") : "";
}

/** The check character the first fourteen characters call for. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = GSTIN_CHARS.indexOf(first14[i]);
    const product = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}

/**
 * A real-looking GSTIN: the right shape, and a check character that matches.
 * The check catches the typing slips a pattern alone lets through — two
 * characters swapped, one mistyped.
 */
export function isValidGstin(raw: unknown): boolean {
  const g = normaliseGstin(raw);
  return GSTIN_RE.test(g) && gstinCheckChar(g.slice(0, 14)) === g[14];
}
