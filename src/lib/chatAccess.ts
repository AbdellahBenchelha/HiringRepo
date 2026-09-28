/**
 * SERVER-ONLY. Who a chat link belongs to, and whether it still works.
 *
 * Shared by the chat page and its API, so the two turn a link away for the
 * same reasons: it is not a chat link, it is older than seven days, the
 * candidate is gone, or a newer link has been sent since.
 */
import { getCandidate, type Candidate } from "@/lib/store";
import { readChatToken, type ChatLink } from "@/lib/token";

export type ChatAccess =
  | { ok: true; candidate: Candidate; link: ChatLink }
  | { ok: false; reason: "invalid" | "expired" | "not_found" | "replaced" };

export async function resolveChatLink(token: string | undefined | null): Promise<ChatAccess> {
  const read = readChatToken(token);
  if (!read.ok) return { ok: false, reason: read.reason };
  const candidate = await getCandidate(read.link.id);
  if (!candidate) return { ok: false, reason: "not_found" };
  // Only the newest link opens a chat. An older email still in the inbox leads
  // to a page that says so, rather than to a conversation nobody is watching.
  if (candidate.chatLinkSentAt !== read.link.sentAt) return { ok: false, reason: "replaced" };
  return { ok: true, candidate, link: read.link };
}

export const ACCESS_STATUS: Record<Exclude<ChatAccess, { ok: true }>["reason"], number> = {
  invalid: 403,
  expired: 403,
  not_found: 404,
  replaced: 409,
};
