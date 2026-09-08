"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * The button that hands a candidate over to the verification provider.
 *
 * Two jobs. It records that they opened the page, from the browser rather than
 * the server render, because mail scanners fetch every link in an email and a
 * page that counted them would report everybody as having opened their check
 * seconds after it was sent. And it records the moment they actually press
 * through, which is a different fact: "read it and did nothing" is a person to
 * talk to, "started and stopped" is an answer already sitting in the
 * provider's dashboard.
 *
 * The bookkeeping never blocks the candidate. If the beacon fails they still
 * go, because the point of the page is the handover, not the counting.
 */
export function LiveVerifyStart({ token, url }: { token: string; url: string }) {
  const [going, setGoing] = useState(false);

  useEffect(() => {
    void fetch("/api/verify/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, phase: "opened" }),
    }).catch(() => {
      /* bookkeeping only */
    });
  }, [token]);

  async function start() {
    setGoing(true);
    try {
      await fetch("/api/verify/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, phase: "started" }),
        keepalive: true,
      });
    } catch {
      /* never stand between them and the check */
    }
    window.location.href = url;
  }

  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={going}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-base font-bold text-navy-900 transition hover:bg-brand-400 disabled:opacity-70 sm:w-auto sm:px-10"
    >
      <Icon name="shield" className="h-5 w-5" />
      {going ? "Opening…" : "Start verification"}
    </button>
  );
}
