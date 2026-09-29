import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import {
  getCandidate,
  recordChatLink,
  recordLiveReminder,
  revertChatLink,
  revertLiveReminder,
  type Candidate,
} from "@/lib/store";
import { closeOlderSessions, getChatSettings, sessionForLink, sessionsForCandidate } from "@/lib/chatStore";
import { REMINDER_MIN_GAP_MS, chatStatus, type LiveReminder } from "@/lib/chat";
import { CHAT_LINK_TTL_DAYS, createChatToken } from "@/lib/token";
import { sendEmail } from "@/lib/email";
import {
  chatLiveNowHtml,
  chatLiveNowSubject,
  chatLiveNowText,
  finalChatHtml,
  finalChatSubject,
  finalChatText,
} from "@/lib/emailTemplates";
import { forgetCandidateStatuses } from "@/lib/chatAccess";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { newId } from "@/lib/id";
import { campaignBlocked } from "@/lib/warmupStore";
import { siteConfig } from "@/config/site";

/**
 * A candidate's final-interview chat, from View info.
 *
 *   GET   their conversations (transcripts) and the current link
 *   POST  email a new chat link — which retires any earlier one
 *   POST  {action:"remind"}  "our team is live now" — the same link, or a fresh
 *         one if it has expired and never opened a chat
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function linkFor(req: NextRequest, id: string, sentAt: string) {
  return `${baseUrl(req)}/chat?t=${encodeURIComponent(createChatToken({ id, sentAt }))}`;
}

function linkLive(sentAt?: string): boolean {
  if (!sentAt) return false;
  const t = Date.parse(sentAt);
  return !Number.isNaN(t) && Date.now() - t <= CHAT_LINK_TTL_DAYS * 24 * 60 * 60 * 1000;
}

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
  const parsed = req.headers.get("content-length") === "0" ? null : await readJsonBody<{ action?: string } | null>(req, 4 * 1024);
  if (parsed && !parsed.ok) return badBodyResponse(parsed.reason);
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  if (parsed?.data?.action === "remind") return remind(req, candidate, email, by);
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

/**
 * "Our recruitment team is live now" — for somebody who has a chat link but is
 * not on the page while the recruiter is.
 *
 * The same link as before, so nothing about their chat changes. Only when that
 * link has run out without ever opening a chat is a fresh one sent in its place
 * (which retires it, exactly as "Send a new chat link" would). A chat that has
 * already ended is refused: the page would only say so.
 */
async function remind(req: NextRequest, candidate: Candidate, email: string, by: string) {
  const id = candidate.id;
  const current = candidate.chatLinkSentAt;
  if (!current) return NextResponse.json({ ok: false, error: "no_link" }, { status: 409 });

  const session = await sessionForLink(id, current);
  if (session?.endedAt) return NextResponse.json({ ok: false, error: "ended" }, { status: 409 });

  const last = (candidate.liveReminders ?? []).at(-1);
  if (last && Date.now() - Date.parse(last.sentAt) < REMINDER_MIN_GAP_MS) {
    return NextResponse.json({ ok: false, error: "too_soon" }, { status: 409 });
  }
  if (await campaignBlocked()) {
    return NextResponse.json({ ok: false, error: "warmup_limit" }, { status: 429 });
  }

  const now = new Date().toISOString();
  // A started chat keeps its link working past the seven days; only a link
  // that never opened anything needs replacing.
  const newLink = !session && !linkLive(current);
  let linkSentAt = current;
  let updated: Candidate | null = candidate;
  if (newLink) {
    linkSentAt = now;
    updated = await recordChatLink(id, linkSentAt);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Recorded before the send, so a candidate who clicks at once is recognised.
  const reminder: LiveReminder = { id: newId(12), sentAt: now, by, linkSentAt };
  updated = (await recordLiveReminder(id, reminder)) ?? updated;

  const chatUrl = `${linkFor(req, id, linkSentAt)}&r=${reminder.id}`;
  const payload = {
    fullName: candidate.fullName || "Candidate",
    chatUrl,
    newLink,
    validDays: CHAT_LINK_TTL_DAYS,
  };
  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: chatLiveNowSubject(),
    html: chatLiveNowHtml(payload),
    text: chatLiveNowText(payload),
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
  });

  if (!result.ok) {
    await revertLiveReminder(id, reminder.id);
    if (newLink) await revertChatLink(id, linkSentAt);
    forgetCandidateStatuses();
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[chat] "we're live" email for ${id} not sent: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  if (newLink) await closeOlderSessions(id, linkSentAt);
  forgetCandidateStatuses(); // the Live chat header shows it on its next poll
  // eslint-disable-next-line no-console
  console.log(`[chat] "we're live" email to ${id} by ${by}${newLink ? " (with a fresh link)" : ""}`);
  return NextResponse.json({
    ok: true,
    newLink,
    reminder,
    reminders: (updated.liveReminders ?? []).filter((r) => r.linkSentAt === linkSentAt),
    chatLinkSentAt: updated.chatLinkSentAt,
    chatLinks: updated.chatLinks,
    link: linkFor(req, id, linkSentAt),
  });
}
