import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { listSessions, presenceOf } from "@/lib/chatStore";
import { chatStatus, unreadCount, type ChatSession } from "@/lib/chat";

/**
 * The Live chat inbox: every conversation, newest activity first within each
 * group, with what the list needs and nothing more. Polled by the tab and, less
 * often, by the sidebar badge.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ended chats kept in the list. Older ones are still on the candidate. */
const ENDED_SHOWN = 60;

export interface ChatSummary {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidateCountry?: string;
  candidatePosition?: string;
  status: "waiting" | "active" | "ended";
  startedAt: string;
  joinedAt?: string;
  endedAt?: string;
  lastMessageAt?: string;
  preview?: { from: string; text: string };
  unread: number;
  candidateOnline: boolean;
  candidateTyping: boolean;
}

function summarise(s: ChatSession): ChatSummary {
  const last = [...s.messages].reverse().find((m) => m.from !== "system");
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
    lastMessageAt: s.lastMessageAt,
    preview: last ? { from: last.from, text: last.text.slice(0, 90) } : undefined,
    unread: status === "ended" ? 0 : unreadCount(s),
    candidateOnline: status !== "ended" && presence.candidateOnline,
    candidateTyping: status !== "ended" && presence.candidateTyping,
  };
}

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const all = (await listSessions()).map(summarise);
  const by = (a?: string, b?: string) => (b ?? "").localeCompare(a ?? "");
  // Longest wait first: the person who has waited longest is the one to join.
  const waiting = all.filter((s) => s.status === "waiting").sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const active = all.filter((s) => s.status === "active").sort((a, b) => by(a.lastMessageAt, b.lastMessageAt));
  const ended = all
    .filter((s) => s.status === "ended")
    .sort((a, b) => by(a.endedAt, b.endedAt))
    .slice(0, ENDED_SHOWN);
  return NextResponse.json(
    {
      ok: true,
      sessions: [...waiting, ...active, ...ended],
      counts: {
        waiting: waiting.length,
        active: active.length,
        unread: active.reduce((n, s) => n + s.unread, 0) + waiting.reduce((n, s) => n + s.unread, 0),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
