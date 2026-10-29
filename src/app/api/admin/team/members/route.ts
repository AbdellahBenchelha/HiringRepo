import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { getCandidate } from "@/lib/store";
import { createMember, listMembers, recordInvite } from "@/lib/teamStore";
import { sendTeamInvite } from "@/lib/teamNotify";
import { readBanks, readDate, readEmail, readHours, readMoney, readPhone, readSchedule, readText } from "@/lib/teamValidate";

/**
 * Add someone to the team — usually from the Accepted tab, with their offer's
 * schedule, hours and rate filled in — and email them their invitation.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const parsed = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const b = parsed.data;

  const problems: string[] = [];
  const fullName = readText(b.fullName, 120);
  if (!fullName) problems.push("Enter their full name.");
  const loginEmail = readEmail(b.loginEmail);
  if (!loginEmail) problems.push("Enter the personal email they sign in with.");
  const workEmail = readEmail(b.workEmail);
  if (workEmail === null) problems.push("The professional email does not look right.");
  const phoneNumber = readPhone(b.phoneNumber);
  if (phoneNumber === null) problems.push("The work phone number does not look right.");
  const personalPhone = readPhone(b.personalPhone);
  const schedule = readSchedule(b.schedule, problems);
  const hoursPerDay = readHours(b.hoursPerDay);
  if (!hoursPerDay) problems.push("Enter the hours per work day.");
  const rate = readMoney(b.rate, { min: 0.01, max: 1000 });
  if (!rate) problems.push("Enter the hourly rate in US dollars.");
  const firstWorkDay = readDate(b.firstWorkDay);
  if (!firstWorkDay) problems.push("Choose the first work day.");
  const allowedBanks = readBanks(b.allowedBanks);
  if (!allowedBanks.length) problems.push("Tick at least one bank they can use.");
  if (workEmail && (await listMembers()).some((m) => m.workEmail?.toLowerCase() === workEmail.toLowerCase())) {
    problems.push("Another member already has this professional email.");
  }
  if (problems.length || !schedule || !hoursPerDay || !rate || !firstWorkDay || !loginEmail) {
    return NextResponse.json({ ok: false, problems }, { status: 400 });
  }

  const candidateId = typeof b.candidateId === "string" && b.candidateId ? b.candidateId : undefined;
  if (candidateId && !(await getCandidate(candidateId))) {
    return NextResponse.json({ ok: false, problems: ["That candidate no longer exists."] }, { status: 404 });
  }

  const result = await createMember(
    {
      candidateId,
      fullName,
      loginEmail,
      personalPhone: personalPhone || undefined,
      country: readText(b.country, 80) || undefined,
      position: readText(b.position, 120) || undefined,
      workEmail: workEmail || undefined,
      phoneNumber: phoneNumber || undefined,
      schedule,
      hoursPerDay,
      rate,
      firstWorkDay,
      checkInRequired: b.checkInRequired === true,
      allowedBanks,
    },
    by,
  );
  if (!result.ok) {
    const message =
      result.reason === "email_taken"
        ? "Someone on the team already signs in with this email."
        : "This candidate is already on the team.";
    return NextResponse.json({ ok: false, problems: [message] }, { status: 409 });
  }

  let invited = false;
  if (b.sendInvite !== false) {
    const sent = await sendTeamInvite(result.member);
    if (sent.ok) {
      await recordInvite(result.member.id);
      invited = true;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[team] ${by} added ${result.member.id}${invited ? " and sent the invitation" : ""}`);
  return NextResponse.json({ ok: true, id: result.member.id, invited });
}
