import { NextResponse } from "next/server";

/**
 * Formerly: a candidate saying, in their own words, why they live where they
 * live, instead of sending a document.
 *
 * Switched off: the front and back of a residence permit, national ID or
 * driving licence are now required, and the page no longer offers a written
 * answer. Kept as a route so an old page still open in somebody's browser gets
 * a clear refusal rather than a 404. Explanations already given stay on the
 * candidate's record and in the Admin Panel.
 */

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ ok: false, error: "documents_required" }, { status: 410 });
}
