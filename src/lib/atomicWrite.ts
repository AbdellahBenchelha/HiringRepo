/**
 * SERVER-ONLY. Replacing a file's contents without anyone seeing it half-done.
 *
 * `fs.writeFile` truncates the file and then fills it, so for as long as the
 * write takes there is a valid path holding invalid JSON. Anything reading in
 * that window gets a parse error — and every store here answers a parse error
 * with an empty list, so a reader does not see "an error", it sees "no
 * candidates". Two things follow, and the second is the dangerous one:
 *
 *   - a page rendered mid-write shows an empty table, or a lookup by id
 *     answers "no such candidate" for someone who exists;
 *   - a write interrupted by a crash or a redeploy leaves a truncated file
 *     behind for good, and the next write reads it as empty and saves that
 *     emptiness over the top.
 *
 * Writing to a sibling file and renaming avoids both. On POSIX a rename within
 * one directory is atomic: a reader opening the path gets either the whole old
 * file or the whole new one, never a partial one, and an interrupted write
 * leaves the original untouched with a stray temp file beside it.
 *
 * This stopped being theoretical when the page-at-a-time company check began
 * making three concurrent requests: roughly one in twenty-five answered 404
 * for a candidate that was plainly on the screen.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

/** Replace `file` with `contents`, creating its directory if needed. */
export async function writeFileAtomic(file: string, contents: string): Promise<void> {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  // Named per process and per call so two writers cannot collide on the temp
  // file itself, and kept in the same directory so the rename stays within one
  // filesystem — across filesystems it would be a copy, and not atomic.
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  try {
    await fs.writeFile(tmp, contents, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}
