import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getDocument } from "@/lib/store";
import { presignDownload, presignView } from "@/lib/r2";
import { extensionOf, isDocumentKind, safeFilename } from "@/lib/documents";

/**
 * Hand a recruiter one candidate document.
 *
 * A redirect to a signed R2 URL rather than a proxied stream: the bytes never
 * pass through this server, and the link dies in five minutes, so one that
 * ends up in a browser history or a chat message is worthless by the time
 * anyone tries it.
 *
 * Authenticated by session cookie, not by CSRF token, because this is a plain
 * navigation from a link. That is safe here because it only reads, and because
 * the response is a redirect to a URL an attacker's page cannot read.
 */

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; kind: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id, kind } = await ctx.params;
  if (!isDocumentKind(kind)) {
    return NextResponse.json({ ok: false, error: "bad_kind" }, { status: 400 });
  }

  const doc = await getDocument(id, kind);
  if (!doc) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  // Checked before the key, not after: a blocked document has no key precisely
  // because the file was destroyed, so the other order made this unreachable
  // and answered "no such document" for one we deliberately threw away.
  if (doc.status === "blocked") {
    return NextResponse.json({ ok: false, error: "blocked", reason: doc.reason }, { status: 409 });
  }
  if (!doc.key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const name = safeFilename(doc.filename);

  // ?mode=view renders the file in the browser rather than saving it. Only
  // types a browser can actually display qualify — a Word document served
  // inline just produces a download prompt where a preview was promised, so it
  // keeps the attachment path.
  const wantsView = req.nextUrl.searchParams.get("mode") === "view";
  const VIEWABLE: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  };
  const viewType = VIEWABLE[extensionOf(name)];

  const url = wantsView && viewType
    ? await presignView(doc.key, name, viewType)
    : await presignDownload(doc.key, name);
  if (!url) {
    return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      // Belt and braces alongside the disposition R2 applies: never let a
      // document be sniffed into something executable, and never let a signed
      // URL be cached anywhere on the way back.
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
