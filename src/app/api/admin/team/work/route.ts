import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import {
  accrueMember,
  addAdjustment,
  addEntry,
  addPayment,
  decideDayOff,
  deleteAdjustment,
  deleteEntry,
  deletePayment,
  editEntry,
  getMember,
  getWork,
} from "@/lib/teamStore";
import { rateOn } from "@/lib/teamHours";
import { WORK_STATUSES, type WorkStatus } from "@/lib/teamShared";
import { bankLabel } from "@/lib/teamView";
import { sendDayOffDecision, sendPaymentEmail } from "@/lib/teamNotify";
import { readDate, readHours, readMoney, readText } from "@/lib/teamValidate";

/**
 * Hours and pay, from the Admin Panel.
 *
 *   edit_entry { id, hours?, rate?, status?, note? }
 *   approve_entry { id }            a "no check-in" day, paid after all
 *   delete_entry { id }             only days added by hand
 *   add_entry { memberId, date, hours, note?, rate? }      extra hours
 *   add_adjustment { memberId, date, amount, reason }     bonus (+) or deduction (−)
 *   delete_adjustment { id }
 *   add_payment { memberId, date, amount, reference?, email? }
 *   delete_payment { id }
 *   decide_dayoff { id, approve, note? }
 */

export const runtime = "nodejs";

const bad = (problem: string) => NextResponse.json({ ok: false, problems: [problem] }, { status: 400 });

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const parsed = await readJsonBody<Record<string, unknown>>(req, 8 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const b = parsed.data;
  const id = typeof b.id === "string" ? b.id : "";
  const member = typeof b.memberId === "string" ? await getMember(b.memberId) : null;

  switch (b.action) {
    case "edit_entry": {
      const hours = b.hours === undefined ? undefined : readHours(b.hours);
      if (hours === null) return bad("Hours must be between 0 and 12.");
      const rate = b.rate === undefined ? undefined : readMoney(b.rate, { min: 0, max: 1000 });
      if (rate === null) return bad("Enter a valid rate.");
      const status = (WORK_STATUSES as readonly unknown[]).includes(b.status) ? (b.status as WorkStatus) : undefined;
      const e = await editEntry(id, { hours, rate, status, note: typeof b.note === "string" ? b.note : undefined }, by);
      return e ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 404 });
    }
    case "approve_entry": {
      const all = await getWork();
      const entry = all.entries.find((e) => e.id === id);
      const owner = entry ? await getMember(entry.memberId) : null;
      if (!entry || !owner) return NextResponse.json({ ok: false }, { status: 404 });
      await editEntry(id, { status: "worked", hours: owner.hoursPerDay }, by);
      return NextResponse.json({ ok: true });
    }
    case "delete_entry": {
      const all = await getWork();
      const entry = all.entries.find((e) => e.id === id);
      if (!entry) return NextResponse.json({ ok: false }, { status: 404 });
      // An automatic day is changed (e.g. to Absent), never deleted: deleting
      // it would let the timer add it again.
      if (entry.source === "auto") return bad("Automatic days cannot be deleted — mark the day Absent instead.");
      await deleteEntry(id);
      return NextResponse.json({ ok: true });
    }
    case "add_entry": {
      if (!member) return bad("Choose the member.");
      const date = readDate(b.date);
      const hours = readHours(b.hours);
      if (!date || !hours) return bad("Choose the day and the hours (up to 12).");
      const rate = b.rate === undefined || b.rate === "" ? rateOn(member.rates, date) : readMoney(b.rate, { min: 0, max: 1000 });
      if (rate === null) return bad("Enter a valid rate.");
      await addEntry({ memberId: member.id, date, hours, rate, status: "extra", note: readText(b.note, 200) }, by);
      return NextResponse.json({ ok: true });
    }
    case "add_adjustment": {
      if (!member) return bad("Choose the member.");
      const date = readDate(b.date);
      const amount = readMoney(b.amount, { min: -100_000, max: 100_000 });
      const reason = readText(b.reason, 200);
      if (!date || !amount || !reason) return bad("Enter the day, the amount (minus for a deduction) and the reason.");
      await addAdjustment({ memberId: member.id, date, amount, reason, by });
      return NextResponse.json({ ok: true });
    }
    case "delete_adjustment":
      return (await deleteAdjustment(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 404 });
    case "add_payment": {
      if (!member) return bad("Choose the member.");
      const date = readDate(b.date);
      const amount = readMoney(b.amount, { min: 0.01, max: 1_000_000 });
      if (!date || !amount) return bad("Enter the day and the amount paid.");
      await accrueMember(member.id);
      const p = await addPayment({
        memberId: member.id,
        date,
        amount,
        reference: readText(b.reference, 100) || undefined,
        sentTo: bankLabel(member.bank),
        by,
      });
      if (p && b.email !== false) await sendPaymentEmail(member, p);
      return NextResponse.json({ ok: true });
    }
    case "delete_payment":
      return (await deletePayment(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 404 });
    case "decide_dayoff": {
      const d = await decideDayOff(id, b.approve === true, by, readText(b.note, 300));
      if (!d) return NextResponse.json({ ok: false }, { status: 404 });
      const owner = await getMember(d.memberId);
      if (owner) await sendDayOffDecision(owner, d);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }
}
