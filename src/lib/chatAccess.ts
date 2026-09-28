/**
 * SERVER-ONLY. Who a chat link belongs to, and what it may still do.
 *
 * Shared by the chat page and its API, so the two agree. The rules:
 *
 *   - A link that is not a genuine chat link, or was never on the record
 *     (a send whose email failed is undone), is invalid.
 *   - The newest link starts a chat, for seven days.
 *   - A link that has started a chat keeps working for that chat — past the
 *     seven days, and after a newer link is sent, until that newer email has
 *     actually gone out and closed it. Cutting somebody off mid-interview
 *     because a week ran out, or because an email that then failed was being
 *     sent, would be the worst moment to do it.
 *   - An older link that never started anything says a newer one was sent.
 */
import { getCandidate, type Candidate } from "@/lib/store";
import { sessionForLink } from "@/lib/chatStore";
import { readChatToken, type ChatLink } from "@/lib/token";
import type { ChatSession } from "@/lib/chat";

export type ChatAccess =
  | {
      ok: true;
      candidate: Candidate;
      link: ChatLink;
      /** The conversation this link opened, if it has opened one. */
      session: ChatSession | null;
      /** Is this the newest link — the one that may start a chat? */
      current: boolean;
    }
  | { ok: false; reason: "invalid" | "expired" | "not_found" | "replaced" };

/**
 * The candidate record, cached for a few seconds for the chat's polls.
 *
 * The page asks every couple of seconds, and the candidate file holds every
 * application. What a poll needs from it — the link on record, and that the
 * person still exists — changes rarely, and a few seconds late is harmless.
 * Anything that writes reads fresh.
 */
const CANDIDATE_TTL_MS = 5000;
const G = globalThis as unknown as { __wrChatCandidates?: Map<string, { at: number; c: Candidate | null }> };

async function candidateFor(id: string, fresh: boolean): Promise<Candidate | null> {
  const cache = (G.__wrChatCandidates ??= new Map());
  const now = Date.now();
  const hit = cache.get(id);
  if (!fresh && hit && now - hit.at < CANDIDATE_TTL_MS) return hit.c;
  const c = await getCandidate(id);
  if (cache.size > 500) cache.clear();
  cache.set(id, { at: now, c });
  return c;
}

export async function resolveChatLink(
  token: string | undefined | null,
  opts: { fresh?: boolean } = {},
): Promise<ChatAccess> {
  const read = readChatToken(token);
  if (!read.ok) return { ok: false, reason: "invalid" };

  const candidate = await candidateFor(read.link.id, !!opts.fresh);
  if (!candidate) return { ok: false, reason: "not_found" };

  const sentAt = read.link.sentAt;
  const current = candidate.chatLinkSentAt === sentAt;
  if (!current && !(candidate.chatLinks ?? []).includes(sentAt)) return { ok: false, reason: "invalid" };

  const session = await sessionForLink(candidate.id, sentAt);
  if (!session) {
    if (!current) return { ok: false, reason: "replaced" };
    if (read.expired) return { ok: false, reason: "expired" };
  }
  return { ok: true, candidate, link: read.link, session, current };
}

export const ACCESS_STATUS: Record<Exclude<ChatAccess, { ok: true }>["reason"], number> = {
  invalid: 403,
  expired: 403,
  not_found: 404,
  replaced: 409,
};
