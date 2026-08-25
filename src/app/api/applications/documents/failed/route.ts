import { NextRequest, NextResponse } from "next/server";
import { addDocument, getCandidate } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { isDocumentKind, safeFilename } from "@/lib/documents";

/**
 * Record that a document the candidate attached never made it to storage.
 *
 * Without this, an upload blocked by a security policy, a missing CORS rule or
 * an unconfigured bucket is indistinguishable in the Admin Panel from a
 * candidate who attached nothing at all — which is precisely the failure this
 * whole feature was built to end.
 *
 * The reason is composed by the browser and is not trusted: it is mapped to one
 * of a fixed set of messages here, so nothing a client sends is ever rendered
 * back to a recruiter verbatim.
 */

export const runtime = "nodejs";

const MAX_REQUESTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`doc-failed:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "document-failed");

  const parsed = await readJsonBody<{
    id?: string;
    kind?: string;
    filename?: string;
    reason?: string;
  }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const { id, kind, filename, reason } = parsed.data;
  if (typeof id !== "string" || !/^[A-Za-z0-9]{1,32}$/.test(id) || !isDocumentKind(kind)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Never store a client-supplied sentence. Keep the shape of what went wrong.
  const raw = typeof reason === "string" ? reason : "";
  const detail = /HTTP 40[13]/.test(raw)
    ? "Storage rejected the upload — the bucket may not allow uploads from this site."
    : /upload URL/.test(raw)
      ? "Storage was unavailable when the application was sent."
      : "The browser could not reach storage.";

  await addDocument(id, {
    kind,
    filename: safeFilename(typeof filename === "string" ? filename : "document"),
    size: 0,
    uploadedAt: new Date().toISOString(),
    status: "blocked",
    reason: `Upload failed — ${detail}`,
  });

  // eslint-disable-next-line no-console
  console.error(`[documents] ${id} ${kind} upload failed: ${raw.slice(0, 120)}`);
  return NextResponse.json({ ok: true });
}
