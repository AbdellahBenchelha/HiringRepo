/**
 * The Indian PAN card, offered at acceptance by candidates living in India.
 *
 * Pure, shared by the offer form, the confirm route and the Admin Panel, so
 * the three agree on who is asked and what the answer means.
 *
 * Optional throughout. Having the card on file lets an offer be processed
 * sooner, and that is all: nobody is held up, marked down or chased for not
 * having one, and "No / skip" is an answer, not a gap.
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
