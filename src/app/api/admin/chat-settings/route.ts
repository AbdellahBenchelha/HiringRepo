import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { getChatSettings, saveChatSettings } from "@/lib/chatStore";
import { DEFAULT_HOURS, DEFAULT_QUESTIONS, cleanSettings } from "@/lib/chat";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/** Saved questions and the hours line for the live chat. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, settings: await getChatSettings() });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const parsed = await readJsonBody<{ questions?: unknown; hours?: unknown; reset?: unknown }>(req, 64 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const input = parsed.data.reset === true ? { questions: DEFAULT_QUESTIONS, hours: DEFAULT_HOURS } : parsed.data;
  const clean = cleanSettings(input);
  if ("error" in clean) return NextResponse.json({ ok: false, error: clean.error }, { status: 400 });
  const saved = await saveChatSettings(clean);
  return NextResponse.json({ ok: true, settings: { ...saved, isDefault: false } });
}
