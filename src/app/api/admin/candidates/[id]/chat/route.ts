import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordChatLink, revertChatLink } from "@/lib/store";
import { closeOlderSessions, getChatSettings, sessionsForCandidate } from "@/lib/chatStore";
import { CHAT_LINK_TTL_DAYS, chatStatus } from "@/lib/chat";
import { sendEmail } from "@/lib/email";
import { finalChatHtml, finalChatSubject, finalChatText } from "@/lib/emailTemplates";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { campaignBlocked } from "@/lib/warmupStore";
import { siteConfig } from "@/config/site";
import {
  REFUSAL_STATUS,
  chatLinkLive,
  chatLinkUrl,
  sendChatReminder,
  type ChatReminderRefusal,
} from "@/lib/chatReminderSend";

/**
 * A candidate's final-interview chat, from View info.
 *
 *   GET   their conversations (transcripts) and the current link
 *   POST  email a new chat link — which retires any earlier one
 *   POST  {action:"remind", kind?:"live"|"nudge"}  "our team is live now", or
 *         "you have not started yet" — see lib/chatReminderSend
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

const linkFor = (req: NextRequest, id: string, sentAt: string) => chatLinkUrl(baseUrl(req), id, sentAt);
const linkLive = chatLinkLive;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const sessions = (await sessionsForCandidate(id))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((s) => ({
      id: s.id,
      status: chatStatus(s),
      linkSentAt: s.linkSentAt,
      startedAt: s.startedAt,
      joinedAt: s.joinedAt,
      endedAt: s.endedAt,
      endedReason: s.endedReason,
      messages: s.messages,
    }));
  const sentAt = candidate.chatLinkSentAt;
  return NextResponse.json(
    {
      ok: true,
      sessions,
      link: sentAt && linkLive(sentAt) ? linkFor(req, id, sentAt) : undefined,
      linkSentAt: sentAt,
      linkExpired: !!sentAt && !linkLive(sentAt),
      reminders: sentAt ? (candidate.liveReminders ?? []).filter((r) => r.linkSentAt === sentAt) : [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  // No body at all still means "send a link", as it always has.
  const parsed = req.headers.get("content-length") === "0" ? null : await readJsonBody<{ action?: string; kind?: string } | null>(req, 4 * 1024);
  if (parsed && !parsed.ok) return badBodyResponse(parsed.reason);
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  if (parsed?.data?.action === "remind") {
    return remind(req, id, parsed.data.kind === "nudge" ? "nudge" : "live", by);
  }
  // Asked before the write, so a held email never retires a working link.
  if (await campaignBlocked()) {
    return NextResponse.json({ ok: false, error: "warmup_limit" }, { status: 429 });
  }

  // Recorded first: the page reads the link back from the record, and a
  // candidate who opens the email at once must not beat the write.
  const sentAt = new Date().toISOString();
  const updated = await recordChatLink(id, sentAt);
  if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const settings = await getChatSettings();
  const chatUrl = linkFor(req, id, sentAt);
  const payload = {
    fullName: updated.fullName || "Candidate",
    chatUrl,
    position: updated.offer?.position || updated.position || undefined,
    hours: settings.hours || undefined,
    validDays: CHAT_LINK_TTL_DAYS,
  };
  const result = await sendEmail({
    to: email,
    toName: updated.fullName || undefined,
    subject: finalChatSubject(),
    html: finalChatHtml(payload),
    text: finalChatText(payload),
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
  });

  if (!result.ok) {
    // Nobody was told, so the earlier link stays the working one.
    await revertChatLink(id, sentAt);
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[chat] link for ${id} not sent: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  // Only now is the old link really replaced — close what it had open.
  const closed = await closeOlderSessions(id, sentAt);
  // eslint-disable-next-line no-console
  console.log(`[chat] link sent to ${id} by ${by}${closed ? ` (closed ${closed} older chat)` : ""}`);
  return NextResponse.json({
    ok: true,
    chatLinkSentAt: sentAt,
    chatLinks: updated.chatLinks,
    link: chatUrl,
  });
}

async function remind(req: NextRequest, id: string, kind: "live" | "nudge", by: string) {
  const out = await sendChatReminder(id, baseUrl(req), { kind, by });
  if (!out.ok) {
    const status = out.refused ? REFUSAL_STATUS[out.reason as ChatReminderRefusal] ?? 409 : 502;
    return NextResponse.json({ ok: false, error: out.reason }, { status });
  }
  return NextResponse.json(out);
}
