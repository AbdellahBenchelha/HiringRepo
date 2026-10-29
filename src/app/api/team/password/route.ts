import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { verifyMemberRequest, setMemberCookies } from "@/lib/teamAuth";
import { getMember, setOwnPassword } from "@/lib/teamStore";
import { bankCryptoReady } from "@/lib/teamCrypto";
import { encryptPassword, passwordMatches, passwordProblem, decryptPassword } from "@/lib/teamPassword";
import { sendPasswordChanged } from "@/lib/teamNotify";

/**
 * A member sets their own password.
 *
 *   POST { password, confirm, current? }
 *
 * On a temporary password `current` is not needed; otherwise the current
 * password must be given and must match. Changing it signs out every other
 * device, so this one is given a fresh cookie.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!bankCryptoReady()) {
    return NextResponse.json({ ok: false, problems: ["Passwords are not set up yet."] }, { status: 503 });
  }

  const parsed = await readJsonBody<{ password?: unknown; confirm?: unknown; current?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const password = typeof parsed.data.password === "string" ? parsed.data.password : "";
  const confirm = typeof parsed.data.confirm === "string" ? parsed.data.confirm : "";
  const current = typeof parsed.data.current === "string" ? parsed.data.current : "";
  const changing = !member.mustChangePassword;

  // Changing an existing password needs the current one.
  if (changing) {
    if (!current || !passwordMatches(member.password, current)) {
      return NextResponse.json({ ok: false, problems: ["Your current password is not right."] }, { status: 400 });
    }
  }

  const old = decryptPassword(member.password) ?? undefined;
  const problem = passwordProblem(password, old);
  if (problem) return NextResponse.json({ ok: false, problems: [problem] }, { status: 400 });
  if (password !== confirm) {
    return NextResponse.json({ ok: false, problems: ["The two passwords do not match."] }, { status: 400 });
  }

  const enc = encryptPassword(password);
  if (!enc) return NextResponse.json({ ok: false, problems: ["Could not save the password."] }, { status: 500 });

  const updated = await setOwnPassword(member.id, enc);
  if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  // setOwnPassword raised the session version; keep this device signed in.
  await setMemberCookies(updated);

  if (changing) {
    const fresh = await getMember(member.id);
    if (fresh) await sendPasswordChanged(fresh);
  }
  // eslint-disable-next-line no-console
  console.log(`[team] ${member.id} ${changing ? "changed" : "set"} their password`);
  return NextResponse.json({ ok: true });
}
