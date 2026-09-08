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
 * Opening the page is recorded either way, from here rather than the server
 * render: mail scanners fetch every link in an email, and counting those would
 * report every candidate as having opened their check seconds after it was
 * sent.
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
    void fetch("/api/verify/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, phase: "opened" }),
    }).catch(() => {
      /* bookkeeping only */
    });
  }, [token]);

  useEffect(() => {
    try {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const small = window.matchMedia("(max-width: 820px)").matches;
      setIsMobile(coarse && small);
    } catch {
      /* keep whatever the user agent suggested */
    }
  }, []);

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
