/**
 * The final-interview live chat — the shared model.
 *
 * Pure: no filesystem, no node built-ins. The candidate's chat page, the Admin
 * Panel and the API routes all agree on what a conversation is from here.
 *
 * A chat exists only for somebody who was sent a link. Opening the link does
 * nothing on its own — mail scanners open links — so a conversation begins
 * when the candidate presses Start, waits until a recruiter joins, and closes
 * for good when the recruiter ends it. A new link means a new conversation.
 */

/** How long an emailed chat link opens a chat. */
export const CHAT_LINK_TTL_DAYS = 7;

/** Longest single message, either side. Long enough for a real answer. */
export const MAX_MESSAGE = 2000;
/** Hard ceiling per conversation, so one chat cannot grow the file forever. */
export const MAX_MESSAGES = 600;
/** How the recruiter appears to the candidate. */
export const RECRUITER_NAME = "WorkRoute Recruitment";
/** After this long waiting, the candidate is told the team is busy. */
export const BUSY_AFTER_MINUTES = 10;

export type ChatSender = "candidate" | "recruiter" | "system";

export interface ChatMessage {
  id: string;
  from: ChatSender;
  text: string;
  at: string;
  /** Set by the browser that sent it, so a retried send is stored once. */
  clientId?: string;
}

export interface ChatSession {
  id: string;
  candidateId: string;
  /** Which emailed link this conversation belongs to. */
  linkSentAt: string;
  /** Snapshots for the inbox, so the list does not need the candidate file. */
  candidateName: string;
  candidateEmail?: string;
  candidateCountry?: string;
  candidatePosition?: string;
  startedAt: string;
  joinedAt?: string;
  joinedBy?: string;
  endedAt?: string;
  endedBy?: string;
  /** Why it closed, when not by a recruiter's End chat. */
  endedReason?: "replaced" | "ended";
  messages: ChatMessage[];
  /** How many messages the recruiter has seen, for the unread count. */
  recruiterRead: number;
  /** Telegram told once, per conversation. */
  notifiedAt?: string;
  lastMessageAt?: string;
}

export type ChatStatus = "waiting" | "active" | "ended";

export function chatStatus(s: Pick<ChatSession, "joinedAt" | "endedAt">): ChatStatus {
  if (s.endedAt) return "ended";
  if (s.joinedAt) return "active";
  return "waiting";
}

/** Candidate messages the recruiter has not looked at yet. */
export function unreadCount(s: Pick<ChatSession, "messages" | "recruiterRead">): number {
  return s.messages.slice(s.recruiterRead).filter((m) => m.from === "candidate").length;
}

/**
 * Tidy what somebody typed: trim, and drop control characters — including the
 * invisible direction overrides, which can make text read differently from
 * what it is (a link that looks like one address and is another).
 */
export function cleanMessage(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** Conversation ids are base62; checked before one is used in a file path. */
export function isSessionId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9]{6,40}$/.test(v);
}

export function isValidClientId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{6,40}$/.test(v);
}

/* ------------------------------------------------------------------------ */
/* Links                                                                     */
/* ------------------------------------------------------------------------ */

export type TextPart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

/**
 * Split a message into text and links, for rendering as React nodes.
 *
 * Never HTML: the message is data, and building markup from it is how a chat
 * becomes an injection point. Only http(s) links are made clickable, and
 * trailing punctuation stays outside the link — "see www.x.com." should not
 * send somebody to "www.x.com.".
 */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    let raw = match[1];
    const start = match.index ?? 0;
    // Trailing punctuation belongs to the sentence, not the address — except a
    // closing bracket the address itself opened, as in a Wikipedia link.
    while (raw && /[.,!?;:)\]}'"]$/.test(raw)) {
      const last = raw[raw.length - 1];
      if (last === ")" && (raw.match(/\(/g)?.length ?? 0) >= (raw.match(/\)/g)?.length ?? 0)) break;
      raw = raw.slice(0, -1);
    }
    if (!raw) continue;
    const href = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    try {
      const u = new URL(href);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    } catch {
      continue;
    }
    if (start > last) parts.push({ kind: "text", text: text.slice(last, start) });
    parts.push({ kind: "link", text: raw, href });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/* ------------------------------------------------------------------------ */
/* Settings                                                                  */
/* ------------------------------------------------------------------------ */

export interface ChatSettings {
  /** Saved questions, clicked into the message box in the Live chat tab. */
  questions: string[];
  /** Shown to candidates on the chat page. */
  hours: string;
  updatedAt?: string;
}

export const MAX_QUESTIONS = 40;
export const MAX_QUESTION = 500;
export const MAX_HOURS_TEXT = 160;

export const DEFAULT_HOURS = "We reply Monday–Friday, 9:00–01:00 UK time";

/** A starting set for a remote customer-support final interview. Editable in Settings. */
export const DEFAULT_QUESTIONS: string[] = [
  "Hi, thank you for joining. Before we start, could you confirm your full name and the country you are living in right now?",
  "Tell me briefly about yourself and your most recent work experience.",
  "Why are you interested in this remote customer support role with WorkRoute?",
  "Have you worked remotely before? How do you organise your day and stay focused when working from home?",
  "Describe your home work setup: your computer, internet connection, and a quiet place to work.",
  "Which days and hours are you available to work each week?",
  "A customer writes in upset because their order is late. How would you reply to them? Please write your answer as if you were talking to the customer.",
  "Tell me about a time you handled a difficult customer or situation. What did you do, and what was the result?",
  "How comfortable are you writing in English? Which other languages can you speak or write?",
  "Which tools or software have you used before (for example email, chat, ticketing systems, Google Workspace, Microsoft Office)?",
  "When would you be able to start if we offer you the position?",
  "Do you have any questions for us about the role, the pay or how we work?",
  "Thank you for your time today. We will review the interview and get back to you by email. Have a good day!",
];

export function cleanSettings(raw: unknown): ChatSettings | { error: string } {
  const r = (raw ?? {}) as { questions?: unknown; hours?: unknown };
  if (!Array.isArray(r.questions)) return { error: "questions must be a list" };
  const questions = r.questions
    .map((q) => cleanMessage(q))
    .filter((q) => q.length > 0);
  if (questions.length > MAX_QUESTIONS) return { error: `At most ${MAX_QUESTIONS} questions.` };
  if (questions.some((q) => q.length > MAX_QUESTION)) {
    return { error: `Each question can be at most ${MAX_QUESTION} characters.` };
  }
  const hours = typeof r.hours === "string" ? r.hours.replace(/\s+/g, " ").trim() : "";
  if (hours.length > MAX_HOURS_TEXT) return { error: `The hours line can be at most ${MAX_HOURS_TEXT} characters.` };
  return { questions, hours };
}

/* ------------------------------------------------------------------------ */
/* What the candidate's page is sent                                         */
/* ------------------------------------------------------------------------ */

export type PublicMessage = Pick<ChatMessage, "id" | "from" | "text" | "at" | "clientId">;

export interface CandidateChatState {
  /**
   * The client asked for messages from further on than exist, which only
   * happens when the conversation on the server is not the one it has — so
   * this carries the whole conversation, to replace what is on screen.
   */
  reset?: boolean;
  status: "not_started" | ChatStatus;
  /** Only messages at or after `from`, so a poll carries only what is new. */
  messages: PublicMessage[];
  /** Total messages, so the page knows what to ask for next. */
  total: number;
  startedAt?: string;
  endedReason?: "replaced" | "ended";
  recruiterTyping: boolean;
}

/* ------------------------------------------------------------------------ */
/* The inbox                                                                 */
/* ------------------------------------------------------------------------ */

/** One row of the Live chat list — what the list needs and nothing more. */
export interface ChatSummary {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidateCountry?: string;
  candidatePosition?: string;
  status: ChatStatus;
  startedAt: string;
  joinedAt?: string;
  endedAt?: string;
  endedReason?: "replaced" | "ended";
  lastMessageAt?: string;
  preview?: { from: ChatSender; text: string };
  unread: number;
  candidateOnline: boolean;
  candidateTyping: boolean;
  /** The candidate's status now — for the "Full verified" label. */
  candidateStatus?: string;
}

/** One conversation as the recruiter's Live chat tab is sent it. */
export interface AdminSessionView {
  reset?: boolean;
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
  endedReason?: "replaced" | "ended";
  messages: ChatMessage[];
  total: number;
  recruiterRead: number;
  candidateOnline: boolean;
  candidateSeenAt?: string;
  candidateTyping: boolean;
  candidateStatus?: string;
}

/**
 * Does this conversation need the recruiter? Somebody waiting, or somebody
 * who has written and not been read. The sidebar badge counts these — people,
 * not messages, so one person waiting with one message is one, not two.
 */
export function needsAttention(s: Pick<ChatSummary, "status" | "unread">): boolean {
  return s.status === "waiting" || (s.status === "active" && s.unread > 0);
}

/** A stored conversation, checked field by field before it is trusted. */
export function isChatSession(v: unknown): v is ChatSession {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<ChatSession>;
  return (
    isSessionId(s.id) &&
    typeof s.candidateId === "string" &&
    typeof s.linkSentAt === "string" &&
    typeof s.startedAt === "string" &&
    Array.isArray(s.messages)
  );
}
