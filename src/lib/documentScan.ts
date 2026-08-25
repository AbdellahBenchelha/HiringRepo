/**
 * SERVER-ONLY malware screening for uploaded candidate documents.
 *
 * Two layers, both operating on the bytes actually stored rather than on what
 * the browser claimed:
 *
 *   1. File signature — the first bytes decide the type. An .exe renamed to
 *      .pdf passes an extension check and a MIME check, because both come from
 *      the client and both are one line to forge.
 *
 *   2. Structure — you accept PDF, DOC and DOCX, which narrows the realistic
 *      threat to two things: macros in Office files, and JavaScript or launch
 *      actions in PDFs. A CV has no legitimate reason to contain either.
 *
 * This is not an antivirus engine and does not pretend to be one. It stops the
 * documents that actually arrive in recruitment inboxes — macro droppers and
 * disguised executables — at no cost and in milliseconds. A determined attacker
 * who compresses a PDF's object streams can hide a /JavaScript key from a byte
 * scan. That is what a real engine is for: set CLAMAV_HOST and the scan gains
 * a third layer without any of this changing.
 *
 * Nothing here sends the file anywhere. Uploading a candidate's CV to a public
 * scanning service would publish their name, address and phone number to
 * whoever subscribes to that service's feed.
 */
import { extensionOf } from "@/lib/documents";

export type ScanVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/** Longest signature we compare, so callers know how few bytes to fetch. */
export const SIGNATURE_BYTES = 8;

const SIGNATURES: { ext: string; magic: number[]; label: string }[] = [
  { ext: ".pdf", magic: [0x25, 0x50, 0x44, 0x46], label: "PDF" }, // %PDF
  // .docx is a zip. "PK\x03\x04" is a populated archive; the other PK variants
  // mean empty or spanned, neither of which is a real document.
  { ext: ".docx", magic: [0x50, 0x4b, 0x03, 0x04], label: "DOCX" },
  // Legacy .doc is an OLE2 compound file.
  { ext: ".doc", magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], label: "DOC" },
];

/** "VBA" as it appears inside a UTF-16LE name: V\x00B\x00A\x00. */
function utf16le(s: string): string {
  return [...s].map((c) => c + "\u0000").join("");
}

function startsWith(buf: Uint8Array, magic: number[]): boolean {
  if (buf.length < magic.length) return false;
  return magic.every((b, i) => buf[i] === b);
}

/**
 * Layer 1. Does the content match the extension the candidate gave it?
 *
 * A .doc that is really a zip is rejected rather than quietly re-typed: if the
 * two disagree, someone is either confused or trying something.
 */
export function checkSignature(bytes: Uint8Array, filename: string): ScanVerdict {
  const ext = extensionOf(filename);
  const expected = SIGNATURES.find((s) => s.ext === ext);
  if (!expected) return { ok: false, reason: "File type not accepted." };

  if (startsWith(bytes, expected.magic)) return { ok: true };

  const actual = SIGNATURES.find((s) => startsWith(bytes, s.magic));
  return {
    ok: false,
    reason: actual
      ? `Named ${ext} but the file is actually a ${actual.label}.`
      : `Named ${ext} but the contents are not a ${expected.label}.`,
  };
}

/**
 * PDF keys that make a document act rather than display.
 *
 * /OpenAction is deliberately absent. It is common in ordinary PDFs, where it
 * only sets the opening zoom or page, so rejecting it would block real CVs.
 * The dangerous case is /OpenAction pointing at JavaScript — and the
 * JavaScript itself is caught below.
 */
const PDF_DANGEROUS = [
  { re: /\/JavaScript[\s/<[(]/, reason: "contains embedded JavaScript" },
  { re: /\/JS[\s/<[(]/, reason: "contains embedded JavaScript" },
  { re: /\/Launch[\s/<[(]/, reason: "can launch an external program" },
  { re: /\/EmbeddedFile[\s/<[(]/, reason: "has another file embedded inside it" },
  { re: /\/RichMedia[\s/<[(]/, reason: "contains embedded rich media" },
];

/**
 * Layer 2. Structure.
 *
 * Byte scanning rather than parsing: these markers are stored as plain text in
 * both formats — a zip keeps its entry names uncompressed in the central
 * directory, and a PDF's keys sit in the object dictionaries — so a parser
 * would buy accuracy we do not need at a cost in dependencies and in new
 * attack surface. Parsing hostile files is itself a way to get exploited.
 */
export function checkStructure(bytes: Uint8Array, filename: string): ScanVerdict {
  const ext = extensionOf(filename);
  // latin1 maps every byte to one character, so byte offsets survive and no
  // sequence is mangled the way utf8 decoding would mangle it.
  const text = Buffer.from(bytes).toString("latin1");

  if (ext === ".pdf") {
    for (const { re, reason } of PDF_DANGEROUS) {
      if (re.test(text)) return { ok: false, reason: `This PDF ${reason}.` };
    }
    return { ok: true };
  }

  if (ext === ".docx") {
    // A macro-enabled document is a .docm; renaming it to .docx changes
    // nothing inside, and vbaProject.bin is still listed in the archive.
    if (text.includes("vbaProject.bin")) {
      return { ok: false, reason: "This document contains macros." };
    }
    return { ok: true };
  }

  if (ext === ".doc") {
    // OLE stores directory entry names as UTF-16LE, so "VBA" sits in the file
    // with a null byte after every character. Checked in both encodings: the
    // entry names are wide, the stream data around them is not.
    const macro = ["_VBA_PROJECT", "VBA", "Macros"].some(
      (m) => text.includes(m) || text.includes(utf16le(m)),
    );
    if (macro) return { ok: false, reason: "This document contains macros." };
    return { ok: true };
  }

  return { ok: false, reason: "File type not accepted." };
}

/** Both layers, in the order that costs least. */
export function scanDocument(bytes: Uint8Array, filename: string): ScanVerdict {
  const sig = checkSignature(bytes, filename);
  if (!sig.ok) return sig;
  return checkStructure(bytes, filename);
}
