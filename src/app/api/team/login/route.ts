import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validation";
import { checkLoginCode, describeDevice, issueLoginCode, setMemberCookies } from "@/lib/teamAuth";
import { recordSignIn } from "@/lib/teamStore";
import { sendLoginCode } from "@/lib/teamNotify";

/**
 * Team portal sign-in, in two steps.
 *
 *   POST { action: "code", email }          email a six-digit code
 *   POST { action: "verify", email, code }  check it and sign in
 *
 * The first step answers the same whether or not the address belongs to a
 * member, so the form cannot be used to find out who is on the team.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const parsed = await readJsonBody<{ action?: string; email?: unknown; code?: unknown }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const email = typeof parsed.data.email === "string" ? parsed.data.email.trim() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, problems: ["Enter the email address you applied with."] }, { status: 400 });
  }
  const who = email.toLowerCase();

  if (parsed.data.action === "code") {
    const byIp = rateLimit(`team-code-ip:${ip}`, 10, 15 * 60 * 1000);
    if (!byIp.ok) return tooManyRequests(byIp.retryAfter, "team-code");
    const byEmail = rateLimit(`team-code-email:${who}`, 4, 15 * 60 * 1000);
    if (!byEmail.ok) {
      return NextResponse.json(
        { ok: false, problems: ["Too many codes asked for. Please wait 15 minutes and try again."] },
        { status: 429 },
      );
    }
    const issued = await issueLoginCode(email);
    if (issued) {
      const sent = await sendLoginCode(issued.member, issued.code);
      if (!sent.ok) {
        return NextResponse.json(
          { ok: false, problems: ["We could not send the code just now. Please try again in a minute."] },
          { status: 502 },
        );
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "verify") {
    const byIp = rateLimit(`team-verify-ip:${ip}`, 30, 15 * 60 * 1000);
    if (!byIp.ok) return tooManyRequests(byIp.retryAfter, "team-verify");
    const code = typeof parsed.data.code === "string" ? parsed.data.code.replace(/\D/g, "") : "";
    if (code.length !== 6) {
      return NextResponse.json({ ok: false, problems: ["Enter the 6-digit code from the email."] }, { status: 400 });
    }
    const result = await checkLoginCode(email, code);
    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "This code has expired. Ask for a new one."
          : result.reason === "locked"
            ? "Too many wrong tries. Ask for a new code."
            : "That code is not right. Check the email and try again.";
      return NextResponse.json({ ok: false, reason: result.reason, problems: [message] }, { status: 400 });
    }
    await setMemberCookies(result.member);
    await recordSignIn(result.member.id, ip, describeDevice(req.headers.get("user-agent")));
    // eslint-disable-next-line no-console
    console.log(`[team] ${result.member.id} signed in`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
