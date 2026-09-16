"use client";

import { useEffect } from "react";

/**
 * Records that a person — not a mail scanner — opened their live check page.
 *
 * Rendered once by the page, beside whichever panel it decides to show, and
 * deliberately not inside either of them. It used to live in the Start button,
 * which was fine until there was a second thing the page could show: the
 * waiting panel has no Start button, so the open would have gone unrecorded
 * exactly when it matters most — somebody held on a waiting page is the one
 * candidate a recruiter needs to be told about.
 *
 * From the browser rather than the server render, because an email link is
 * fetched by mail scanners and link previews before any person sees it, and a
 * page that counted those would report every candidate as having opened their
 * check within seconds of it being sent.
 *
 * Renders nothing and reports nothing back. The candidate cannot act on our
 * bookkeeping either way.
 */
export function RecordOpen({ token }: { token: string }) {
  useEffect(() => {
    if (!token) return;
    void fetch("/api/verify/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, phase: "opened" }),
    }).catch(() => {
      /* bookkeeping only */
    });
  }, [token]);

  return null;
}
