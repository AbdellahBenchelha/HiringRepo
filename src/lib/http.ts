/**
 * SERVER-ONLY request helpers shared by the API routes.
 */

/** Default cap for a JSON request body. Applications are the largest payload. */
export const DEFAULT_MAX_BODY_BYTES = 128 * 1024; // 128 KB

export type ReadBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "too_large" | "invalid_json" };

/**
 * Read and parse a JSON body with a hard size cap.
 *
 * Content-Length is checked first so an oversized upload is rejected before it
 * is buffered. That header is client-supplied and can lie, so the decoded body
 * is measured again afterwards.
 */
export async function readJsonBody<T>(
  req: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<ReadBodyResult<T>> {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

/** Map a failed read onto the right status: 413 for size, 400 for bad JSON. */
export function badBodyResponse(reason: "too_large" | "invalid_json"): Response {
  const status = reason === "too_large" ? 413 : 400;
  return new Response(JSON.stringify({ ok: false, error: reason }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
