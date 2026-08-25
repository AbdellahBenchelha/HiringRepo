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

export const DOCUMENT_KINDS = ["cv", "cover", "certificate"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export function isDocumentKind(v: unknown): v is DocumentKind {
  return typeof v === "string" && (DOCUMENT_KINDS as readonly string[]).includes(v);
}

export const DOCUMENT_LABEL: Record<DocumentKind, string> = {
  cv: "CV / Résumé",
  cover: "Cover letter",
  certificate: "Supporting certificate",
};

/** Short form for the table chips, where three of them share one cell. */
export const DOCUMENT_SHORT: Record<DocumentKind, string> = {
  cv: "CV",
  cover: "Cover",
  certificate: "Cert",
};

/**
 * 2 MB is generous for a CV and keeps a thousand applicants inside R2's free
 * tier. It is enforced after the upload lands, not before: the browser talks
 * straight to R2, so the server never sees the bytes on the way past.
 */
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

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
