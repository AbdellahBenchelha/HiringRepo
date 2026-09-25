"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One email, shown the way it arrives.
 *
 * The HTML goes into a sandboxed frame rather than into the page. These are
 * complete documents with their own <html>, <body> and inline styles, written
 * for mail clients; dropped into the Admin Panel they would fight its
 * stylesheet and render as something no candidate ever saw. The frame keeps
 * them exactly as sent, and the sandbox means nothing in them can run.
 *
 * `allow-same-origin` is granted — and only that — so the frame can be sized to
 * its content. Without it the panel cannot read the email's height and has to
 * guess one, leaving either a scrollbar inside a scrollbar or a gap under a
 * short message. No script can run in the frame either way.
 *
 * Two widths, because most candidates open these on a phone: a layout that
 * reads well at 600 pixels and falls apart at 375 is a layout that fails most
 * of the people it is sent to.
 */
export function EmailPreview({ html, text }: { html: string; text: string }) {
  const [mode, setMode] = useState<"html" | "text">("html");
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [height, setHeight] = useState(900);
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);

  function measure() {
    const doc = frame.current?.contentDocument;
    if (!doc?.documentElement) return;
    setHeight(Math.max(200, doc.documentElement.scrollHeight));
  }

  function onLoad() {
    measure();
    observer.current?.disconnect();
    const doc = frame.current?.contentDocument;
    if (doc?.body && typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(doc.body);
    }
  }

  useEffect(() => () => observer.current?.disconnect(), []);
  // The frame keeps its document when only the width changes, so the new
  // height has to be read rather than waited for.
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [width]);

  const toggle = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      active ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-navy-100 p-1" role="group" aria-label="Version">
          <button type="button" className={toggle(mode === "html")} aria-pressed={mode === "html"} onClick={() => setMode("html")}>
            Designed email
          </button>
          <button type="button" className={toggle(mode === "text")} aria-pressed={mode === "text"} onClick={() => setMode("text")}>
            Plain text
          </button>
        </div>
        {mode === "html" ? (
          <div className="inline-flex rounded-xl bg-navy-100 p-1" role="group" aria-label="Screen width">
            <button type="button" className={toggle(width === "desktop")} aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>
              Desktop
            </button>
            <button type="button" className={toggle(width === "mobile")} aria-pressed={width === "mobile"} onClick={() => setWidth("mobile")}>
              Phone
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-navy-100 bg-cream-100 p-3 sm:p-5">
        {mode === "html" ? (
          <iframe
            ref={frame}
            title="Email preview"
            srcDoc={html}
            sandbox="allow-same-origin"
            onLoad={onLoad}
            className="mx-auto block rounded-xl border-0 bg-white shadow-sm transition-[width] duration-200"
            style={{ width: width === "mobile" ? 375 : "100%", maxWidth: "100%", height }}
          />
        ) : (
          // What a client that refuses HTML shows, and what spam filters read.
          // Worth seeing: a designed email with a broken plain-text half is a
          // quiet deliverability problem nobody notices.
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-white p-5 font-mono text-[13px] leading-relaxed text-navy-800 shadow-sm">
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}
