"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  LIVE_STAGE_LABEL,
  checkVerificationLink,
  liveVerificationStage,
  providerFor,
  type LiveVerificationState,
} from "@/lib/liveVerification";

/**
 * Send a candidate a live identity check.
 *
 * Used when photographs could not settle the question: the recruiter creates a
 * session for that one person with whichever provider they are using and
 * pastes its link here, and we email it to them wrapped in our own page.
 *
 * Every send is deliberate. There is a link to paste, so the dialog always
 * opens, and where one has already gone out it says how many and when —
 * whatever the interval. Each inquiry costs money and each email lands in a
 * real person's inbox, and a count seen before pressing is what stops a second
 * one going out by accident.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function LiveVerificationButton({
  id,
  fullName,
  email,
  initial,
  onChange,
}: {
  id: string;
  fullName?: string;
  email?: string;
  initial: LiveVerificationState;
  onChange?: (state: LiveVerificationState) => void;
}) {
  const [state, setState] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [url, setUrl] = useState(initial.liveVerificationUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [sent, setSent] = useState(false);

  // Recognised on sight, or not. Either way the link can be sent — this only
  // decides whether the dialog nods at it or raises an eyebrow.
  const provider = providerFor(url.trim());
  const unknownDomain = !provider && /^https:\/\/\S+\.\S+/i.test(url.trim());

  const hasEmail = !!email?.includes("@");
  const count = state.liveVerificationCount ?? 0;
  const stage = liveVerificationStage(state);

  async function send() {
    if (busy) return;
    // Checked here so the recruiter is told without a round trip, and again on
    // the server, because this endpoint emails a link to a real person.
    const link = checkVerificationLink(url);
    if (!link.ok) {
      setProblem(link.problem);
      return;
    }
    setBusy(true);
    setProblem("");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/live-verification`, {
        url: link.url,
      });
      const data = (await res.json()) as LiveVerificationState & {
        ok?: boolean;
        error?: string;
        problem?: string;
      };
      if (data.ok) {
        const next: LiveVerificationState = {
          liveVerificationUrl: data.liveVerificationUrl,
          liveVerificationSentAt: data.liveVerificationSentAt,
          liveVerificationCount: data.liveVerificationCount,
        };
        setState(next);
        setSent(true);
        setAsking(false);
        onChange?.(next);
      } else {
        setProblem(data.problem ?? `Not sent (${data.error ?? "unknown"}).`);
      }
    } catch {
      setProblem("Could not send. Please try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setProblem("");
          setSent(false);
          setUrl(state.liveVerificationUrl ?? "");
          setAsking(true);
        }}
        disabled={!hasEmail || busy}
        title={
          hasEmail
            ? "Email them a verification link to complete on their phone"
            : "No email on file"
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-40"
      >
        <Icon name="phone" className="h-3.5 w-3.5" />
        {count ? "Send live check again" : "Start live verification"}
      </button>

      {/* Sent, opened and started are three different problems, so the panel
          says which one this candidate is. */}
      {count ? (
        <p className="w-full text-xs text-navy-500">
          <span className="font-semibold text-navy-700">Live check:</span>{" "}
          {LIVE_STAGE_LABEL[stage]} · sent {fmtShort(state.liveVerificationSentAt)}
          {count > 1 ? ` · ${count}×` : ""}
          {state.liveVerificationUrl ? (
            <>
              {" · "}
              <a
                href={state.liveVerificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                open their link
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {sent ? (
        <p className="w-full text-xs font-medium text-green-700">
          Live verification link emailed.
        </p>
      ) : null}

      <ConfirmDialog
        open={asking}
        icon="phone"
        title={count ? "Send another live check?" : "Send a live identity check?"}
        confirmLabel="Send link"
        busy={busy}
        warning={
          count
            ? `${count === 1 ? "One has" : `${count} have`} already been sent, the last on ${fmt(
                state.liveVerificationSentAt,
              )}.`
            : undefined
        }
        onCancel={() => setAsking(false)}
        onConfirm={() => void send()}
        body={
          <div>
            <p>
              <strong className="text-navy-900">{fullName || "This candidate"}</strong>
              {email ? (
                <>
                  {" "}
                  at <span className="font-medium text-navy-800">{email}</span>
                </>
              ) : null}{" "}
              will be emailed a link to verify their identity on their phone, with their photograph
              step and a live selfie. Their uploaded photos are left exactly as they are.
            </p>

            <label className="mt-3 block text-xs font-bold text-navy-700">
              Their verification link
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setProblem("");
                }}
                placeholder="https://…"
                className="input mt-1.5 !py-2 text-sm font-normal"
              />
            </label>

            {/* Any provider — Persona, Onfido, Veriff, whoever this candidate
                was set up with. The domain is read back rather than ruled on,
                because the mistake worth catching is a link pasted from the
                wrong browser tab, and only the person who created it knows
                which tab was right. */}
            {provider ? (
              <p className="mt-1.5 text-xs font-medium text-green-700">
                Recognised as a {provider} link.
              </p>
            ) : unknownDomain ? (
              <p className="mt-1.5 text-xs font-medium text-amber-700">
                We do not recognise this domain. It will still be sent — check it is the link your
                verification provider gave you for this candidate.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-navy-500">
                Create the session for this candidate with your verification provider and paste its
                link here. Any provider is fine.
              </p>
            )}

            {problem ? (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {problem}
              </p>
            ) : null}
          </div>
        }
      />
    </>
  );
}
