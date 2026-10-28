import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { verifyMemberRequest } from "@/lib/teamAuth";
import { submitBank } from "@/lib/teamStore";
import { BANKS, checkBic, checkIban, isBankId, maskIban } from "@/lib/teamShared";
import { telegramTeam } from "@/lib/teamNotify";

/**
 * A member adds or changes the account they are paid into.
 *
 * Only the banks a recruiter allowed them, a holder name, an IBAN that passes
 * its check digits and a well-formed BIC. Nothing else is accepted — no card
 * numbers, no passwords — and the new account is only used once a recruiter
 * approves it. The recruiters hear about every change on Telegram, because a
 * changed account is how payroll fraud usually starts.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const limit = rateLimit(`team-bank:${member.id}`, 6, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "team-bank");

  const parsed = await readJsonBody<{ bank?: unknown; holder?: unknown; iban?: unknown; bic?: unknown }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const b = parsed.data;

  const problems: string[] = [];
  const bank = isBankId(b.bank) && member.allowedBanks.includes(b.bank) ? b.bank : null;
  if (!bank) problems.push("Choose your bank.");
  const holder = typeof b.holder === "string" ? b.holder.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  if (holder.length < 3) problems.push("Enter the account holder's full name, as the bank shows it.");
  const ibanCheck = checkIban(typeof b.iban === "string" ? b.iban : "");
  if (!ibanCheck.ok) problems.push(ibanCheck.problem);
  const bic = checkBic(typeof b.bic === "string" ? b.bic : "");
  if (!bic) problems.push("Enter a valid BIC / SWIFT code (8 or 11 letters and numbers).");
  if (problems.length || !bank || !ibanCheck.ok || !bic) {
    return NextResponse.json({ ok: false, problems }, { status: 400 });
  }

  const result = await submitBank(member.id, { bank, holder, iban: ibanCheck.iban, bic });
  if (!result.ok) {
    const message = {
      not_found: "Your account could not be found.",
      not_allowed: "Choose one of the banks shown.",
      crypto_unavailable: "Bank details cannot be saved right now. Please try again later.",
      unchanged: "These are already your saved details.",
    }[result.reason];
    // eslint-disable-next-line no-console
    if (result.reason === "crypto_unavailable") console.error("[team] TEAM_BANK_KEY is not set — bank details refused");
    return NextResponse.json({ ok: false, problems: [message] }, { status: result.reason === "unchanged" ? 409 : 400 });
  }

  const changing = !!member.bank;
  telegramTeam(
    changing ? "⚠️" : "🏦",
    changing ? "Bank details changed — waiting for approval" : "Bank details added — waiting for approval",
    member,
    `${BANKS[bank].label} ${maskIban(ibanCheck.iban.slice(0, 2), ibanCheck.iban.slice(-4))}`,
    `/admin/team/${member.id}?tab=bank`,
  );
  // eslint-disable-next-line no-console
  console.log(`[team] ${member.id} submitted bank details (${bank})`);
  return NextResponse.json({ ok: true });
}
