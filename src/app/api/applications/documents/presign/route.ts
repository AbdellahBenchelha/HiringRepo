import { NextRequest, NextResponse } from "next/server";
import { getCandidate } from "@/lib/store";
import { presignUpload, r2Configured } from "@/lib/r2";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import {
  ALLOWED_MIME,
  MAX_DOCUMENT_BYTES,
  extensionOf,
  isAllowedExtension,
  isDocumentKind,
} from "@/lib/documents";
import { newId } from "@/lib/id";

/**
 * Issue a short-lived URL the browser uploads one document straight to.
 *
 * The file never passes through this server. That keeps Railway's request
 * limits and this process's memory out of the path entirely, and means a
 * hostile upload is never held in our own address space.
 *
 * What the browser claims here is not trusted. The size and the actual bytes
 * are checked against the stored object in the confirm step, which is where a
 * file is accepted or destroyed.
 */

export const runtime = "nodejs";

// A candidate has three documents to send. Ten attempts in ten minutes leaves
// room for retries and none for using this endpoint to fill the bucket.
const MAX_REQUESTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`doc-presign:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "document-presign");

  if (!r2Configured()) {
    // eslint-disable-next-line no-console
    console.error("[documents] R2 is not configured; upload refused");
    return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  const parsed = await readJsonBody<{
    id?: string;
    kind?: string;
    filename?: string;
    size?: number;
    contentType?: string;
  }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const { id, kind, filename, size, contentType } = parsed.data;

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!isDocumentKind(kind)) {
    return NextResponse.json({ ok: false, error: "bad_kind" }, { status: 400 });
  }
  if (typeof filename !== "string" || !isAllowedExtension(filename)) {
    return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  }
  if (typeof size !== "number" || size <= 0 || size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 400 });
  }
  if (typeof contentType !== "string" || !(ALLOWED_MIME as readonly string[]).includes(contentType)) {
    return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  }

  // Upload only against a real application, so this cannot be used as free
  // anonymous storage.
  const candidate = await getCandidate(id);
  if (!candidate) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // The key is generated, never derived from the candidate's filename — an
  // uploaded name is attacker-controlled and is how path traversal gets in.
  // The real name is kept in the record for display only.
  const key = `candidates/${id}/${kind}-${newId(8)}${extensionOf(filename)}`;

  const url = await presignUpload(key, contentType);
  if (!url) {
    return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, url, key });
}
