/**
 * SERVER-ONLY object storage for candidate documents (Cloudflare R2).
 *
 * Configure in the host's environment:
 *   R2_ACCOUNT_ID         — the long id in your R2 S3 endpoint URL
 *   R2_ACCESS_KEY_ID      — from an R2 API token scoped to this bucket alone
 *   R2_SECRET_ACCESS_KEY  — shown once when the token is created
 *   R2_BUCKET             — e.g. workroute-documents
 *
 * R2 speaks S3, so this is the ordinary AWS SDK pointed at a different
 * endpoint. If you ever move to Backblaze B2 or S3 itself, only the endpoint
 * changes.
 *
 * The bucket is private and stays private. Nothing here ever returns a durable
 * URL — downloads are signed links that expire in minutes, so a link that
 * leaks is worthless by the time anyone finds it.
 *
 * If R2 is not configured, every call reports it rather than throwing. An
 * application must still succeed when document storage is down; a CV is
 * optional and losing one must never cost us the candidate.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Long enough to pick a file and upload it, short enough to be worthless. */
const UPLOAD_URL_TTL = 5 * 60;
const DOWNLOAD_URL_TTL = 5 * 60;

let cached: S3Client | null = null;

function config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function r2Configured(): boolean {
  return config() !== null;
}

function client() {
  const cfg = config();
  if (!cfg) return null;
  if (!cached) {
    cached = new S3Client({
      // R2 has no regions; "auto" is what it expects.
      region: "auto",
      endpoint:
        process.env.R2_ENDPOINT?.trim() ||
        `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      // R2's S3 endpoint is path-style: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>.
      // Virtual-hosted style would put the bucket in the hostname, which R2
      // does not serve.
      forcePathStyle: true,
      // R2 ignores checksum trailers that recent SDK versions add by default,
      // and rejects the request rather than ignoring the header.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return cached;
}

function bucket(): string {
  return config()?.bucket ?? "";
}

/**
 * A signed URL the browser can PUT one file to.
 *
 * Only the content type is signed, not the length. Browsers set Content-Length
 * themselves and signing it makes the upload fail in ways that are miserable to
 * diagnose; the real size is checked against the stored object afterwards
 * instead, and anything over the limit is deleted. The window is five minutes
 * and the key is fixed, so the worst a stolen URL buys is one overwrite of one
 * object that is about to be validated anyway.
 */
export async function presignUpload(key: string, contentType: string): Promise<string | null> {
  const c = client();
  if (!c) return null;
  return getSignedUrl(
    c,
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL },
  );
}

/**
 * A signed URL that downloads one file under its original name.
 *
 * R2 applies the disposition and content type itself, so the bytes never pass
 * through our server. "attachment" plus nosniff means the browser saves the
 * file rather than rendering it — a hostile document cannot execute in the
 * recruiter's tab on its way past.
 */
export async function presignDownload(key: string, filename: string): Promise<string | null> {
  const c = client();
  if (!c) return null;
  return getSignedUrl(
    c,
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: "application/octet-stream",
    }),
    { expiresIn: DOWNLOAD_URL_TTL },
  );
}

/**
 * A signed URL that displays one file in the browser instead of saving it.
 *
 * The deliberate opposite of presignDownload, and only ever used for PDFs.
 * Two things make rendering acceptable here rather than reckless: the file has
 * already passed the scanner, which rejects PDFs carrying JavaScript, launch
 * actions or embedded files; and it is served from the storage origin, not
 * ours, so nothing inside it shares an origin with the Admin Panel or its
 * session cookie.
 *
 * Word documents are never served this way. No browser renders them, so the
 * best case is a download prompt appearing where a preview was promised.
 */
export async function presignView(key: string, filename: string): Promise<string | null> {
  const c = client();
  if (!c) return null;
  return getSignedUrl(
    c,
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `inline; filename="${filename}"`,
      ResponseContentType: "application/pdf",
    }),
    { expiresIn: DOWNLOAD_URL_TTL },
  );
}

export async function headObject(
  key: string,
): Promise<{ size: number; contentType?: string } | null> {
  const c = client();
  if (!c) return null;
  try {
    const res = await c.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch {
    return null;
  }
}

/**
 * Read an object back for scanning.
 *
 * Capped so a large object cannot be pulled into memory: the caller has already
 * checked the size, and this is the second line of that defence rather than the
 * first. R2 charges nothing for reads, so fetching a 2 MB file to inspect it is
 * free in every sense that matters.
 */
export async function getObjectBytes(key: string, maxBytes: number): Promise<Uint8Array | null> {
  const c = client();
  if (!c) return null;
  try {
    const res = await c.send(
      new GetObjectCommand({ Bucket: bucket(), Key: key, Range: `bytes=0-${maxBytes - 1}` }),
    );
    const body = res.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
    if (!body?.transformToByteArray) return null;
    return await body.transformToByteArray();
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<boolean> {
  const c = client();
  if (!c) return false;
  try {
    await c.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[r2] could not delete ${key}:`, err);
    return false;
  }
}

/** Best effort — one failure must not stop the rest being removed. */
export async function deleteObjects(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => deleteObject(k)));
}
