import { NextRequest, NextResponse } from "next/server";
import { readCompanyToken } from "@/lib/token";
import { getCandidate, recordCompanyOpened, saveCompanyDetails } from "@/lib/store";
import { acceptedAsCompany, missingCompanyDocs, validateCompanyDetails } from "@/lib/companyDetails";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

/**
 * A candidate's own answer about the company they contract through.
 *
 * Public — there is no session here and there cannot be one. The signed token
 * is the whole authorisation, so everything else is defence: the token is
 * verified before the body is read, the details are validated again on this
 * side because a browser check is a courtesy rather than a control, and the
 * required documents are checked against what is actually in storage rather
 * than against what the page claims to have uploaded.
 *
 * `phase: "opened"` records that they arrived. Called from the browser, never
 * from the server render: mail scanners fetch every link in an email, and
 * counting those would report every candidate as having opened it seconds
 * after it was sent.
 */

export const runtime = "nodejs";

const MAX_PER_IP = 30;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`company:${ip}`, MAX_PER_IP, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, `company from ${ip}`);

  const parsed = await readJsonBody<{
    t?: string;
    phase?: string;
    details?: Record<string, unknown>;
  }>(req, 16 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const token = readCompanyToken(parsed.data.t);
  if (!token.ok) {
    return NextResponse.json({ ok: false, error: token.reason }, { status: 403 });
  }
  const { id } = token.link;

  if (parsed.data.phase === "opened") {
    try {
      await recordCompanyOpened(id);
    } catch {
      /* bookkeeping only */
    }
    return NextResponse.json({ ok: true });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!acceptedAsCompany(candidate)) {
    return NextResponse.json({ ok: false, error: "not_a_company" }, { status: 409 });
  }

  const check = validateCompanyDetails(parsed.data.details ?? {});
  if (!check.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid", problems: check.problems },
      { status: 400 },
    );
  }

  // Against storage, not against the form. The uploads happen separately and
  // land on the record only once they have been fetched back and scanned, so
  // this is the one place that knows whether the paperwork actually arrived.
  const missing = missingCompanyDocs(candidate.documents);
  if (missing.length) {
    return NextResponse.json({ ok: false, error: "missing_documents", missing }, { status: 400 });
  }

  const saved = await saveCompanyDetails(id, check.details);
  if (!saved) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // eslint-disable-next-line no-console
  console.log(`[company] ${id} confirmed ${check.details.companyName}`);
  void sendTelegramMessage(
    `🏢 <b>Company details confirmed</b>\n` +
      `<b>${escapeHtml(candidate.fullName || id)}</b>\n` +
      `${escapeHtml(check.details.companyName)} — EIN ${escapeHtml(check.details.ein)}\n\n` +
      `Ready to review in the Accepted tab.`,
  ).catch(() => {
    /* the record is what matters */
  });

  return NextResponse.json({ ok: true });
}
