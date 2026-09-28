import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import {
  appendMessage,
  endSession,
  getSession,
  joinSession,
  markRead,
  presenceOf,
  setTyping,
} from "@/lib/chatStore";
import { MAX_MESSAGE, chatStatus, cleanMessage, isValidClientId, type ChatSession } from "@/lib/chat";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * One conversation, from the recruiter's side.
 *
 *   GET  ?from=N        the conversation (messages from N on) and presence
 *   POST join           join a waiting chat
 *   POST send           a message — joins first if nobody has
 *   POST end            close it for good
 *   POST read           everything up to `count` has been seen
 *   POST typing         "is typing…" for the candidate, for a few seconds
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function view(s: ChatSession, from: number) {
  const start = Math.max(0, Math.min(from, s.messages.length));
  const presence = presenceOf(s.id);
  const status = chatStatus(s);
  return {
    id: s.id,
    candidateId: s.candidateId,
    candidateName: s.candidateName,
    candidateEmail: s.candidateEmail,
    candidateCountry: s.candidateCountry,
    candidatePosition: s.candidatePosition,
    status,
    startedAt: s.startedAt,
    joinedAt: s.joinedAt,
    endedAt: s.endedAt,
    endedReason: s.endedReason,
    messages: s.messages.slice(start),
    total: s.messages.length,
    recruiterRead: s.recruiterRead,
    candidateOnline: status !== "ended" && presence.candidateOnline,
    candidateSeenAt: presence.candidateSeenAt,
    candidateTyping: status !== "ended" && presence.candidateTyping,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const s = await getSession(id);
  if (!s) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const from = Number(req.nextUrl.searchParams.get("from") ?? 0);
  return NextResponse.json(
    { ok: true, session: view(s, Number.isFinite(from) ? from : 0) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;

  const parsed = await readJsonBody<{
    action?: string;
    text?: unknown;
    clientId?: unknown;
    count?: unknown;
    typing?: unknown;
    from?: unknown;
  }>(req, 16 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;
  const from = typeof body.from === "number" && Number.isFinite(body.from) ? body.from : 0;

  const existing = await getSession(id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  switch (body.action) {
    case "join": {
      if (existing.endedAt) return NextResponse.json({ ok: false, error: "ended" }, { status: 409 });
      const s = await joinSession(id, by);
      return NextResponse.json({ ok: true, session: s && view(s, from) });
    }
    case "send": {
      const text = cleanMessage(body.text);
      if (!text) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
      if (text.length > MAX_MESSAGE) {
        return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
      }
      const clientId = isValidClientId(body.clientId) ? body.clientId : undefined;
      const result = await appendMessage(id, "recruiter", text, clientId, by);
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.reason }, { status: result.reason === "not_found" ? 404 : 409 });
      }
      setTyping(id, "recruiter", false);
      return NextResponse.json({ ok: true, session: view(result.session, from) });
    }
    case "end": {
      const s = await endSession(id, by);
      setTyping(id, "recruiter", false);
      // eslint-disable-next-line no-console
      console.log(`[chat] ${id} ended by ${by}`);
      return NextResponse.json({ ok: true, session: s && view(s, from) });
    }
    case "read": {
      const count = typeof body.count === "number" ? body.count : existing.messages.length;
      await markRead(id, count);
      return NextResponse.json({ ok: true });
    }
    case "typing": {
      if (!existing.endedAt) setTyping(id, "recruiter", body.typing === true);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }
}
