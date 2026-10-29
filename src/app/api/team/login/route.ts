import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validation";
import { canSignIn, describeDevice, setMemberCookies } from "@/lib/teamAuth";
import {
  getMemberByWorkEmail,
  recordPasswordFailure,
  recordSignIn,
  resetPasswordFailures,
} from "@/lib/teamStore";
import { bankCryptoReady } from "@/lib/teamCrypto";
import { passwordMatches, PASSWORD_MAX_TRIES, PASSWORD_LOCK_MS } from "@/lib/teamPassword";

/**
 * Team portal sign-in with a professional email and a password.
 *
 *   POST { email, password }
 *
 * The answer is the same whether the email is unknown or the password is
 * wrong, so the form cannot be used to find out who is on the team. An account
 * is locked for a while after several wrong tries. There is no self-service
 * reset: a member who forgets asks a recruiter, who can read and resend it.
 */

export const runtime = "nodejs";

const GENERIC = "That email or password is not right.";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!bankCryptoReady()) {
    return NextResponse.json(
      { ok: false, problems: ["Sign-in is not set up yet. Please contact your manager."] },
      { status: 503 },
    );
  }

  const parsed = await readJsonBody<{ email?: unknown; password?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const email = typeof parsed.data.email === "string" ? parsed.data.email.trim() : "";
  const password = typeof parsed.data.password === "string" ? parsed.data.password : "";
  if (!isValidEmail(email) || !password) {
    return NextResponse.json({ ok: false, problems: ["Enter your professional email and password."] }, { status: 400 });
  }

  const byIp = rateLimit(`team-login-ip:${ip}`, 30, 15 * 60 * 1000);
  if (!byIp.ok) return tooManyRequests(byIp.retryAfter, "team-login");

  const member = await getMemberByWorkEmail(email);

  // No such member, no password yet, or they have left: one generic answer.
  if (!member || !member.password || !canSignIn(member)) {
    return NextResponse.json({ ok: false, problems: [GENERIC] }, { status: 400 });
  }

  // Locked after too many wrong tries.
  if (member.passwordLockedUntil && Date.now() < Date.parse(member.passwordLockedUntil)) {
    const mins = Math.max(1, Math.ceil((Date.parse(member.passwordLockedUntil) - Date.now()) / 60000));
    return NextResponse.json(
      { ok: false, problems: [`Too many wrong tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`] },
      { status: 429 },
    );
  }

  // A temporary password that was never changed in time no longer works.
  if (member.mustChangePassword && member.tempPasswordExpiry && Date.now() > Date.parse(member.tempPasswordExpiry)) {
    return NextResponse.json(
      { ok: false, problems: ["Your temporary password has expired. Please ask your manager to send it again."] },
      { status: 400 },
    );
  }

  if (!passwordMatches(member.password, password)) {
    const after = await recordPasswordFailure(member.id, PASSWORD_MAX_TRIES, PASSWORD_LOCK_MS);
    if (after?.passwordLockedUntil && Date.now() < Date.parse(after.passwordLockedUntil)) {
      return NextResponse.json(
        { ok: false, problems: ["Too many wrong tries. Your account is locked for 15 minutes."] },
        { status: 429 },
      );
    }
    return NextResponse.json({ ok: false, problems: [GENERIC] }, { status: 400 });
  }

  await resetPasswordFailures(member.id);
  await setMemberCookies(member);
  await recordSignIn(member.id, ip, describeDevice(req.headers.get("user-agent")));
  // eslint-disable-next-line no-console
  console.log(`[team] ${member.id} signed in`);
  return NextResponse.json({ ok: true, mustChange: member.mustChangePassword === true });
}
