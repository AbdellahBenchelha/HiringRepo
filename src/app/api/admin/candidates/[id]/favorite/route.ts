import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { setFavorite } from "@/lib/store";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * Star a candidate, or take the star off.
 *
 * The value is sent rather than toggled here. A toggle computed on the server
 * turns a double-tap on a slow connection into two flips that land back where
 * they started, and leaves the panel and the record disagreeing about which
 * way round it ended up. The client knows what it is asking for; this writes
 * exactly that.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = await readJsonBody<{ favorite?: unknown }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  if (typeof parsed.data.favorite !== "boolean") {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const updated = await setFavorite(id, parsed.data.favorite);
  if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    favorite: updated.favorite ?? false,
    favoritedAt: updated.favoritedAt ?? null,
  });
}
