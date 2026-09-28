/**
 * SERVER-ONLY persistence for the final-interview live chat.
 *
 * Its own file beside candidates.json: every message is a write, and a chat
 * must never rewrite the file holding every application. Writes are serialised
 * through one chain, so two messages arriving together are both kept.
 *
 * Presence and typing live in memory only. They change every couple of
 * seconds, mean nothing after a restart, and writing them to disk would turn
 * every poll into a file write. Kept on globalThis so every route in this
 * process sees the same map.
 *
 * One process only, like the rest of the store.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { newId } from "@/lib/id";
import {
  DEFAULT_HOURS,
  DEFAULT_QUESTIONS,
  MAX_MESSAGES,
  chatStatus,
  type ChatMessage,
  type ChatSender,
  type ChatSession,
  type ChatSettings,
} from "@/lib/chat";

const FILE = "chats.json";

interface ChatData {
  sessions: ChatSession[];
  settings?: ChatSettings;
}

const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = () => path.join(dir(), FILE);

function normalise(raw: unknown): ChatData {
  const d = (raw ?? {}) as Partial<ChatData>;
  const sessions = Array.isArray(d.sessions)
    ? d.sessions.filter(
        (s): s is ChatSession =>
          !!s && typeof s.id === "string" && typeof s.candidateId === "string" && Array.isArray(s.messages),
      )
    : [];
  return { sessions, settings: d.settings };
}

export async function readChats(): Promise<ChatData> {
  try {
    return normalise(JSON.parse(await fs.readFile(file(), "utf8")));
  } catch {
    return { sessions: [] };
  }
}

const G = globalThis as unknown as {
  __wrChatChain?: Promise<unknown>;
  __wrChatPresence?: Map<string, Presence>;
};

function withChats<T>(fn: (data: ChatData) => T): Promise<T> {
  const run = (G.__wrChatChain ?? Promise.resolve()).then(async () => {
    const data = await readChats();
    const result = fn(data);
    await fs.mkdir(dir(), { recursive: true });
    await writeFileAtomic(file(), JSON.stringify(data, null, 2));
    return result;
  });
  G.__wrChatChain = run.catch(() => {});
  return run;
}

/* ------------------------------------------------------------------------ */
/* Presence and typing — memory only                                          */
/* ------------------------------------------------------------------------ */

interface Presence {
  candidateSeenAt?: number;
  candidateTypingUntil?: number;
  recruiterTypingUntil?: number;
}

function presenceMap(): Map<string, Presence> {
  if (!G.__wrChatPresence) G.__wrChatPresence = new Map();
  return G.__wrChatPresence;
}

export function touchCandidate(sessionId: string): void {
  const p = presenceMap().get(sessionId) ?? {};
  p.candidateSeenAt = Date.now();
  presenceMap().set(sessionId, p);
}

export function setTyping(sessionId: string, who: "candidate" | "recruiter", typing: boolean): void {
  const p = presenceMap().get(sessionId) ?? {};
  const until = typing ? Date.now() + 5000 : 0;
  if (who === "candidate") p.candidateTypingUntil = until;
  else p.recruiterTypingUntil = until;
  presenceMap().set(sessionId, p);
}

export function presenceOf(sessionId: string): {
  candidateOnline: boolean;
  candidateSeenAt?: string;
  candidateTyping: boolean;
  recruiterTyping: boolean;
} {
  const p = presenceMap().get(sessionId) ?? {};
  const now = Date.now();
  return {
    // A poll every few seconds while the page is open; hidden tabs poll less.
    candidateOnline: !!p.candidateSeenAt && now - p.candidateSeenAt < 20_000,
    candidateSeenAt: p.candidateSeenAt ? new Date(p.candidateSeenAt).toISOString() : undefined,
    candidateTyping: !!p.candidateTypingUntil && p.candidateTypingUntil > now,
    recruiterTyping: !!p.recruiterTypingUntil && p.recruiterTypingUntil > now,
  };
}

/* ------------------------------------------------------------------------ */
/* Sessions                                                                   */
/* ------------------------------------------------------------------------ */

export async function listSessions(): Promise<ChatSession[]> {
  return (await readChats()).sessions;
}

export async function getSession(id: string): Promise<ChatSession | null> {
  return (await readChats()).sessions.find((s) => s.id === id) ?? null;
}

export async function sessionForLink(candidateId: string, linkSentAt: string): Promise<ChatSession | null> {
  return (
    (await readChats()).sessions.find((s) => s.candidateId === candidateId && s.linkSentAt === linkSentAt) ??
    null
  );
}

export async function sessionsForCandidate(candidateId: string): Promise<ChatSession[]> {
  return (await readChats()).sessions.filter((s) => s.candidateId === candidateId);
}

function message(from: ChatSender, text: string, clientId?: string): ChatMessage {
  return { id: newId(8), from, text, at: new Date().toISOString(), ...(clientId ? { clientId } : {}) };
}

/**
 * The candidate pressed Start. Idempotent: pressing it twice, or on two
 * devices, finds the same conversation rather than opening a second.
 */
export function startSession(input: {
  candidateId: string;
  linkSentAt: string;
  candidateName: string;
  candidateEmail?: string;
  candidateCountry?: string;
  candidatePosition?: string;
}): Promise<{ session: ChatSession; created: boolean }> {
  return withChats((data) => {
    const found = data.sessions.find(
      (s) => s.candidateId === input.candidateId && s.linkSentAt === input.linkSentAt,
    );
    if (found) return { session: found, created: false };
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: newId(12),
      ...input,
      startedAt: now,
      messages: [message("system", "Chat started. A recruiter will join shortly.")],
      recruiterRead: 1,
      lastMessageAt: now,
    };
    data.sessions.push(session);
    return { session, created: true };
  });
}

/** Telegram is told once per conversation; this claims the right to tell it. */
export function claimNotification(sessionId: string): Promise<boolean> {
  return withChats((data) => {
    const s = data.sessions.find((x) => x.id === sessionId);
    if (!s || s.notifiedAt) return false;
    s.notifiedAt = new Date().toISOString();
    return true;
  });
}

export type AppendResult =
  | { ok: true; session: ChatSession; message: ChatMessage; duplicate: boolean }
  | { ok: false; reason: "not_found" | "ended" | "full" };

/**
 * Add a message. A recruiter writing into a waiting chat joins it first, so
 * the candidate sees "A recruiter joined" before the first question rather
 * than a question out of nowhere.
 */
export function appendMessage(
  sessionId: string,
  from: "candidate" | "recruiter",
  text: string,
  clientId?: string,
  by?: string,
): Promise<AppendResult> {
  return withChats((data): AppendResult => {
    const s = data.sessions.find((x) => x.id === sessionId);
    if (!s) return { ok: false, reason: "not_found" };
    if (s.endedAt) return { ok: false, reason: "ended" };
    // The same message retried after a dropped connection is stored once.
    if (clientId) {
      const dup = s.messages.find((m) => m.clientId === clientId && m.from === from);
      if (dup) return { ok: true, session: s, message: dup, duplicate: true };
    }
    if (s.messages.length >= MAX_MESSAGES) return { ok: false, reason: "full" };
    if (from === "recruiter" && !s.joinedAt) joinInPlace(s, by);
    const m = message(from, text, clientId);
    s.messages.push(m);
    s.lastMessageAt = m.at;
    // What the recruiter writes, they have seen.
    if (from === "recruiter") s.recruiterRead = s.messages.length;
    return { ok: true, session: s, message: m, duplicate: false };
  });
}

function joinInPlace(s: ChatSession, by?: string) {
  s.joinedAt = new Date().toISOString();
  s.joinedBy = by;
  s.messages.push(message("system", "A recruiter joined the chat."));
  s.lastMessageAt = s.joinedAt;
  s.recruiterRead = s.messages.length;
}

export function joinSession(sessionId: string, by?: string): Promise<ChatSession | null> {
  return withChats((data) => {
    const s = data.sessions.find((x) => x.id === sessionId);
    if (!s) return null;
    if (!s.joinedAt && !s.endedAt) joinInPlace(s, by);
    return s;
  });
}

export function endSession(sessionId: string, by?: string): Promise<ChatSession | null> {
  return withChats((data) => {
    const s = data.sessions.find((x) => x.id === sessionId);
    if (!s) return null;
    if (!s.endedAt) {
      s.endedAt = new Date().toISOString();
      s.endedBy = by;
      s.endedReason = "ended";
      s.messages.push(message("system", "The chat has ended. Thank you for your time."));
      s.lastMessageAt = s.endedAt;
      s.recruiterRead = s.messages.length;
    }
    return s;
  });
}

export function markRead(sessionId: string, count: number): Promise<ChatSession | null> {
  return withChats((data) => {
    const s = data.sessions.find((x) => x.id === sessionId);
    if (!s) return null;
    s.recruiterRead = Math.max(s.recruiterRead, Math.min(Math.floor(count), s.messages.length));
    return s;
  });
}

/**
 * A new link was sent: whatever conversation the old one opened is closed,
 * because its page can no longer be used to reply.
 */
export function closeOlderSessions(candidateId: string, keepLinkSentAt: string): Promise<number> {
  return withChats((data) => {
    let closed = 0;
    for (const s of data.sessions) {
      if (s.candidateId !== candidateId || s.linkSentAt === keepLinkSentAt || s.endedAt) continue;
      s.endedAt = new Date().toISOString();
      s.endedReason = "replaced";
      s.messages.push(message("system", "This chat was closed because a new chat link was sent."));
      s.lastMessageAt = s.endedAt;
      closed++;
    }
    return closed;
  });
}

/** The candidate was deleted: their conversations go with them. */
export function deleteSessionsForCandidate(candidateId: string): Promise<number> {
  return withChats((data) => {
    const before = data.sessions.length;
    data.sessions = data.sessions.filter((s) => s.candidateId !== candidateId);
    return before - data.sessions.length;
  });
}

/* ------------------------------------------------------------------------ */
/* Settings                                                                   */
/* ------------------------------------------------------------------------ */

export async function getChatSettings(): Promise<ChatSettings & { isDefault: boolean }> {
  const s = (await readChats()).settings;
  if (!s) return { questions: DEFAULT_QUESTIONS, hours: DEFAULT_HOURS, isDefault: true };
  return {
    questions: Array.isArray(s.questions) ? s.questions : DEFAULT_QUESTIONS,
    hours: typeof s.hours === "string" ? s.hours : DEFAULT_HOURS,
    updatedAt: s.updatedAt,
    isDefault: false,
  };
}

export function saveChatSettings(next: Pick<ChatSettings, "questions" | "hours">): Promise<ChatSettings> {
  return withChats((data) => {
    data.settings = { ...next, updatedAt: new Date().toISOString() };
    return data.settings;
  });
}

export { chatStatus };
