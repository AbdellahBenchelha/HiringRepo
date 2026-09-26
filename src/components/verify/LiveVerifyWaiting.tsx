"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { HOLD_TOO_LONG_MINUTES } from "@/lib/liveVerification";

/**
 * What a candidate sees while there is no working session to send them to.
 *
 * Provider sessions expire, often before the person gets round to opening the
 * email. Handing them a button that ends at a closed session is the worst of
 * the options — they arrive somewhere broken, on a domain they have never
 * heard of, having been asked to photograph their passport. So the recruiter
 * marks the session dead and the candidate waits here instead, on our page,
 * with an explanation.
 *
 * It lets itself out. Asking somebody to wait one to three minutes and then
 * expecting them to know to press reload is asking them to do our job, so the
 * page checks every few seconds and turns into the real thing on its own.
 *
 * And it stops claiming "one to three minutes" once that is no longer true.
 * A page that goes on promising the same two minutes for half an hour teaches
 * people that nothing we say is worth reading.
 */

/** How often to ask. Fast enough to feel immediate, slow enough to be polite. */
const POLL_MS = 5000;

/** Long enough that nobody is still watching. A tab left open must not poll forever. */
const GIVE_UP_MS = 20 * 60 * 1000;

export function LiveVerifyWaiting({
  token,
  /** Minutes they had already been waiting when this page was drawn. */
  heldMinutes,
}: {
  token: string;
  heldMinutes: number;
}) {
  const [minutes, setMinutes] = useState(heldMinutes);
  const [stopped, setStopped] = useState(false);

  // Counted here as well as on the server, because somebody who opens the page
  // one minute in is still sitting there four minutes later and the message
  // has to change under them.
  useEffect(() => {
    const t = setInterval(() => setMinutes((m) => m + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const startedAt = Date.now();

    async function look() {
      if (cancelled) return;
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setStopped(true);
        return;
      }
      try {
        const res = await fetch(`/api/verify/live/status?t=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { held?: boolean };
        // Ready. Reload rather than draw the check here: the page builds a QR
        // code and reads the link on the server, and one of those has to be
        // the only place it happens.
        if (!cancelled && data && data.held === false) {
          window.location.reload();
          return;
        }
      } catch {
        /* the next look will do */
      }
      if (!cancelled) timer = window.setTimeout(() => void look(), POLL_MS);
    }

    let timer = window.setTimeout(() => void look(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [token]);

  const late = minutes >= HOLD_TOO_LONG_MINUTES;

  return (
    <div className="rounded-2xl border border-navy-100 bg-cream-100 p-6 text-center">
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
          late ? "bg-navy-100 text-navy-600" : "bg-brand-100 text-brand-800"
        }`}
      >
        <Icon name={late ? "mail" : "clock"} className="h-6 w-6" />
      </span>

      {late ? (
        <>
          <h2 className="mt-4 text-lg font-bold text-navy-900">
            This is taking longer than we expected
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-navy-600">
            You can close this page — we will email you as soon as it is ready. Nothing you have
            already sent us is affected, and you will not have to start again.
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-4 text-lg font-bold text-navy-900">
            We are preparing your verification page
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-navy-600">
            This usually takes a few minutes. Please keep this page open — it will continue on its
            own, and there is nothing for you to press.
          </p>
        </>
      )}

      {/* Something moving, so the page does not read as frozen. Hidden once we
          have stopped looking, because a spinner that means nothing is worse
          than none. */}
      {!stopped && !late ? (
        <span
          aria-hidden
          className="mx-auto mt-5 block h-1.5 w-32 overflow-hidden rounded-full bg-brand-200"
        >
          <span className="block h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
        </span>
      ) : null}

      <p className="mt-5 text-xs text-navy-400">
        {stopped
          ? "This page has stopped checking. Open the link from your email again whenever you like."
          : "Checking every few seconds."}
      </p>
    </div>
  );
}
