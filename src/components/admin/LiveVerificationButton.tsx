"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  HOLD_TOO_LONG_MINUTES,
  LIVE_REASONS,
  LIVE_REASON_LABEL,
  LIVE_REASON_SUBJECT,
  LIVE_STAGE_LABEL,
  defaultLiveReason,
  liveReasonOf,
  type LiveVerificationReason,
  checkVerificationLink,
  isHeld,
  waitingFor,
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
 *
 * Once a check is out, the dialog offers two different things and defaults to
 * the quieter one. A provider session expires long before some candidates get
 * round to it, so replacing the session behind a link they already hold is the
 * ordinary case — emailing again is for when the first email never landed.
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
  offerAcceptedAt,
  onChange,
}: {
  id: string;
  fullName?: string;
  email?: string;
  initial: LiveVerificationState;
  /**
   * Whether they have actually accepted an offer.
   *
   * Only used to question the "before the agreement" wording. Nothing here
   * requires an offer — a recruiter may well want this check earlier — but
   * telling somebody at interview stage that their agreement is coming is a
   * promise nobody made.
   */
  offerAcceptedAt?: string;
  onChange?: (state: LiveVerificationState) => void;
}) {
  const [state, setState] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [url, setUrl] = useState(initial.liveVerificationUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [sent, setSent] = useState("");
  /**
   * Which of the two things pressing confirm does.
   *
   * Defaults to replacing once anything has been sent, because that is the
   * case that comes up again and again; a second email is the exception and
   * has to be chosen.
   */
  const [mode, setMode] = useState<"send" | "replace">("send");
  /**
   * "The session behind their link is dead."
   *
   * Ticked, the button stops being about a URL at all: there is no working one
   * to paste, which is the entire situation. Untick it with a new link in the
   * box and the same button lets them through again.
   */
  const [expired, setExpired] = useState(false);
  /**
   * Which of the two stories the email tells.
   *
   * The same two-minute check either way — what differs is what the candidate
   * is told happened before it. Opened on the one that fits where they are:
   * nothing sent yet means this is the ordinary pre-agreement check, and once
   * one has gone out the reason for another is that the first did not settle
   * it.
   */
  const [reason, setReason] = useState<LiveVerificationReason>(defaultLiveReason(initial));

  // Recognised on sight, or not. Either way the link can be sent — this only
  // decides whether the dialog nods at it or raises an eyebrow.
  const provider = providerFor(url.trim());
  const unknownDomain = !provider && /^https:\/\/\S+\.\S+/i.test(url.trim());

  const hasEmail = !!email?.includes("@");
  const count = state.liveVerificationCount ?? 0;
  const changes = state.liveVerificationLinkChangeCount ?? 0;
  const stage = liveVerificationStage(state);
  const replacing = mode === "replace";
  /**
   * Minutes on the waiting page, recomputed on a timer.
   *
   * It turns with the clock, so a figure worked out when the profile was
   * opened would still read "1 minute" twenty minutes later — and the line
   * that says to email them would never appear in front of somebody sitting
   * with the dialog open, which is exactly when it is needed.
   */
  const [, retick] = useState(0);
  useEffect(() => {
    if (!state.liveVerificationHeldAt) return;
    const t = setInterval(() => retick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [state.liveVerificationHeldAt]);
  // Two separate facts. `held` is a decision about the link and is usually
  // taken before the candidate has opened anything; `waiting` is null until a
  // real person is looking at the page. Reading the first and describing the
  // second is what told a recruiter somebody had waited eight minutes who had
  // never opened their email.
  const held = isHeld(state);
  const waiting = waitingFor(state);
  const waitingTooLong = waiting !== null && waiting >= HOLD_TOO_LONG_MINUTES;
  /** Marking it dead is the whole action; pasting a link is the other one. */
  const holding = replacing && expired;

  async function submit() {
    if (busy) return;

    // Holding somebody needs no link — there is no working one, which is why
    // they are being held. So the URL is not checked, and whatever is in the
    // box is left exactly as it was.
    if (holding) {
      setBusy(true);
      setProblem("");
      try {
        const res = await adminPost(`/api/admin/candidates/${id}/live-verification`, {
          action: "hold",
        });
        const data = (await res.json()) as LiveVerificationState & {
          ok?: boolean;
          error?: string;
        };
        if (data.ok) {
          const next = {
            ...state,
            liveVerificationHeldAt: data.liveVerificationHeldAt,
            // Normally undefined: holding a link is not the same as somebody
            // arriving at it. It is taken from the answer rather than assumed,
            // because a candidate can already be on the page when this is
            // ticked, and their next poll would have set it.
            liveVerificationWaitingSince: data.liveVerificationWaitingSince,
          };
          setState(next);
          setSent(
            "Marked as expired. Anyone opening their link now waits on our page until you paste a new one.",
          );
          setAsking(false);
          onChange?.(next);
        } else if (data.error === "never_sent") {
          setProblem("Nothing has been sent to them yet, so there is nobody to hold.");
        } else {
          setProblem(`Could not save (${data.error ?? "unknown"}).`);
        }
      } catch {
        setProblem("Could not save. Please try again.");
      }
      setBusy(false);
      return;
    }

    // Checked here so the recruiter is told without a round trip, and again on
    // the server, because this endpoint emails a link to a real person.
    const link = checkVerificationLink(url);
    if (!link.ok) {
      setProblem(link.problem);
      return;
    }
    if (!replacing && !hasEmail) {
      setProblem("No email address on file, so nothing can be emailed. The link can still be replaced.");
      return;
    }
    setBusy(true);
    setProblem("");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/live-verification`, {
        url: link.url,
        action: replacing ? "replace" : "send",
        // Only meaningful on a send. A replacement leaves the email that is
        // already in their inbox exactly as it was, so the story it told
        // stands and the server keeps the stored reason untouched.
        ...(replacing ? {} : { reason }),
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
          // A replacement keeps whatever they had already done with the link,
          // and clears the start — so the panel has to be told both, or it
          // would go on claiming they had started a session that is gone.
          liveVerificationOpenedAt: replacing
            ? data.liveVerificationOpenedAt
            : state.liveVerificationOpenedAt,
          liveVerificationStartedAt: replacing ? data.liveVerificationStartedAt : undefined,
          liveVerificationLinkChangedAt: data.liveVerificationLinkChangedAt,
          liveVerificationLinkChangeCount: data.liveVerificationLinkChangeCount,
          // Both paths end the wait: a replacement is what the waiting page
          // was waiting for, and a fresh email is a fresh link.
          liveVerificationHeldAt: undefined,
          liveVerificationWaitingSince: undefined,
        };
        setState(next);
        setSent(
          replacing
            ? state.liveVerificationHeldAt
              ? "Link replaced. Anyone on the waiting page will be let through within a few seconds."
              : "Link replaced. Their email still works and points at the new session."
            : "Live verification link emailed.",
        );
        setAsking(false);
        onChange?.(next);
      } else if (data.error === "never_sent") {
        setProblem("Nothing has been sent to them yet, so there is no link to replace.");
      } else {
        setProblem(data.problem ?? `Not sent (${data.error ?? "unknown"}).`);
      }
    } catch {
      setProblem("Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setProblem("");
          setSent("");
          setUrl(state.liveVerificationUrl ?? "");
          // Replacing is the common case once one is out; a second email has
          // to be asked for.
          setMode(count ? "replace" : "send");
          setReason(defaultLiveReason(state));
          setExpired(!!state.liveVerificationHeldAt);
          setAsking(true);
        }}
        // Replacing needs no address, and anyone with a check out has already
        // been emailed once — so a missing address only blocks a new send.
        disabled={(!hasEmail && !count) || busy}
        title={
          count
            ? "Point their link at a new session, or email it again"
            : hasEmail
              ? "Email them a verification link to complete on their phone"
              : "No email on file"
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-40"
      >
        <Icon name="phone" className="h-3.5 w-3.5" />
        {count ? "Replace or resend link" : "Start live verification"}
      </button>

      {/* Sent, opened and started are three different problems, so the panel
          says which one this candidate is. */}
      {count ? (
        <p className="w-full text-xs text-navy-500">
          <span className="font-semibold text-navy-700">Live check:</span>{" "}
          {LIVE_STAGE_LABEL[stage]}
          {/* Which story they were told, because it decides what to send next
              and there is no way to tell from the stage alone. */}
          {` · ${LIVE_REASON_LABEL[liveReasonOf(state)].toLowerCase()}`} · sent{" "}
          {fmtShort(state.liveVerificationSentAt)}
          {count > 1 ? ` · ${count}×` : ""}
          {changes
            ? ` · link replaced ${changes > 1 ? `${changes}× ` : ""}${fmtShort(
                state.liveVerificationLinkChangedAt,
              )}`
            : ""}
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

      {/* Somebody is sitting in front of a holding message right now. The one
          state on this panel that is costing a real person their time, so it
          is a line of its own rather than a word in the status above — and
          once the page has stopped promising them a couple of minutes, it says
          what has to happen next. */}
      {held ? (
        <p
          className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            waitingTooLong
              ? "border-red-200 bg-red-50 font-medium text-red-800"
              : waiting !== null
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-navy-200 bg-navy-50 text-navy-600"
          }`}
        >
          <Icon name="clock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {waiting === null ? (
              /* Held, and nobody has turned up. The ordinary case, and the one
                 that used to be described as an emergency: the session is
                 marked dead before the candidate opens their email far more
                 often than after. Nothing is owed to anybody yet. */
              <>
                <strong>Held — nobody is waiting yet.</strong> They have not opened their link. When
                they do, they will see the page that says we are preparing it, and the wait starts
                from then.
              </>
            ) : waitingTooLong ? (
              <>
                <strong>
                  Waiting {waiting} minute{waiting === 1 ? "" : "s"} on the page that says we are
                  preparing it.
                </strong>{" "}
                They have been told it is taking longer than expected and that we will email them.
                Send them a new link.
              </>
            ) : (
              <>
                <strong>
                  On the waiting page
                  {waiting > 0 ? ` — ${waiting} minute${waiting === 1 ? "" : "s"}` : " just now"}.
                </strong>{" "}
                Paste a working link to let them through.
              </>
            )}
          </span>
        </p>
      ) : null}

      {sent ? <p className="w-full text-xs font-medium text-green-700">{sent}</p> : null}

      <ConfirmDialog
        open={asking}
        icon="phone"
        title={
          holding
            ? "Hold them on a waiting page?"
            : replacing
              ? "Replace their verification link?"
              : count
                ? "Send another live check?"
                : "Send a live identity check?"
        }
        confirmLabel={
          holding ? "Hold them on a waiting page" : replacing ? "Replace link" : "Send link"
        }
        busy={busy}
        warning={
          !replacing && count
            ? `${count === 1 ? "One has" : `${count} have`} already been sent, the last on ${fmt(
                state.liveVerificationSentAt,
              )}. This sends another email.`
            : undefined
        }
        onCancel={() => setAsking(false)}
        onConfirm={() => void submit()}
        body={
          <div>
            {/* The two are different enough to be chosen rather than inferred:
                one changes a destination quietly, the other writes to a real
                person. Both from one dialog, because the thing being pasted is
                the same and picking the wrong button is the mistake worth
                making impossible. */}
            {count ? (
              <div className="mb-3 flex gap-2">
                {([
                  ["replace", "Replace the link only"],
                  ["send", "Send a new email"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      mode === value
                        ? "border-brand-400 bg-brand-50 text-brand-900"
                        : "border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Which story the email tells. Shown only when one is actually
                being sent: a replacement changes nothing in anybody's inbox,
                and offering the choice there would suggest otherwise. */}
            {!replacing && !holding ? (
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-navy-500">
                  What the email says
                </p>
                <div className="flex gap-2">
                  {LIVE_REASONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReason(value)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${
                        reason === value
                          ? "border-brand-400 bg-brand-50"
                          : "border-navy-200 bg-white hover:bg-navy-50"
                      }`}
                    >
                      <span
                        className={`block text-xs font-bold ${
                          reason === value ? "text-brand-900" : "text-navy-700"
                        }`}
                      >
                        {LIVE_REASON_LABEL[value]}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-navy-500">
                        {value === "agreement"
                          ? "Nothing has gone wrong — the check before an agreement."
                          : "They tried, and it did not settle the question."}
                      </span>
                    </button>
                  ))}
                </div>
                {/* The exact words that will land, so nobody has to remember
                    which option writes which subject line. */}
                <p className="mt-2 text-xs text-navy-500">
                  Subject:{" "}
                  <span className="font-medium text-navy-800">
                    &ldquo;{LIVE_REASON_SUBJECT[reason]}&rdquo;
                  </span>
                </p>
                {/* Not blocked, because a recruiter may have good reason to
                    ask early — but "your agreement" said to somebody who has
                    not been offered anything is a promise nobody made. */}
                {reason === "agreement" && !offerAcceptedAt ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <strong className="font-semibold">They have not accepted an offer.</strong> This
                    email tells them an agreement is coming. Send it anyway if that is where they
                    are heading, or choose the other wording.
                  </p>
                ) : null}
              </div>
            ) : null}

            {holding ? (
              <p>
                Anyone opening{" "}
                <strong className="text-navy-900">{fullName || "this candidate"}</strong>&rsquo;s
                link will see{" "}
                <span className="font-medium text-navy-800">
                  &ldquo;we are preparing your verification page&rdquo;
                </span>{" "}
                instead of a button that ends at a closed session.{" "}
                <span className="font-medium text-navy-800">No email is sent.</span> Their page
                checks every few seconds and lets them through on its own the moment you come back
                here and paste a working link.
              </p>
            ) : replacing ? (
              <p>
                The link already in{" "}
                <strong className="text-navy-900">{fullName || "this candidate"}</strong>&rsquo;s
                inbox will point at this new session instead.{" "}
                <span className="font-medium text-navy-800">No email is sent</span> — their
                existing link keeps working, so an expired session at the provider costs them
                nothing. If they had started the old session that is cleared, so you will be told
                again when they start this one.
              </p>
            ) : (
              <p>
                <strong className="text-navy-900">{fullName || "This candidate"}</strong>
                {email ? (
                  <>
                    {" "}
                    at <span className="font-medium text-navy-800">{email}</span>
                  </>
                ) : null}{" "}
                will be emailed a link to verify their identity on their phone, with their
                photograph step and a live selfie. Their uploaded photos are left exactly as they
                are.
              </p>
            )}

            {/* The two situations in one tick: either there is a working link
                to paste, or there is not and somebody has to wait. Ticked, the
                box below stops mattering — and saying so is better than
                leaving a field that looks required and is not. */}
            {replacing ? (
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-navy-200 bg-cream-50 p-3">
                <input
                  type="checkbox"
                  checked={expired}
                  onChange={(e) => {
                    setExpired(e.target.checked);
                    setProblem("");
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-navy-300 text-brand-600"
                />
                <span className="text-xs leading-relaxed text-navy-700">
                  <span className="font-bold text-navy-900">This link has expired</span> — hold
                  them on a waiting page until I paste a new one.
                  <span className="mt-0.5 block text-navy-500">
                    Untick it, paste the new link, and they are let through.
                  </span>
                </span>
              </label>
            ) : null}

            <label
              className={`mt-3 block text-xs font-bold text-navy-700 ${
                holding ? "pointer-events-none opacity-40" : ""
              }`}
            >
              {replacing ? "The new link from your provider" : "Their verification link"}
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
            {holding ? (
              <p className="mt-1.5 text-xs text-navy-500">
                No link is needed while they are held. Whatever is in the box is left as it is.
              </p>
            ) : provider ? (
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
