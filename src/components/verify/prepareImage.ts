"use client";

/**
 * Getting a photograph off a phone and into a shape worth uploading.
 *
 * Shared by the identity card and the residence-permit card. Written once
 * because the two would drift in exactly the details that matter and that
 * nobody would notice: the metadata stripping, the long edge, and the JPEG
 * quality that decides whether a document number is still readable.
 */

const MAX_EDGE = 2000;

/**
 * Shrink and re-encode a photo in the browser before it is uploaded.
 *
 * Drawing to a canvas and exporting drops every piece of metadata, which is the
 * point: a phone photograph carries the GPS coordinates of wherever the
 * passport was photographed, and there is no reason to hold that. Downscaling
 * also turns a 6 MB picture into a few hundred kilobytes, which on a phone
 * connection is the difference between an upload that finishes and one that
 * does not.
 *
 * Client-side, so a determined person could bypass it. That is acceptable: this
 * is data minimisation, not a security control.
 */
export async function prepareImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    // 0.9 keeps an ID number legible. Lower starts losing small print.
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
