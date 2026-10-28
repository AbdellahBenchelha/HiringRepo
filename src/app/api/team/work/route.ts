import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { verifyMemberRequest } from "@/lib/teamAuth";
import { cancelDayOff, recordCheckIn, requestDayOff } from "@/lib/teamStore";
import { checkInDay, localDate } from "@/lib/teamHours";
import { addDays, dayKeyOf, formatDay } from "@/lib/teamShared";
import { telegramTeam } from "@/lib/teamNotify";

/**
 * The member's side of their hours.
 *
 *   checkin                    "Start work" for today's window
 *   dayoff { date, reason }    ask for one of their work days off
 *   cancel_dayoff { id }       withdraw a request not yet answered
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody<{ action?: string; date?: unknown; reason?: unknown; id?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  if (member.status !== "active") {
    return NextResponse.json({ ok: false, problems: ["Your account is paused."] }, { status: 409 });
  }

  if (body.action === "checkin") {
    const day = checkInDay(member.schedule, Date.now());
    if (!day) {
      return NextResponse.json(
        { ok: false, problems: ["You can start work from one hour before your work window opens, on your work days."] },
        { status: 409 },
      );
    }
    await recordCheckIn(member.id, day);
    return NextResponse.json({ ok: true, date: day });
  }

  if (body.action === "dayoff") {
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
    const today = localDate(member.schedule.timeZone);
    const problems: string[] = [];
    if (!date) problems.push("Choose the day.");
    else if (date < today) problems.push("Choose today or a day in the future.");
    else if (date > addDays(today, 180)) problems.push("Choose a day in the next six months.");
    else if (!member.schedule.days.includes(dayKeyOf(date))) problems.push("That day is not one of your work days.");
    if (problems.length) return NextResponse.json({ ok: false, problems }, { status: 400 });
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const r = await requestDayOff(member.id, date, reason);
    if (!r.ok) {
      return NextResponse.json({ ok: false, problems: ["You have already asked for this day."] }, { status: 409 });
    }
    telegramTeam("🌴", "Day off requested", member, `Day: ${formatDay(date)}${reason ? ` — ${reason.slice(0, 120)}` : ""}`, "/admin/team-pay");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "cancel_dayoff") {
    const ok = typeof body.id === "string" && (await cancelDayOff(member.id, body.id));
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
