/**
 * SERVER-ONLY. Files in the team portal: screenshots on tickets, and the
 * documents a recruiter shares with a member.
 *
 * Small enough to pass through this server rather than straight to storage,
 * which lets the bytes be checked before they are kept: the file's own first
 * bytes decide its type, never the name or what the browser claimed. Only
 * images on tickets, and PDFs or images as documents.
 */
import { newId } from "@/lib/id";
import { putObject, r2Configured } from "@/lib/r2";
import { MAX_ATTACHMENT_BYTES } from "@/lib/teamShared";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export type SniffedType = "image/png" | "image/jpeg" | "image/webp" | "application/pdf";

export function sniff(b: Uint8Array): SniffedType | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

function cleanName(name: string, type: SniffedType): string {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" }[type];
  const base = name.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9 _-]+/g, "").trim().slice(0, 60) || "file";
  return `${base}.${ext}`;
}

export type StoredFile =
  | { ok: true; key: string; name: string; type: SniffedType; size: number }
  | { ok: false; problem: string };

export async function storeTeamFile(
  memberId: string,
  file: File,
  allow: "image" | "document",
): Promise<StoredFile> {
  if (!r2Configured()) return { ok: false, problem: "File storage is not set up, so files cannot be added." };
  const max = allow === "image" ? MAX_ATTACHMENT_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > max) return { ok: false, problem: `The file is larger than ${Math.round(max / 1024 / 1024)} MB.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > max) return { ok: false, problem: "The file is too large." };
  const type = sniff(bytes);
  if (!type || (allow === "image" && type === "application/pdf")) {
    return {
      ok: false,
      problem: allow === "image" ? "Only PNG, JPG or WebP images can be attached." : "Only PDF or image files can be added.",
    };
  }
  const name = cleanName(file.name || "file", type);
  const key = `team/${memberId}/${newId(10)}-${name}`;
  if (!(await putObject(key, Buffer.from(bytes), type))) {
    return { ok: false, problem: "The file could not be saved. Please try again." };
  }
  return { ok: true, key, name, type, size: bytes.length };
}
