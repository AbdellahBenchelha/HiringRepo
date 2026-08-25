import { NextRequest, NextResponse } from "next/server";
import { addDocument, getCandidate } from "@/lib/store";
import { deleteObject, getObjectBytes, headObject } from "@/lib/r2";
import { scanDocument } from "@/lib/documentScan";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import {
  MAX_DOCUMENT_BYTES,
  isDocumentKind,
  isAllowedExtension,
  safeFilename,
  type CandidateDocument,
} from "@/lib/documents";

/**
 * Accept or destroy an uploaded document.
 *
 * This is where a file is actually judged, because it is the first point at
 * which the bytes exist somewhere we control. Everything the browser said in
 * the presign step was a claim; this step reads the object back and checks it.
 *
 * A rejected file is deleted from R2 immediately, and the record kept without a
 * key — the recruiter should be able to see that a candidate sent something and
 * why it never arrived, rather than wondering where the CV went.
 *
 * Always answers ok to the browser. The candidate's application is already
 * submitted and their CV was optional; failing their application over a
 * document that could not be stored would cost us a candidate to save a file.
 */

export const runtime = "nodejs";

const MAX_REQUESTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`doc-confirm:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "document-confirm");

  const parsed = await readJsonBody<{
    id?: string;
    kind?: string;
    key?: string;
    filename?: string;
  }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const { id, kind, key, filename } = parsed.data;
  // Ids are base62. Checked for shape before use because it is interpolated
  // into the key pattern below, where ".*" would otherwise match every
  // candidate's objects rather than this one's.
  if (typeof id !== "string" || !/^[A-Za-z0-9]{1,32}$/.test(id) || !isDocumentKind(kind)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (typeof key !== "string" || typeof filename !== "string" || !isAllowedExtension(filename)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // The key must be exactly the shape presign issues for this candidate and
  // this kind. Without this, anyone could confirm another candidate's object
  // onto their own record and then read it back through the download route.
  const KEY_RE = new RegExp(`^candidates/${id}/${kind}-[A-Za-z0-9]{1,24}\\.(pdf|docx?)$`);
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ ok: false, error: "bad_key" }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const name = safeFilename(filename);
  const record = (extra: Partial<CandidateDocument>): CandidateDocument => ({
    kind,
    filename: name,
    size: 0,
    uploadedAt: new Date().toISOString(),
    status: "blocked",
    ...extra,
  });

  const reject = async (reason: string) => {
    await deleteObject(key);
    await addDocument(id, record({ status: "blocked", reason }));
    // eslint-disable-next-line no-console
    console.warn(`[documents] ${id} ${kind} rejected: ${reason}`);
    return NextResponse.json({ ok: true, status: "blocked", reason });
  };

  // Did the upload actually happen, and is it the size it claimed to be?
  const head = await headObject(key);
  if (!head) return NextResponse.json({ ok: true, status: "missing" });
  if (head.size === 0) return reject("The file was empty.");
  if (head.size > MAX_DOCUMENT_BYTES) {
    return reject(`The file is larger than ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB.`);
  }

  // Read it back and look at it. R2 charges nothing for reads, so inspecting a
  // 2 MB file costs only the moment it takes.
  const bytes = await getObjectBytes(key, MAX_DOCUMENT_BYTES);
  if (!bytes) {
    // Storage answered but would not hand the file back. Keep it — it may be
    // perfectly fine — and mark it so nobody mistakes it for checked.
    await addDocument(
      id,
      record({ key, size: head.size, status: "unscanned", reason: "Could not be read for scanning." }),
    );
    return NextResponse.json({ ok: true, status: "unscanned" });
  }

  const verdict = scanDocument(bytes, name);
  if (!verdict.ok) return reject(verdict.reason);

  const { replacedKey } = await addDocument(
    id,
    record({ key, size: head.size, status: "clean", reason: undefined }),
  );
  // Re-uploading replaces the record; the old object would otherwise sit in the
  // bucket forever, paid for and unreachable.
  if (replacedKey && replacedKey !== key) await deleteObject(replacedKey);

  // eslint-disable-next-line no-console
  console.log(`[documents] ${id} ${kind} stored (${head.size} bytes)`);
  return NextResponse.json({ ok: true, status: "clean" });
}
