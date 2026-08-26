/**
 * Candidate documents — the shared model.
 *
 * Pure module: no filesystem, no node built-ins, no SDK. The apply form, the
 * upload routes and the Admin Panel all agree on what a document is from here.
 *
 * Files live in Cloudflare R2, not on the Railway volume. The volume has no
 * backups and already holds the applications themselves; adding every
 * candidate's CV to it would make one disk failure considerably worse.
 */

export const DOCUMENT_KINDS = ["cv", "cover", "certificate", "identity", "selfie"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export function isDocumentKind(v: unknown): v is DocumentKind {
  return typeof v === "string" && (DOCUMENT_KINDS as readonly string[]).includes(v);
}

export const DOCUMENT_LABEL: Record<DocumentKind, string> = {
  cv: "CV / Résumé",
  cover: "Cover letter",
  certificate: "Supporting certificate",
  identity: "ID document",
  selfie: "Photo holding ID",
};

/** Short form for the table chips, where three of them share one cell. */
export const DOCUMENT_SHORT: Record<DocumentKind, string> = {
  cv: "CV",
  cover: "Cover",
  certificate: "Cert",
  identity: "ID",
  selfie: "Photo",
};

/** The identity pair, which the application documents column does not show. */
export const APPLICATION_KINDS = ["cv", "cover", "certificate"] as const;

/**
 * 2 MB is generous for a CV and keeps a thousand applicants inside R2's free
 * tier. It is enforced after the upload lands, not before: the browser talks
 * straight to R2, so the server never sees the bytes on the way past.
 */
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

/**
 * Photographs get more room. 2 MB is generous for a CV and too tight for a
 * phone picture of a passport, which has to stay readable enough to check.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/** Identity images only. A CV is never a photograph and vice versa. */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;
export const IMAGE_MIME = ["image/jpeg", "image/png"] as const;

/** Which kinds are photographs rather than documents. */
export function isImageKind(kind: DocumentKind): boolean {
  return kind === "identity" || kind === "selfie";
}

export function maxBytesFor(kind: DocumentKind): number {
  return isImageKind(kind) ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
}

export function allowedExtensionsFor(kind: DocumentKind): readonly string[] {
  return isImageKind(kind) ? IMAGE_EXTENSIONS : ALLOWED_EXTENSIONS;
}

export function allowedMimeFor(kind: DocumentKind): readonly string[] {
  return isImageKind(kind) ? IMAGE_MIME : ALLOWED_MIME;
}

/** Accepts only what this kind allows, so a CV cannot arrive as a photo. */
export function isAllowedForKind(kind: DocumentKind, filename: string): boolean {
  return allowedExtensionsFor(kind).includes(extensionOf(filename));
}

/** Lowercased extension including the dot, or "" when there isn't one. */
export function extensionOf(filename: string): string {
  const at = filename.lastIndexOf(".");
  return at === -1 ? "" : filename.slice(at).toLowerCase();
}

export function isAllowedExtension(filename: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

export type DocumentStatus =
  /** Passed every check and is downloadable. */
  | "clean"
  /** Failed a check. The file was deleted; the record is kept so the recruiter
   *  knows the candidate tried to send something and what happened to it. */
  | "blocked"
  /** Stored, but a check could not run. Never silently called clean. */
  | "unscanned";

export interface CandidateDocument {
  kind: DocumentKind;
  /** The candidate's own filename. Display only — never used as a path. */
  filename: string;
  size: number;
  uploadedAt: string;
  /** Object key in R2. Absent once a file has been blocked and deleted. */
  key?: string;
  status: DocumentStatus;
  /** Why it was blocked, in words a recruiter can act on. */
  reason?: string;
  /**
   * SHA-256 of the stored bytes.
   *
   * The point of this is the same person applying twice under a new email: an
   * identical hash means an identical file, which for an ID photograph means
   * the same person.
   */
  sha256?: string;
}

/**
 * Strip a filename down to something safe to show and to put in a download
 * header. Never used to build the storage key — that is generated — but a
 * filename still travels into Content-Disposition and into the Admin Panel.
 */
export function safeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "document";
  return (
    base
      // Quotes and semicolons would break out of the Content-Disposition value;
      // control characters would break the header entirely.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f"\\;]/g, "")
      .trim()
      .slice(0, 120) || "document"
  );
}
