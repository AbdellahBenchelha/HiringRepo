import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import { getCandidate, recordCompanyCheck } from "@/lib/store";
import { findOfficerMatches } from "@/lib/companiesHouse";
import { searchNameFor, type CompanyCheck } from "@/lib/companyCheck";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * Look a candidate up in the UK register of company officers.
 *
 * Deliberately on demand rather than on every application. Running a check on
 * everyone who applies would spend requests on people nobody will ever hire,
 * and turns a lookup a recruiter chose to make into a background check on
 * every applicant — a different thing to explain, and a worse one.
 *
 * The result is stored so re-opening a profile does not repeat the lookup, and
 * timestamped because the register changes.
 */

export const runtime = "nodejs";

/**
 * The register allows far more than this; the limit is about us — a button
 * that can be held down should not be able to spend a shared quota.
 *
 * Raised from 60 for the page-at-a-time scan, which calls this once per
 * visible row: at a hundred rows a page, 60 would stop a single scan halfway
 * through. Three full pages in ten minutes is more than anyone reviews by
 * hand, and still catches a loop that has run away.
 */
const MAX_PER_IP = 300;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const ip = clientIp(req);
  const limit = rateLimit(`company-check:${ip}`, MAX_PER_IP, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, `company-check from ${ip}`);

  const session = await getAdminSession();
  const { id } = await ctx.params;

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const searchedName = searchNameFor(candidate);
  if (!searchedName) {
    return NextResponse.json({ ok: false, error: "no_name" }, { status: 400 });
  }

  // The date of birth is what turns a name search into something usable. Its
  // absence does not stop the check, but it changes what the result means, and
  // that is recorded rather than glossed over.
  const usedDob = candidate.dob || candidate.confirmedDetails?.dob || undefined;

  const found = await findOfficerMatches(searchedName, usedDob);

  const check: CompanyCheck = found.ok
    ? {
        checkedAt: new Date().toISOString(),
        searchedName,
        usedDob,
        totalNameHits: found.total,
        matches: found.matches,
      }
    : {
        checkedAt: new Date().toISOString(),
        searchedName,
        usedDob,
        totalNameHits: 0,
        matches: [],
        error: found.reason,
      };

  await recordCompanyCheck(id, check);

  // eslint-disable-next-line no-console
  console.log(
    `[company-check] ${id} "${searchedName}" by ${session?.u ?? "admin"}: ` +
      (found.ok ? `${found.matches.length} match(es) of ${found.total} name hit(s)` : found.reason),
  );

  return NextResponse.json({ ok: true, check });
}
