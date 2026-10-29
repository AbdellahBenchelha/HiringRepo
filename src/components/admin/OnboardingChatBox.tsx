"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { CandidateView } from "@/lib/candidateView";

/**
 * After the signed agreement is accepted: invite them to an onboarding chat,
 * where the portal login is sent and the portal explained (Live chat tab).
 *
 * Sending a chat link retires the one before, whichever kind — by now the
 * interview is long over, so that only ever closes an older onboarding link.
 */

const ERRORS: Record<string, string> = {
  warmup_limit: "today's sending limit is reached — try again after it resets",
  no_email: "no email address on file",
  too_soon: "an invitation went less than a minute ago",
  agreement_not_accepted: "accept the signed agreement first",
  fake_recipient: "the email address is not a real mailbox",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function OnboardingChatBox({
  candidate,
  onChange,
}: {
  candidate: CandidateView;
  onChange: (patch: Partial<CandidateView>) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const invites = candidate.onboardingChatLinks ?? [];
  const last = invites.at(-1);
  // Still the live link? A newer link of the other kind would have replaced it.
  const current = !!last && candidate.chatLinkSentAt === last;
  const hasEmail = !!candidate.email?.includes("@");

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/chat`, { action: "onboarding" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        chatLinkSentAt?: string;
        chatLinks?: string[];
        onboardingChatLinks?: string[];
      };
      if (data.ok) {
        onChange({ chatLinkSentAt: data.chatLinkSentAt, chatLinks: data.chatLinks, onboardingChatLinks: data.onboardingChatLinks });
        setResult({ ok: true, text: "Invitation sent. They appear in Live chat when they press Start chat." });
      } else {
        const why = res.status === 401 ? "your admin session has expired — sign in again" : ERRORS[data.error ?? ""] ?? data.error ?? "failed";
        setResult({ ok: false, text: `Not sent (${why}).` });
      }
    } catch {
      setResult({ ok: false, text: "Could not reach the server." });
    }
    setBusy(false);
    setConfirm(false);
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-brand-200 bg-brand-50/40 p-4" data-onboarding-chat={last ? "sent" : "not_sent"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
            <Icon name="chat" className="h-4 w-4 text-brand-600" /> Next step: onboarding chat
          </p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-navy-600">
            A live chat where you send their team portal login and explain the portal. They get an email
            with a <strong>Start chat</strong> button; you get a Telegram message when they start.
          </p>
          {last ? (
            <p className="mt-2 text-xs font-medium text-navy-700" data-onboarding-chat-sent>
              <Icon name="mail" className="mr-1 inline h-3 w-3 align-[-2px]" />
              Invitation sent {fmt(last)}
              {invites.length > 1 ? ` (${invites.length} sent in total)` : ""}
              {current ? "" : " · replaced by a newer chat link"}.{" "}
              <Link href="/admin/chat" className="font-semibold text-brand-700 underline">
                Open Live chat
              </Link>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy || !hasEmail}
          onClick={() => setConfirm(true)}
          data-onboarding-chat-send
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-bold text-navy-900 transition hover:bg-brand-400 disabled:opacity-50"
        >
          <Icon name="send" className="h-4 w-4" />
          {last ? "Send invitation again" : "Invite to onboarding chat"}
        </button>
      </div>
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          data-onboarding-chat-result={result.ok ? "ok" : "error"}
          className={`mt-2 text-xs font-semibold ${result.ok ? "text-green-700" : "text-red-700"}`}
        >
          {result.text}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirm}
        icon="chat"
        title={last ? "Send the onboarding invitation again?" : "Invite to the onboarding chat?"}
        confirmLabel={busy ? "Sending…" : "Send invitation"}
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void send()}
        body={
          <>
            {candidate.fullName || "The candidate"} gets the email{" "}
            <strong className="text-navy-900">&ldquo;Welcome to WorkRoute — let&rsquo;s get you started&rdquo;</strong> at{" "}
            {candidate.email} with their personal chat link (valid 7 days).
            {last ? <span className="mt-2 block">The link sent before stops working, and a chat open from it is closed.</span> : null}
          </>
        }
      />
    </div>
  );
}
