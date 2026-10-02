"use client";

import type { DocumentKind } from "@/lib/documents";

/**
 * Upload one file for a candidate: presign, PUT straight to storage, confirm.
 *
 * The same three steps the identity and residence cards run, as a plain
 * function for callers that manage their own screen state.
 */
export type UploadResult = { ok: true } | { ok: false; message: string };

export async function uploadDocument(
  candidateId: string,
  kind: DocumentKind,
  file: File,
  /** Extra facts about the file, for the record (PAN photos: camera details). */
  extra: { camera?: boolean } = {},
): Promise<UploadResult> {
  try {
    const res = await fetch("/api/applications/documents/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: candidateId,
        kind,
        filename: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    if (res.status === 429) {
      const mins = Math.ceil(Number(res.headers.get("Retry-After") ?? 600) / 60);
      return {
        ok: false,
        message: `Too many attempts. Please wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`,
      };
    }
    const data = (await res.json()) as { ok?: boolean; url?: string; key?: string; error?: string };
    if (!data.ok || !data.url || !data.key) throw new Error(data.error ?? `http_${res.status}`);

    const put = await fetch(data.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error(`storage_${put.status}`);

    const confirm = await fetch("/api/applications/documents/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidateId, kind, key: data.key, filename: file.name, ...extra }),
    });
    const result = (await confirm.json()) as { status?: string; reason?: string };
    if (result.status === "blocked") return { ok: false, message: result.reason ?? "That file was not accepted." };
    if (result.status === "missing") throw new Error("missing");
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[upload] ${kind} failed`, err);
    return { ok: false, message: "Upload failed. Please check your connection and try again." };
  }
}
