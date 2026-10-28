import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { presignView } from "@/lib/r2";

/** Open a team portal file (ticket screenshot or shared document) in the Admin Panel. */

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const key = req.nextUrl.searchParams.get("key") ?? "";
  // Only the team area of the bucket, and only the types it ever holds.
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (!key.startsWith("team/") || key.includes("..") || !TYPES[ext]) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const url = await presignView(key, key.split("/").pop() ?? "file", TYPES[ext]);
  if (!url) return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  return NextResponse.redirect(url, 302);
}
