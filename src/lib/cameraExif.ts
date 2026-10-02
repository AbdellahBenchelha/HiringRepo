/**
 * Does this image carry the details a camera writes into a photo?
 *
 * A photo taken with a phone or camera has EXIF data naming the device (Make,
 * Model) and the moment it was taken (DateTimeOriginal). A scan, a
 * screenshot, or an e-PAN exported as an image usually has none of these.
 *
 * A signal, not proof: messaging apps (WhatsApp among them) strip it from
 * real photos, and anybody determined can add it. So it is used to flag a
 * picture for a recruiter to look at closely — never to refuse one.
 *
 * Pure, and safe in the browser: reads the first part of a JPEG and nothing
 * else. Run it on the file as chosen, before it is resized, because resizing
 * re-encodes the picture and drops this data (and the location with it).
 */

const MAKE = 0x010f;
const MODEL = 0x0110;
const EXIF_IFD = 0x8769;
const DATE_ORIGINAL = 0x9003;

/** How much of the file to read: EXIF sits at the start of a JPEG. */
export const EXIF_SCAN_BYTES = 256 * 1024;

export function hasCameraExif(buf: ArrayBuffer): boolean {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return false; // not a JPEG
  let at = 2;
  while (at + 4 <= v.byteLength) {
    if (v.getUint8(at) !== 0xff) return false;
    const marker = v.getUint8(at + 1);
    // Start of scan or end of image: the headers are over.
    if (marker === 0xda || marker === 0xd9) return false;
    const len = v.getUint16(at + 2);
    if (len < 2) return false;
    if (marker === 0xe1 && at + 10 <= v.byteLength) {
      // "Exif\0\0"
      if (v.getUint32(at + 4) === 0x45786966 && v.getUint16(at + 8) === 0) {
        return tiffHasCamera(v, at + 10, Math.min(v.byteLength, at + 2 + len));
      }
    }
    at += 2 + len;
  }
  return false;
}

function tiffHasCamera(v: DataView, start: number, end: number): boolean {
  if (start + 8 > end) return false;
  const order = v.getUint16(start);
  const little = order === 0x4949;
  if (!little && order !== 0x4d4d) return false;
  const u16 = (o: number) => v.getUint16(o, little);
  const u32 = (o: number) => v.getUint32(o, little);

  const tags = (ifd: number): Map<number, number> => {
    const found = new Map<number, number>();
    const at = start + ifd;
    if (at + 2 > end) return found;
    const count = u16(at);
    for (let i = 0; i < count; i++) {
      const e = at + 2 + i * 12;
      if (e + 12 > end) break;
      found.set(u16(e), e);
    }
    return found;
  };
  /** An ASCII tag with something in it beyond spaces and NULs. */
  const hasText = (entry: number | undefined): boolean => {
    if (entry === undefined) return false;
    const count = u32(entry + 4);
    if (count < 2) return false;
    const at = count <= 4 ? entry + 8 : start + u32(entry + 8);
    for (let i = 0; i < count && at + i < end; i++) {
      const c = v.getUint8(at + i);
      if (c !== 0 && c !== 0x20) return true;
    }
    return false;
  };

  const ifd0 = tags(u32(start + 4));
  if (hasText(ifd0.get(MAKE)) || hasText(ifd0.get(MODEL))) return true;
  const exifEntry = ifd0.get(EXIF_IFD);
  if (exifEntry !== undefined) {
    const exif = tags(u32(exifEntry + 8));
    if (hasText(exif.get(DATE_ORIGINAL))) return true;
  }
  return false;
}

/** Read the start of a chosen file and check it. Never throws. */
export async function fileHasCameraExif(file: Blob): Promise<boolean> {
  try {
    return hasCameraExif(await file.slice(0, EXIF_SCAN_BYTES).arrayBuffer());
  } catch {
    return false;
  }
}
