import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { saveMessageTemplate } from "@/lib/messageStore";
import { LENGTH_MAX, TEMPLATE_KEYS, type TemplateKey } from "@/lib/messageTemplates";

export const runtime = "nodejs";

// Save only. The editor and the send dialog both receive the current wording
// from the server render, so there is no read endpoint to keep in step.
export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: { key?: string; body?: unknown; reset?: boolean };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const key = payload.key as TemplateKey;
  if (!TEMPLATE_KEYS.includes(key)) {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 400 });
  }

  if (payload.reset) {
    const result = await saveMessageTemplate(key, null);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  // Reject an oversized body before it reaches the store, so a bad request
  // cannot make us hold a multi-megabyte string in memory.
  if (typeof payload.body !== "string" || payload.body.length > LENGTH_MAX) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const result = await saveMessageTemplate(key, payload.body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
