import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import {
  decideBank,
  getMember,
  getMemberByEmail,
  listMembers,
  mutateMember,
  recordInvite,
  revealBank,
  setMemberStatus,
  setRate,
  signOutEverywhere,
} from "@/lib/teamStore";
import { sendBankDecision, sendTeamInvite } from "@/lib/teamNotify";
import { MEMBER_STATUSES, type MemberStatus } from "@/lib/teamShared";
import { readBanks, readDate, readEmail, readHours, readMoney, readPhone, readSchedule, readText } from "@/lib/teamValidate";

/**
 * One member, from the Admin Panel.
 *
 *   update { …fields }          profile, contact, schedule, hours, banks, notes
 *   status { status }           active / paused / left
 *   rate { rate, from }         a new hourly rate from a date
 *   invite                      send the invitation email again
 *   signout                     sign them out of every device
 *   bank_decide { approve, reason? }
 *   bank_reveal { which }       the full IBAN, recorded
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  const member = await getMember(id);
  if (!member) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const parsed = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const b = parsed.data;

  switch (b.action) {
    case "update": {
      const problems: string[] = [];
      const fullName = readText(b.fullName, 120);
      if (!fullName) problems.push("Enter their full name.");
      const loginEmail = readEmail(b.loginEmail);
      if (!loginEmail) problems.push("Enter the personal email they sign in with.");
      else {
        const other = await getMemberByEmail(loginEmail);
        if (other && other.id !== id) problems.push("Someone else on the team already signs in with this email.");
      }
      const workEmail = readEmail(b.workEmail);
      if (workEmail === null) problems.push("The professional email does not look right.");
      else if (workEmail && (await listMembers()).some((x) => x.id !== id && x.workEmail?.toLowerCase() === workEmail.toLowerCase())) {
        problems.push("Another member already has this professional email.");
      }
      const phoneNumber = readPhone(b.phoneNumber);
      if (phoneNumber === null) problems.push("The work phone number does not look right.");
      const personalPhone = readPhone(b.personalPhone);
      if (personalPhone === null) problems.push("The personal phone number does not look right.");
      const schedule = readSchedule(b.schedule, problems);
      const hoursPerDay = readHours(b.hoursPerDay);
      if (!hoursPerDay) problems.push("Enter the hours per work day.");
      const firstWorkDay = readDate(b.firstWorkDay);
      if (!firstWorkDay) problems.push("Choose the first work day.");
      const allowedBanks = readBanks(b.allowedBanks);
      if (!allowedBanks.length) problems.push("Tick at least one bank they can use.");
      if (problems.length || !schedule || !hoursPerDay || !firstWorkDay || !loginEmail) {
        return NextResponse.json({ ok: false, problems }, { status: 400 });
      }
      await mutateMember(id, (m) => {
        m.fullName = fullName;
        m.loginEmail = loginEmail;
        m.workEmail = workEmail || undefined;
        m.phoneNumber = phoneNumber || undefined;
        m.personalPhone = personalPhone || undefined;
        m.position = readText(b.position, 120) || undefined;
        m.country = readText(b.country, 80) || undefined;
        m.schedule = schedule;
        m.hoursPerDay = hoursPerDay;
        // Moving the first day later never removes days already counted.
        m.firstWorkDay = firstWorkDay;
        m.checkInRequired = b.checkInRequired === true;
        m.allowedBanks = allowedBanks;
        m.notes = typeof b.notes === "string" ? b.notes.slice(0, 4000) : m.notes;
      });
      return NextResponse.json({ ok: true });
    }
    case "status": {
      const status = b.status as MemberStatus;
      if (!(MEMBER_STATUSES as readonly string[]).includes(status)) return NextResponse.json({ ok: false }, { status: 400 });
      await setMemberStatus(id, status);
      // Leaving ends access straight away.
      if (status === "left") await signOutEverywhere(id);
      return NextResponse.json({ ok: true });
    }
    case "rate": {
      const rate = readMoney(b.rate, { min: 0.01, max: 1000 });
      const from = readDate(b.from);
      if (!rate || !from) {
        return NextResponse.json({ ok: false, problems: ["Enter the new rate and the day it starts."] }, { status: 400 });
      }
      await setRate(id, rate, from);
      return NextResponse.json({ ok: true });
    }
    case "invite": {
      const sent = await sendTeamInvite(member);
      if (!sent.ok) {
        return NextResponse.json({ ok: false, problems: ["The invitation could not be sent."] }, { status: 502 });
      }
      await recordInvite(id);
      return NextResponse.json({ ok: true });
    }
    case "signout":
      await signOutEverywhere(id);
      return NextResponse.json({ ok: true });
    case "bank_decide": {
      const pending = member.bankPending;
      if (!pending) return NextResponse.json({ ok: false, problems: ["There is nothing waiting."] }, { status: 409 });
      const approve = b.approve === true;
      const reason = readText(b.reason, 300);
      if (!approve && !reason) {
        return NextResponse.json({ ok: false, problems: ["Write the reason the member will see."] }, { status: 400 });
      }
      await decideBank(id, approve, by, reason);
      await sendBankDecision(member, approve, pending, reason);
      // eslint-disable-next-line no-console
      console.log(`[team] ${by} ${approve ? "approved" : "refused"} bank details for ${id}`);
      return NextResponse.json({ ok: true });
    }
    case "bank_reveal": {
      const iban = await revealBank(id, b.which === "pending" ? "pending" : "current", by);
      if (!iban) return NextResponse.json({ ok: false, problems: ["The IBAN could not be read."] }, { status: 409 });
      // eslint-disable-next-line no-console
      console.log(`[team] ${by} viewed the full IBAN of ${id}`);
      return NextResponse.json({ ok: true, iban });
    }
    default:
      return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }
}
