import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { listSessions, presenceOf, type SessionIndex } from "@/lib/chatStore";
import { needsAttention, type ChatSummary } from "@/lib/chat";

/**
 * The Live chat inbox: every conversation, newest activity first within each
 * group, with what the list needs and nothing more. Polled by the tab and, less
 * often, by the sidebar badge. Served from the store's in-memory index, so a
 * poll does not read every conversation from disk.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ended chats kept in the list. Older ones are still on the candidate. */
const ENDED_SHOWN = 60;

function summarise(s: SessionIndex): ChatSummary {
  const presence = presenceOf(s.id);
  const live = s.status !== "ended";
  return {
    id: s.id,
    candidateId: s.candidateId,
    candidateName: s.candidateName,
    candidateEmail: s.candidateEmail,
    candidateCountry: s.candidateCountry,
    candidatePosition: s.candidatePosition,
    status: s.status,
    startedAt: s.startedAt,
    joinedAt: s.joinedAt,
    endedAt: s.endedAt,
    endedReason: s.endedReason,
    lastMessageAt: s.lastMessageAt,
    preview: s.preview,
    unread: s.unread,
    candidateOnline: live && presence.candidateOnline,
    candidateTyping: live && presence.candidateTyping,
  };
}

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const all = (await listSessions()).map(summarise);
  const newest = (a?: string, b?: string) => (b ?? "").localeCompare(a ?? "");
  // Longest wait first: the person who has waited longest is the one to join.
  const waiting = all.filter((s) => s.status === "waiting").sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const active = all.filter((s) => s.status === "active").sort((a, b) => newest(a.lastMessageAt, b.lastMessageAt));
  const ended = all
    .filter((s) => s.status === "ended")
    .sort((a, b) => newest(a.endedAt, b.endedAt))
    .slice(0, ENDED_SHOWN);
  return NextResponse.json(
    {
      ok: true,
      sessions: [...waiting, ...active, ...ended],
      counts: {
        waiting: waiting.length,
        active: active.length,
        unread: [...waiting, ...active].reduce((n, s) => n + s.unread, 0),
        // People who need you, not messages: the number on the sidebar badge.
        attention: all.filter(needsAttention).length,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
