import { NextRequest, NextResponse } from "next/server";
import { ACCESS_STATUS, resolveChatLink } from "@/lib/chatAccess";
import { appendMessage, presenceOf, setTyping, startSession, touchCandidate } from "@/lib/chatStore";
import {
  MAX_MESSAGE,
  chatStatus,
  cleanMessage,
  isValidClientId,
  type CandidateChatState,
  type ChatSession,
} from "@/lib/chat";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { buildChatStartedMessage, sendTelegramMessage } from "@/lib/telegram";

/**
 * The candidate's side of the final-interview chat.
 *
 * Public, like the offer page: the signed link is the whole authorisation, and
 * lib/chatAccess decides what a link may still do.
 *
 *   GET  ?t=…&from=N   what is new since message N (the page polls this)
 *   POST start         open the conversation — the only thing that does
 *   POST send          one message
 *   POST typing        "is typing…", for a few seconds
 *
 * Opening the page never starts anything. Mail scanners fetch every link in
 * an email, and a chat that started on a GET would page a recruiter for a
 * security scanner.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLLS_PER_MINUTE = 90;
const SENDS_PER_MINUTE = 20;
const TYPING_PER_MINUTE = 40;
const PER_IP_PER_MINUTE = 400;
const MINUTE = 60_000;

function stateOf(session: ChatSession | null, from: number): CandidateChatState {
  if (!session) {
    return { status: "not_started", messages: [], total: 0, recruiterTyping: false };
  }
  const total = session.messages.length;
  // Asking for more than exists means the page holds a conversation the
  // server does not (a restored backup, say): send all of it, flagged.
  const reset = from > total;
  const start = reset ? 0 : Math.max(0, Math.floor(from));
  const status = chatStatus(session);
  return {
    ...(reset ? { reset: true } : {}),
    status,
    messages: session.messages.slice(start).map(({ id, from, text, at, clientId }) => ({
      id, from, text, at, ...(clientId ? { clientId } : {}),
    })),
    total,
    startedAt: session.startedAt,
    endedReason: session.endedReason,
    recruiterTyping: status === "active" && presenceOf(session.id).recruiterTyping,
  };
}

function fromOf(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function refused(reason: keyof typeof ACCESS_STATUS) {
  return NextResponse.json({ ok: false, error: reason }, { status: ACCESS_STATUS[reason] });
}

export async function GET(req: NextRequest) {
  const ipLimit = rateLimit(`chat:ip:${clientIp(req)}`, PER_IP_PER_MINUTE, MINUTE);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter, "chat poll (ip)");

  const access = await resolveChatLink(req.nextUrl.searchParams.get("t"));
  if (!access.ok) return refused(access.reason);

  const limit = rateLimit(`chat:poll:${access.candidate.id}`, POLLS_PER_MINUTE, MINUTE);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "chat poll");

  const { session } = access;
  if (session && !session.endedAt) touchCandidate(session.id);
  return NextResponse.json(
    { ok: true, state: stateOf(session, fromOf(req.nextUrl.searchParams.get("from"))) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const ipLimit = rateLimit(`chat:ip:${clientIp(req)}`, PER_IP_PER_MINUTE, MINUTE);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter, "chat post (ip)");

  const parsed = await readJsonBody<{
    t?: string;
    action?: string;
    text?: unknown;
    clientId?: unknown;
    typing?: unknown;
    from?: unknown;
  }>(req, 16 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  // Fresh, not cached: these change things, and must see the record as it is.
  const access = await resolveChatLink(body.t, { fresh: true });
  if (!access.ok) return refused(access.reason);
  const { candidate, link } = access;
  const from = fromOf(body.from);

  /* -- start ------------------------------------------------------------- */
  if (body.action === "start") {
    const limit = rateLimit(`chat:start:${candidate.id}`, 10, MINUTE);
    if (!limit.ok) return tooManyRequests(limit.retryAfter, "chat start");

    // A link that already opened a conversation resumes it. Without one, the
    // access rules guarantee this is the newest link and still in date.
    let session = access.session;
    let created = false;
    if (!session) {
      const name =
        candidate.fullName?.trim() ||
        `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() ||
        candidate.email ||
        "Candidate";
      ({ session, created } = await startSession({
        candidateId: candidate.id,
        linkSentAt: link.sentAt,
        candidateName: name,
        candidateEmail: candidate.email || undefined,
        candidateCountry: candidate.confirmedDetails?.country || candidate.country || undefined,
        candidatePosition: candidate.offer?.position || candidate.position || undefined,
      }));
    }
    if (!session.endedAt) touchCandidate(session.id);
    if (created) {
      const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
      // Never allowed to fail the start: the conversation already exists.
      void sendTelegramMessage(
        buildChatStartedMessage(
          session.candidateName,
          candidate.email,
          session.candidateCountry,
          `${base}/admin/chat?s=${session.id}`,
        ),
      ).catch(() => {});
    }
    // eslint-disable-next-line no-console
    console.log(`[chat] ${candidate.id} ${created ? "started" : "resumed"} chat ${session.id}`);
    return NextResponse.json({ ok: true, state: stateOf(session, from) });
  }

  const session = access.session;
  if (!session) return NextResponse.json({ ok: false, error: "not_started" }, { status: 409 });

  /* -- typing ------------------------------------------------------------ */
  if (body.action === "typing") {
    const limit = rateLimit(`chat:typing:${session.id}`, TYPING_PER_MINUTE, MINUTE);
    if (!limit.ok) return tooManyRequests(limit.retryAfter, "chat typing");
    if (!session.endedAt) {
      setTyping(session.id, "candidate", body.typing === true);
      touchCandidate(session.id);
    }
    return NextResponse.json({ ok: true });
  }

  /* -- send -------------------------------------------------------------- */
  if (body.action === "send") {
    if (session.endedAt) return NextResponse.json({ ok: false, error: "ended" }, { status: 409 });
    const limit = rateLimit(`chat:send:${session.id}`, SENDS_PER_MINUTE, MINUTE);
    if (!limit.ok) return tooManyRequests(limit.retryAfter, "chat send");

    const text = cleanMessage(body.text);
    if (!text) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
    if (text.length > MAX_MESSAGE) {
      return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
    }
    const clientId = isValidClientId(body.clientId) ? body.clientId : undefined;
    const result = await appendMessage(session.id, "candidate", text, clientId);
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : 409;
      return NextResponse.json({ ok: false, error: result.reason }, { status });
    }
    setTyping(session.id, "candidate", false);
    touchCandidate(session.id);
    return NextResponse.json({ ok: true, state: stateOf(result.session, from) });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
