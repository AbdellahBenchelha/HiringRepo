import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { clientIp, isRateLimited, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validation";
import { canSignIn, describeDevice, setMemberCookies } from "@/lib/teamAuth";
import {
  getMemberByWorkEmail,
  recordPasswordFailure,
  recordSignIn,
  resetPasswordFailures,
} from "@/lib/teamStore";
import { bankCryptoReady } from "@/lib/teamCrypto";
import { passwordMatches, PASSWORD_DEVICE_TRIES, PASSWORD_LOCK_MS, PASSWORD_MAX_TRIES } from "@/lib/teamPassword";

/**
 * Team portal sign-in with a professional email and a password.
 *
 *   POST { email, password }
 *
 * The answer is the same whether the email is unknown or the password is
 * wrong, so the form cannot be used to find out who is on the team. Five
 * wrong tries make that device wait 15 minutes; many more from anywhere lock
 * the account. There is no self-service reset: a member who forgets asks a
 * recruiter, who can read and resend it.
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

  // Wrong tries are counted per device (this address from this IP), so the
  // member is slowed down on their own device but a stranger who knows the
  // public address cannot lock them out.
  const deviceKey = `team-login-fail:${email.toLowerCase()}:${ip}`;
  const device = isRateLimited(deviceKey, PASSWORD_DEVICE_TRIES);
  if (!device.ok) {
    const mins = Math.max(1, Math.ceil(device.retryAfter / 60));
    return NextResponse.json(
      { ok: false, problems: [`Too many wrong tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`] },
      { status: 429 },
    );
  }

  const member = await getMemberByWorkEmail(email);
  const failed = () => {
    rateLimit(deviceKey, PASSWORD_DEVICE_TRIES, PASSWORD_LOCK_MS);
    return NextResponse.json({ ok: false, problems: [GENERIC] }, { status: 400 });
  };

  // No such member, no password yet, or they have left: one generic answer.
  if (!member || !member.password || !canSignIn(member)) return failed();

  // The account itself is locked after many wrong tries from anywhere.
  if (member.passwordLockedUntil && Date.now() < Date.parse(member.passwordLockedUntil)) {
    const mins = Math.max(1, Math.ceil((Date.parse(member.passwordLockedUntil) - Date.now()) / 60000));
    return NextResponse.json(
      { ok: false, problems: [`Too many wrong tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`] },
      { status: 429 },
    );
  }

  if (!passwordMatches(member.password, password)) {
    await recordPasswordFailure(member.id, PASSWORD_MAX_TRIES, PASSWORD_LOCK_MS);
    return failed();
  }

  // The right temporary password, but too late: only now say it has expired,
  // so the message does not tell a stranger anything.
  if (member.mustChangePassword && member.tempPasswordExpiry && Date.now() > Date.parse(member.tempPasswordExpiry)) {
    return NextResponse.json(
      { ok: false, problems: ["Your temporary password has expired. Please ask your manager to send it again."] },
      { status: 400 },
    );
  }

  await resetPasswordFailures(member.id);
  await setMemberCookies(member);
  await recordSignIn(member.id, ip, describeDevice(req.headers.get("user-agent")));
  // eslint-disable-next-line no-console
  console.log(`[team] ${member.id} signed in`);
  return NextResponse.json({ ok: true, mustChange: member.mustChangePassword === true });
}
