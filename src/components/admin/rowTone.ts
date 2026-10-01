/**
 * Row colours for the admin candidate tables.
 *
 * Kept under components/ on purpose: Tailwind only generates classes it finds
 * in the folders it scans, and lib/ is not one of them.
 */
import { FULL_VERIFIED, REJECTED } from "@/lib/candidateStatus";

/**
 * The colour a candidate's row wears in the admin tables: red once Rejected
 * (every list), green once Full verified (the Accepted list, which asks for
 * it), the selection tint when ticked, plain otherwise. One place, so the
 * lists agree.
 */
export function rowTone(
  status: string | undefined,
  { selected = false, greenVerified = false }: { selected?: boolean; greenVerified?: boolean } = {},
): string {
  if (status === REJECTED) return "bg-red-50 hover:bg-red-100/70";
  if (greenVerified && status === FULL_VERIFIED) return "bg-emerald-50 hover:bg-emerald-100/70";
  return selected ? "bg-brand-50/60" : "";
}

/**
 * The coloured edge down the left of a red or green row. On the first cell,
 * not the row: browsers do not reliably paint a shadow on a table row.
 */
export function rowEdge(status: string | undefined, greenVerified = false): string {
  if (status === REJECTED) return "shadow-[inset_4px_0_0_0_#dc2626]";
  if (greenVerified && status === FULL_VERIFIED) return "shadow-[inset_4px_0_0_0_#059669]";
  return "";
}

/** The background for a row's sticky Actions cell, so it matches the row. */
export function stickyTone(status: string | undefined, greenVerified = false): string {
  if (status === REJECTED) return "bg-red-50";
  if (greenVerified && status === FULL_VERIFIED) return "bg-emerald-50";
  return "bg-white";
}
