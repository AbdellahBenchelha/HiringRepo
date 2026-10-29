/**
 * SERVER-ONLY. The director's signature and the company stamp printed on the
 * final agreement — see lib/agreementPdf.
 *
 * Uploaded in Admin → Settings → Agreement, and kept in private storage (R2),
 * never in the repository or under /public: a signature anybody can download
 * is a signature anybody can put on a document. Only this server reads them,
 * to draw them into an agreement.
 *
 * Each upload is turned into a trimmed PNG (the PDF library reads PNG and
 * JPEG only, and a stamp often arrives as WebP), and the old file is deleted.
 * Agreements already sent keep the copy they were sent with.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { deleteObject, getObjectBytes, putObject, r2Configured } from "@/lib/r2";
import { newId } from "@/lib/id";

export const SEAL_KINDS = ["signature", "stamp"] as const;
export type SealKind = (typeof SEAL_KINDS)[number];

export function isSealKind(v: unknown): v is SealKind {
  return typeof v === "string" && (SEAL_KINDS as readonly string[]).includes(v);
}

export const MAX_SEAL_BYTES = 5 * 1024 * 1024;

export interface SealImage {
  key: string;
  type: "image/png" | "image/jpeg";
  width: number;
  height: number;
  uploadedAt: string;
  by: string;
}

export type SealSettings = Partial<Record<SealKind, SealImage>>;

const dir = () => process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const file = () => path.join(/*turbopackIgnore: true*/ dir(), "agreement-seal.json");

export async function getSealSettings(): Promise<SealSettings> {
  try {
    return JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ file(), "utf8")) as SealSettings;
  } catch {
    return {};
  }
}

async function saveSettings(s: SealSettings): Promise<void> {
  await fs.mkdir(dir(), { recursive: true });
  await writeFileAtomic(file(), JSON.stringify(s, null, 2));
}

function sniff(bytes: Uint8Array): "png" | "jpeg" | "webp" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "webp";
  return null;
}

/**
 * Printed about 3 cm wide, so this is still sharp on paper while keeping the
 * PDF attachment light.
 */
const MAX_WIDTH: Record<SealKind, number> = { signature: 900, stamp: 520 };

/**
 * A trimmed PNG, no wider than it needs to be — sharp ships with Next.js. Without it,
 * a PNG or JPEG is kept as it came, and a WebP is refused with a reason.
 */
async function normalise(
  bytes: Uint8Array,
  format: "png" | "jpeg" | "webp",
  maxWidth: number,
): Promise<{ bytes: Uint8Array; type: SealImage["type"]; width: number; height: number } | { error: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(Buffer.from(bytes))
      .trim()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });
    return { bytes: new Uint8Array(out.data), type: "image/png", width: out.info.width, height: out.info.height };
  } catch {
    if (format === "webp") return { error: "This image could not be converted. Please upload it as PNG." };
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const img = format === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    return { bytes, type: format === "png" ? "image/png" : "image/jpeg", width: img.width, height: img.height };
  }
}

export async function saveSealImage(
  kind: SealKind,
  raw: Uint8Array,
  by: string,
): Promise<{ ok: true; settings: SealSettings } | { ok: false; error: string }> {
  if (!r2Configured()) return { ok: false, error: "File storage is not set up." };
  if (raw.length > MAX_SEAL_BYTES) return { ok: false, error: "The image is larger than 5 MB." };
  const format = sniff(raw);
  if (!format) return { ok: false, error: "Please upload a PNG, JPG or WebP image." };
  const img = await normalise(raw, format, MAX_WIDTH[kind]);
  if ("error" in img) return { ok: false, error: img.error };

  const ext = img.type === "image/png" ? "png" : "jpg";
  const key = `settings/agreement/${kind}-${newId(8)}.${ext}`;
  if (!(await putObject(key, Buffer.from(img.bytes), img.type))) return { ok: false, error: "The image could not be stored." };

  const settings = await getSealSettings();
  const old = settings[kind]?.key;
  settings[kind] = { key, type: img.type, width: img.width, height: img.height, uploadedAt: new Date().toISOString(), by };
  await saveSettings(settings);
  if (old && old !== key) await deleteObject(old);
  cache.delete(kind);
  return { ok: true, settings };
}

export async function removeSealImage(kind: SealKind): Promise<SealSettings> {
  const settings = await getSealSettings();
  const old = settings[kind]?.key;
  delete settings[kind];
  await saveSettings(settings);
  if (old) await deleteObject(old);
  cache.delete(kind);
  return settings;
}

// The images rarely change and every agreement reads them, so they are kept
// in memory under their storage key; a new upload has a new key.
const g = globalThis as unknown as { __agreementSeal?: Map<SealKind, { key: string; bytes: Uint8Array }> };
const cache = (g.__agreementSeal ??= new Map());

export interface LoadedSeal {
  bytes: Uint8Array;
  type: SealImage["type"];
  width: number;
  height: number;
}

/** One image, read from storage, or null if none is set (or it cannot be read). */
export async function loadSealImage(kind: SealKind): Promise<LoadedSeal | null> {
  const meta = (await getSealSettings())[kind];
  if (!meta) return null;
  const hit = cache.get(kind);
  let bytes = hit?.key === meta.key ? hit.bytes : null;
  if (!bytes) {
    bytes = await getObjectBytes(meta.key, MAX_SEAL_BYTES);
    if (!bytes) return null;
    cache.set(kind, { key: meta.key, bytes });
  }
  return { bytes, type: meta.type, width: meta.width, height: meta.height };
}

export async function loadSeal(): Promise<{ signature: LoadedSeal | null; stamp: LoadedSeal | null }> {
  const [signature, stamp] = await Promise.all([loadSealImage("signature"), loadSealImage("stamp")]);
  return { signature, stamp };
}
