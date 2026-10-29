import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { receiveMail } from "@/lib/teamMailInbound";

/**
 * Where the Cloudflare Email Worker (mail-worker/) posts every email sent to
 * @workroute.team: the raw message as it arrived, the address it was
 * delivered to in `x-envelope-to`, and the shared secret in `x-mail-secret`.
 *
 *   TEAM_MAIL_INBOUND_SECRET — the same long random value in Railway and in
 *                              the worker's settings.
 */

export const runtime = "nodejs";

/** Cloudflare accepts messages up to 25 MB. */
const MAX_BYTES = 26 * 1024 * 1024;

function secretOk(given: string | null): boolean {
  const want = process.env.TEAM_MAIL_INBOUND_SECRET?.trim();
  if (!want || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!process.env.TEAM_MAIL_INBOUND_SECRET?.trim()) {
    // eslint-disable-next-line no-console
    console.error("[mail] TEAM_MAIL_INBOUND_SECRET is not set — incoming mail refused");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (!secretOk(req.headers.get("x-mail-secret"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }
  const raw = await req.arrayBuffer();
  if (raw.byteLength > MAX_BYTES) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  if (!raw.byteLength) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  try {
    const result = await receiveMail(raw, req.headers.get("x-envelope-to") ?? "");
    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[mail] could not file an incoming email:", err);
    // A 5xx lets the worker report a temporary failure, so the sender retries.
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
