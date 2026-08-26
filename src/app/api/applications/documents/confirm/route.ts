import { NextRequest, NextResponse } from "next/server";
import { addDocument, getCandidate } from "@/lib/store";
import { deleteObject, getObjectBytes, headObject } from "@/lib/r2";
import { scanDocument } from "@/lib/documentScan";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { createHash } from "node:crypto";
import {
  isAllowedForKind,
  isDocumentKind,
  isImageKind,
  maxBytesFor,
  safeFilename,
  type CandidateDocument,
} from "@/lib/documents";
import { findDocumentTwin, flagDuplicate } from "@/lib/store";

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

// Mirrors the presign route: bounded per candidate, with a loose per-IP ceiling
// so applicants sharing a mobile carrier's address do not lock each other out.
// See the comment there for why the two differ.
const PER_CANDIDATE = 20;
const PER_IP = 60;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`doc-confirm:${clientIp(req)}`, PER_IP, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "document-confirm (ip)");

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
  if (typeof key !== "string" || typeof filename !== "string" || !isAllowedForKind(kind, filename)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // The key must be exactly the shape presign issues for this candidate and
  // this kind. Without this, anyone could confirm another candidate's object
  // onto their own record and then read it back through the download route.
  const KEY_RE = new RegExp(`^candidates/${id}/${kind}-[A-Za-z0-9]{1,24}\\.(pdf|docx?|jpe?g|png)$`);
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ ok: false, error: "bad_key" }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Reading the object back is the costly part of this route, so it is counted
  // here — after the key and the candidate have both been checked.
  const perCandidate = rateLimit(`doc-confirm:id:${id}`, PER_CANDIDATE, WINDOW_MS);
  if (!perCandidate.ok) {
    return tooManyRequests(perCandidate.retryAfter, "document-confirm (candidate)");
  }

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
  const maxBytes = maxBytesFor(kind);
  if (head.size > maxBytes) {
    return reject(`The file is larger than ${maxBytes / (1024 * 1024)} MB.`);
  }

  // Read it back and look at it. R2 charges nothing for reads, so inspecting a
  // 2 MB file costs only the moment it takes.
  const bytes = await getObjectBytes(key, maxBytes);
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

  // Hash the stored bytes so a re-application under a new email can be spotted:
  // the same person photographs the same passport.
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const { replacedKey } = await addDocument(
    id,
    record({ key, size: head.size, status: "clean", reason: undefined, sha256 }),
  );
  // Re-uploading replaces the record; the old object would otherwise sit in the
  // bucket forever, paid for and unreachable.
  if (replacedKey && replacedKey !== key) await deleteObject(replacedKey);

  // An identical file already on another candidate is the signal this feature
  // exists for. Flagged for a person to judge, never acted on automatically —
  // two people in one household are not one person applying twice.
  if (isImageKind(kind)) {
    const twin = await findDocumentTwin(id, sha256);
    if (twin) {
      await flagDuplicate(id, twin.id, twin.name);
      // eslint-disable-next-line no-console
      console.warn(`[documents] ${id} ${kind} is byte-identical to ${twin.id} (${twin.name})`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[documents] ${id} ${kind} stored (${head.size} bytes)`);
  return NextResponse.json({ ok: true, status: "clean" });
}
