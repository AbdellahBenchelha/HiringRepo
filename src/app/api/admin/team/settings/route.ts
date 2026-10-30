import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { addAnnouncement, saveTeamSettings, updateAnnouncement } from "@/lib/teamStore";
import { DEFAULT_BANK_NOTICE, MAX_BANK_NOTICE } from "@/lib/teamShared";
import type { PaydaySchedule } from "@/lib/teamShared";
import { readDate } from "@/lib/teamValidate";

/**
 * Team settings and announcements.
 *
 *   settings { payday, rulesText, mailboxUrl, mailboxHelp, bankNotice }
 *   announce { title, body }
 *   announcement { id, active? , remove? }
 */

export const runtime = "nodejs";

function readPayday(v: unknown): PaydaySchedule | null {
  const p = (v ?? {}) as Record<string, unknown>;
  if (p.kind === "weekly" && Number.isInteger(p.weekday) && (p.weekday as number) >= 0 && (p.weekday as number) <= 6) {
    return { kind: "weekly", weekday: p.weekday as number };
  }
  if (p.kind === "biweekly" && readDate(p.anchor)) return { kind: "biweekly", anchor: p.anchor as string };
  if (p.kind === "monthly" && Number.isInteger(p.day) && (p.day as number) >= 1 && (p.day as number) <= 28) {
    return { kind: "monthly", day: p.day as number };
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const parsed = await readJsonBody<Record<string, unknown>>(req, 32 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const b = parsed.data;

  if (b.action === "settings") {
    const payday = readPayday(b.payday);
    if (!payday) return NextResponse.json({ ok: false, problems: ["Choose the payday."] }, { status: 400 });
    const mailboxUrl = typeof b.mailboxUrl === "string" ? b.mailboxUrl.trim().slice(0, 300) : "";
    if (mailboxUrl && !/^https:\/\/[^\s]+$/.test(mailboxUrl)) {
      return NextResponse.json({ ok: false, problems: ["The mailbox link must start with https://"] }, { status: 400 });
    }
    const notice = typeof b.bankNotice === "string" ? b.bankNotice.replace(/\r\n?/g, "\n").trim() : "";
    if (notice.length > MAX_BANK_NOTICE) {
      return NextResponse.json({ ok: false, problems: [`The Bank page note can be at most ${MAX_BANK_NOTICE} characters.`] }, { status: 400 });
    }
    await saveTeamSettings({
      payday,
      // The standard text is kept as "standard", so a later change to it reaches everyone who never edited it.
      bankNotice: notice === DEFAULT_BANK_NOTICE ? "" : notice,
      mailboxUrl,
      rulesText: typeof b.rulesText === "string" ? b.rulesText.slice(0, 20_000) : "",
      mailboxHelp: typeof b.mailboxHelp === "string" ? b.mailboxHelp.slice(0, 2000) : "",
    });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "announce") {
    const title = typeof b.title === "string" ? b.title.replace(/\s+/g, " ").trim().slice(0, 120) : "";
    const body = typeof b.body === "string" ? b.body.trim().slice(0, 2000) : "";
    if (!title) return NextResponse.json({ ok: false, problems: ["Write a title."] }, { status: 400 });
    await addAnnouncement(title, body, by);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "announcement" && typeof b.id === "string") {
    const ok = await updateAnnouncement(b.id, {
      active: typeof b.active === "boolean" ? b.active : undefined,
      remove: b.remove === true,
    });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
