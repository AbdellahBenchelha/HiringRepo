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
import {
  MAX_MESSAGE,
  chatStatus,
  cleanMessage,
  isSessionId,
  isValidClientId,
  type AdminSessionView,
  type ChatSession,
} from "@/lib/chat";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { candidateStatuses, forgetCandidateStatuses } from "@/lib/chatAccess";
import { setStatus } from "@/lib/store";
import { FULL_VERIFIED } from "@/lib/candidateStatus";

/**
 * One conversation, from the recruiter's side.
 *
 *   GET  ?from=N        the conversation (messages from N on) and presence
 *   POST join           join a waiting chat
 *   POST send           a message — joins first if nobody has
 *   POST end            close it for good
 *   POST read           everything up to `count` has been seen
 *   POST typing         "is typing…" for the candidate, for a few seconds
 *   POST verify         mark the candidate Full verified — ended chats only
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function fromOf(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function view(s: ChatSession, from: number, candidateStatus?: string): AdminSessionView {
  const total = s.messages.length;
  // More than exists: the page holds a conversation the server does not.
  const reset = from > total;
  const start = reset ? 0 : Math.floor(from);
  const presence = presenceOf(s.id);
  const status = chatStatus(s);
  return {
    ...(reset ? { reset: true } : {}),
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
    total,
    recruiterRead: s.recruiterRead,
    candidateOnline: status !== "ended" && presence.candidateOnline,
    candidateSeenAt: presence.candidateSeenAt,
    candidateTyping: status !== "ended" && presence.candidateTyping,
    candidateStatus,
  };
}

async function statusOf(candidateId: string): Promise<string | undefined> {
  return (await candidateStatuses()).get(candidateId);
}

const notFound = () => NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  // Checked before it goes anywhere near a file path.
  if (!isSessionId(id)) return notFound();
  const s = await getSession(id);
  if (!s) return notFound();
  return NextResponse.json(
    { ok: true, session: view(s, fromOf(req.nextUrl.searchParams.get("from")), await statusOf(s.candidateId)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  if (!isSessionId(id)) return notFound();

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
  const from = fromOf(body.from);

  switch (body.action) {
    case "join": {
      const s = await joinSession(id, by);
      if (!s) return notFound();
      if (s.endedAt) return NextResponse.json({ ok: false, error: "ended" }, { status: 409 });
      return NextResponse.json({ ok: true, session: view(s, from, await statusOf(s.candidateId)) });
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
        return NextResponse.json(
          { ok: false, error: result.reason },
          { status: result.reason === "not_found" ? 404 : 409 },
        );
      }
      setTyping(id, "recruiter", false);
      return NextResponse.json({ ok: true, session: view(result.session, from, await statusOf(result.session.candidateId)) });
    }
    case "end": {
      const s = await endSession(id, by);
      if (!s) return notFound();
      // eslint-disable-next-line no-console
      console.log(`[chat] ${id} ended by ${by}`);
      return NextResponse.json({ ok: true, session: view(s, from, await statusOf(s.candidateId)) });
    }
    case "verify": {
      // After the interview, not during it: the label only appears once the
      // chat has ended, and the server holds the same line.
      const s = await getSession(id);
      if (!s) return notFound();
      if (!s.endedAt) return NextResponse.json({ ok: false, error: "not_ended" }, { status: 409 });
      const updated = await setStatus(s.candidateId, FULL_VERIFIED, by);
      if (!updated) return NextResponse.json({ ok: false, error: "candidate_not_found" }, { status: 404 });
      forgetCandidateStatuses();
      // eslint-disable-next-line no-console
      console.log(`[chat] ${s.candidateId} marked Full verified by ${by} from chat ${id}`);
      return NextResponse.json({ ok: true, session: view(s, from, updated.status) });
    }
    case "read": {
      const s = await getSession(id);
      if (!s) return notFound();
      const count = typeof body.count === "number" && Number.isFinite(body.count) ? body.count : s.messages.length;
      await markRead(id, count);
      return NextResponse.json({ ok: true });
    }
    case "typing": {
      const s = await getSession(id);
      if (!s) return notFound();
      if (!s.endedAt) setTyping(id, "recruiter", body.typing === true);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }
}
