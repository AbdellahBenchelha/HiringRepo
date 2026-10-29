import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { clearMemberCookies, verifyMemberRequest } from "@/lib/teamAuth";
import { mutateMember, signOutEverywhere } from "@/lib/teamStore";

/**
 * The small things a member does to their own account.
 *
 *   signout_all            every device, this one included
 *   confirm_profile        getting started: "my details are correct"
 *   mailbox_opened         getting started: "I have opened my mailbox"
 *   rules_read             getting started: "I have read the rules"
 *   dismiss_announcement   hide one announcement, for them only
 *   tour_done              the welcome tour was finished or closed: not shown again by itself
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody<{ action?: string; id?: unknown }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const { action, id } = parsed.data;
  const at = new Date().toISOString();

  switch (action) {
    case "signout_all":
      await signOutEverywhere(member.id);
      await clearMemberCookies();
      return NextResponse.json({ ok: true });
    case "confirm_profile":
    case "mailbox_opened":
    case "rules_read": {
      const key = { confirm_profile: "profileConfirmedAt", mailbox_opened: "mailboxOpenedAt", rules_read: "rulesReadAt" }[
        action
      ] as "profileConfirmedAt" | "mailboxOpenedAt" | "rulesReadAt";
      await mutateMember(member.id, (m) => {
        m.onboarding = { ...(m.onboarding ?? {}), [key]: m.onboarding?.[key] ?? at };
      });
      return NextResponse.json({ ok: true });
    }
    case "tour_done":
      await mutateMember(member.id, (m) => {
        m.onboarding = { ...(m.onboarding ?? {}), tourDoneAt: m.onboarding?.tourDoneAt ?? at };
      });
      return NextResponse.json({ ok: true });
    case "dismiss_announcement":
      if (typeof id !== "string" || !id) return NextResponse.json({ ok: false }, { status: 400 });
      await mutateMember(member.id, (m) => {
        m.dismissedAnnouncements = [...new Set([...(m.dismissedAnnouncements ?? []), id])].slice(-100);
      });
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }
}
