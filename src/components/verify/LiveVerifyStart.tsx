"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * The live check, shown as one thing or the other.
 *
 * A phone can do this and a desktop cannot: the flow needs a camera pointed at
 * a document and then at a face. So the page does not offer both paths with
 * advice about which to take — it shows the one that works on the device in
 * front of them.
 *
 *   * on a phone: the button, and nothing at all about phones. Telling
 *     somebody holding a phone to use their phone reads as a page that has not
 *     noticed them;
 *   * on a computer: the code to scan, and no button, because pressing it
 *     there leads to a camera step that cannot be finished and a candidate who
 *     has to start again.
 *
 * The device is decided twice. The server reads the user agent, so the first
 * paint is already right and nothing flickers; the browser then checks whether
 * it actually has a coarse pointer and a small screen, which catches the
 * phones whose user agent lies — and correcting downward matters more than
 * upward, since a phone shown a QR code has nothing to scan it with.
 *
 * Opening the page is recorded by RecordOpen, which the page renders beside
 * this — it used to live here, until there was a second thing the page could
 * show and the open stopped being recorded for anyone held on the waiting
 * page.
 */
export function LiveVerifyStart({
  token,
  url,
  qrSvg,
  serverIsMobile,
}: {
  token: string;
  url: string;
  /** Pre-rendered on the server; the link never leaves us to be drawn. */
  qrSvg: string;
  serverIsMobile: boolean;
}) {
  const [isMobile, setIsMobile] = useState(serverIsMobile);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    try {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const small = window.matchMedia("(max-width: 820px)").matches;
      setIsMobile(coarse && small);
    } catch {
      /* keep whatever the user agent suggested */
    }
  }, []);

  /**
   * Hand over to the provider, at whatever session is current now.
   *
   * The destination comes back from the server rather than from this page.
   * Sessions expire at the provider long before some candidates get round to
   * opening the email, and the recruiter pastes a replacement without writing
   * to them again — so a page that has been sitting in a tab since yesterday
   * must not send them to yesterday's dead session.
   *
   * The link rendered into the page is kept as the fallback. If the request
   * fails there is nothing useful to say to a candidate about our bookkeeping,
   * and the older link is far better than a button that does nothing.
   */
  async function start() {
    setGoing(true);
    let target = url;
    try {
      const res = await fetch("/api/verify/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, phase: "started" }),
        keepalive: true,
      });
      const data = (await res.json()) as { url?: string; stale?: boolean; held?: boolean };
      // Two reasons not to hand them over, and the same answer to both: draw
      // the page again and let it say what is true now. One is a newer check
      // emailed since this page was rendered; the other is a session marked
      // dead, where the page they get back is the waiting one.
      if (data?.stale || data?.held) {
        window.location.reload();
        return;
      }
      if (typeof data?.url === "string" && data.url) target = data.url;
    } catch {
      /* never stand between them and the check */
    }
    window.location.href = target;
  }

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={() => void start()}
        disabled={going}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-4 text-base font-bold text-navy-900 transition hover:bg-brand-400 disabled:opacity-70"
      >
        <Icon name="shield" className="h-5 w-5" />
        {going ? "Opening…" : "Start verification"}
      </button>
    );
  }

  return (
    <div className="text-center">
      <div
        className="inline-block rounded-2xl border border-navy-100 bg-white p-4 shadow-sm"
        aria-label="QR code linking to your identity check"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <ol className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm leading-relaxed text-navy-600">
        {[
          "Open the camera app on your phone.",
          "Hold it up to the code above — there is nothing to install.",
          "Tap the link your phone offers, and the check starts there.",
        ].map((line, i) => (
          <li key={line} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
              {i + 1}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
