import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAdminSession } from "@/lib/adminAuth";
import { putObject, listObjects, deleteObjects } from "@/lib/r2";

/**
 * Copy the candidate file to object storage.
 *
 * The applications live in a single JSON file on a host volume with no
 * automatic backups, and that file holds names, dates of birth, phone numbers,
 * SSNs for US applicants and now identity-verification decisions. Losing the
 * volume loses all of it. Storage is replicated and separate, so a copy there
 * survives the volume dying.
 *
 * Authenticated two ways, because it is used by both a person and a scheduler:
 * an admin session, or BACKUP_TOKEN in a header. Copies older than
 * KEEP_BACKUPS are removed so this cannot grow without limit.
 */

export const runtime = "nodejs";

const KEEP_BACKUPS = 12;
const PREFIX = "backups/candidates-";

async function authorised(req: NextRequest): Promise<boolean> {
  if (await getAdminSession()) return true;
  const token = process.env.BACKUP_TOKEN?.trim();
  return !!token && req.headers.get("x-backup-token")?.trim() === token;
}

export async function POST(req: NextRequest) {
  if (!(await authorised(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  let raw: string;
  try {
    raw = await fs.readFile(path.join(dir, "candidates.json"), "utf8");
  } catch {
    return NextResponse.json({ ok: false, error: "no_data_file" }, { status: 404 });
  }

  const count = (() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  })();

  const key = `${PREFIX}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const stored = await putObject(key, Buffer.from(raw, "utf8"), "application/json");
  if (!stored) {
    return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  // Prune. Keys carry an ISO timestamp, so sorting them sorts by age.
  let pruned = 0;
  const existing = await listObjects(PREFIX);
  if (existing.length > KEEP_BACKUPS) {
    const old = existing.sort().slice(0, existing.length - KEEP_BACKUPS);
    await deleteObjects(old);
    pruned = old.length;
  }

  // eslint-disable-next-line no-console
  console.log(`[backup] ${key} (${count} candidates, ${raw.length} bytes), pruned ${pruned}`);
  return NextResponse.json({ ok: true, key, candidates: count, bytes: raw.length, pruned });
}
