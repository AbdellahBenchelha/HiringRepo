import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getCandidate } from "@/lib/store";
import { ssnOf } from "@/lib/ssn";

/**
 * One candidate's Social Security Number, handed over on request.
 *
 * A route of its own rather than a field on the candidate view, because the
 * view is built for every row of every table: putting the number there would
 * send forty SSNs to a browser that renders none of them, and leave them
 * sitting in the page source of any tab left open.
 *
 * So it travels only when a person has asked for one, and the ask is logged.
 * There is no undo for a leak, and "who looked at this, and when" is the only
 * question worth being able to answer afterwards.
 */

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ssn = ssnOf(candidate.application);
  if (!ssn) return NextResponse.json({ ok: false, error: "no_ssn" }, { status: 404 });

  // eslint-disable-next-line no-console
  console.log(`[ssn] ${session.u} viewed the SSN of ${id}`);
  return NextResponse.json(
    { ok: true, ssn },
    // Never cached, anywhere, by anything. The default for a JSON route is
    // already no-store, but this is the one response where relying on a
    // default would be careless.
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } },
  );
}
