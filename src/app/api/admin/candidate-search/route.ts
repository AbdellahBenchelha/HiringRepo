import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";

/**
 * Find a candidate by name or email, for the Send email tab's "To" picker.
 * Returns only what the picker shows: never documents, details or numbers.
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ ok: true, results: [] });

  const results = (await listCandidates())
    .filter((c) => c.email?.includes("@"))
    .filter((c) =>
      [c.fullName, `${c.firstName} ${c.lastName}`, c.email].some((v) => (v || "").toLowerCase().includes(q)),
    )
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      name: c.fullName || `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      country: c.confirmedDetails?.country || c.country || "",
      status: c.status,
    }));
  return NextResponse.json({ ok: true, results });
}
