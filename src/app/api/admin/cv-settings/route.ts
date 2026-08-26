import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { saveCvSettings } from "@/lib/cvStore";

/** Save which countries must attach a CV. */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { countries?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!Array.isArray(body.countries) || body.countries.some((c) => typeof c !== "string")) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const result = await saveCvSettings(body.countries as string[]);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
