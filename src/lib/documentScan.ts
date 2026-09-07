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
 *   2. Structure — the realistic threat in what we accept is two things:
 *      macros in Office files, and JavaScript or launch actions in PDFs. A CV
 *      has no legitimate reason to contain either. Photographs and voice
 *      recordings carry neither, so for those the check is only that the file
 *      is not simultaneously valid markup.
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

/** Furthest byte any signature reaches, so callers know how few to fetch. */
export const SIGNATURE_BYTES = 12;

/**
 * One accepted opening for a file type.
 *
 * `offset` exists for the container formats: an .m4a or .mp4 begins with a
 * four-byte length and only then says "ftyp", and a .wav says "WAVE" at byte
 * eight. More than one entry may share an extension — an .mp3 legitimately
 * starts either with an ID3 tag or with a raw frame header, and rejecting the
 * second would refuse honest recordings from whole classes of phone.
 */
const SIGNATURES: { ext: string; magic: number[]; offset?: number; label: string }[] = [
  { ext: ".pdf", magic: [0x25, 0x50, 0x44, 0x46], label: "PDF" }, // %PDF
  // .docx is a zip. "PK\x03\x04" is a populated archive; the other PK variants
  // mean empty or spanned, neither of which is a real document.
  { ext: ".docx", magic: [0x50, 0x4b, 0x03, 0x04], label: "DOCX" },
  // Legacy .doc is an OLE2 compound file.
  { ext: ".doc", magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], label: "DOC" },
  // Identity photographs. JPEG starts FF D8 FF; PNG has an 8-byte signature.
  { ext: ".jpg", magic: [0xff, 0xd8, 0xff], label: "JPEG" },
  { ext: ".jpeg", magic: [0xff, 0xd8, 0xff], label: "JPEG" },
  { ext: ".png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], label: "PNG" },

  // Voice assessments. We do not choose these formats — the handset does — so
  // the list covers what phones actually produce rather than what would be
  // tidiest to support.
  // Matroska/WebM: the EBML header. What Chrome on Android records.
  { ext: ".webm", magic: [0x1a, 0x45, 0xdf, 0xa3], label: "WebM" },
  { ext: ".ogg", magic: [0x4f, 0x67, 0x67, 0x53], label: "Ogg" }, // OggS
  { ext: ".oga", magic: [0x4f, 0x67, 0x67, 0x53], label: "Ogg" },
  // ISO base media: a length, then "ftyp". What Safari on iOS records, and
  // what most Android recorder apps write.
  { ext: ".m4a", magic: [0x66, 0x74, 0x79, 0x70], offset: 4, label: "MP4 audio" },
  { ext: ".mp4", magic: [0x66, 0x74, 0x79, 0x70], offset: 4, label: "MP4 audio" },
  { ext: ".3gp", magic: [0x66, 0x74, 0x79, 0x70], offset: 4, label: "3GP audio" },
  // RIFF ... WAVE. Checked at byte eight, because RIFF alone is also AVI.
  { ext: ".wav", magic: [0x57, 0x41, 0x56, 0x45], offset: 8, label: "WAV" },
  // MP3: an ID3 tag, or a bare frame sync. The sync is eleven set bits, so the
  // second byte varies with the MPEG version and layer — these are the ones
  // real encoders emit.
  { ext: ".mp3", magic: [0x49, 0x44, 0x33], label: "MP3" }, // ID3
  { ext: ".mp3", magic: [0xff, 0xfb], label: "MP3" },
  { ext: ".mp3", magic: [0xff, 0xf3], label: "MP3" },
  { ext: ".mp3", magic: [0xff, 0xf2], label: "MP3" },
  { ext: ".mp3", magic: [0xff, 0xfa], label: "MP3" },
  // Raw AAC in an ADTS stream.
  { ext: ".aac", magic: [0xff, 0xf1], label: "AAC" },
  { ext: ".aac", magic: [0xff, 0xf9], label: "AAC" },
  // AMR, still produced by cheaper handsets' recorder apps.
  { ext: ".amr", magic: [0x23, 0x21, 0x41, 0x4d, 0x52], label: "AMR" }, // #!AMR
];

/** Extensions handled by the audio branch of the structure check. */
const AUDIO_STRUCTURE_EXTS = [
  ".webm", ".ogg", ".oga", ".m4a", ".mp4", ".3gp", ".wav", ".mp3", ".aac", ".amr",
];

/** "VBA" as it appears inside a UTF-16LE name: V\x00B\x00A\x00. */
function utf16le(s: string): string {
  return [...s].map((c) => c + "\u0000").join("");
}

function startsWith(buf: Uint8Array, magic: number[], offset = 0): boolean {
  if (buf.length < offset + magic.length) return false;
  return magic.every((b, i) => buf[offset + i] === b);
}

/**
 * Layer 1. Does the content match the extension the candidate gave it?
 *
 * A .doc that is really a zip is rejected rather than quietly re-typed: if the
 * two disagree, someone is either confused or trying something.
 */
export function checkSignature(bytes: Uint8Array, filename: string): ScanVerdict {
  const ext = extensionOf(filename);
  // All of them, not the first: one extension can have several legitimate
  // openings, and matching only the first would reject the rest.
  const expected = SIGNATURES.filter((s) => s.ext === ext);
  if (!expected.length) return { ok: false, reason: "File type not accepted." };

  if (expected.some((e) => startsWith(bytes, e.magic, e.offset))) return { ok: true };

  const actual = SIGNATURES.find((s) => startsWith(bytes, s.magic, s.offset));
  return {
    ok: false,
    reason: actual
      ? `Named ${ext} but the file is actually a ${actual.label}.`
      : `Named ${ext} but the contents are not a ${expected[0].label}.`,
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

  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
    // A polyglot — a file valid as both an image and as HTML — is the known
    // trick here. It only matters if a browser is ever persuaded to treat the
    // bytes as markup, which is why these are served from the storage origin
    // with their type fixed rather than sniffed. Refuse the obvious attempt
    // anyway; a real photograph never contains a script tag.
    if (/<script|<html|<\/svg|javascript:/i.test(text.slice(0, 4096))) {
      return { ok: false, reason: "This image contains embedded markup." };
    }
    return { ok: true };
  }

  if (AUDIO_STRUCTURE_EXTS.includes(ext)) {
    // Nothing to disassemble: none of these formats carries macros or an
    // action that runs on open, and the signature check has already
    // established the container is what it claims. The one cheap thing worth
    // refusing is the same polyglot trick the images guard against — a file
    // that is simultaneously valid audio and valid markup.
    if (/<script|<html|javascript:/i.test(text.slice(0, 4096))) {
      return { ok: false, reason: "This recording contains embedded markup." };
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
