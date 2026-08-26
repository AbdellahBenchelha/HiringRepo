"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { DOCUMENT_LABEL, extensionOf, type CandidateDocument } from "@/lib/documents";

/**
 * Read a candidate's document without downloading it first.
 *
 * The file is framed from the storage origin, not ours, so nothing inside it
 * shares an origin with the Admin Panel or its session cookie. Only PDFs are
 * shown: no browser renders a Word document, and pretending otherwise would
 * produce a download prompt where a preview was promised. Sending one to a
 * third-party viewer to convert it would mean handing a stranger a stack of
 * candidates' CVs, which is worse than the inconvenience it fixes.
 *
 * The signed URL behind the frame expires in five minutes. That is ample for
 * reading — expiry does not interrupt a page already loaded — and it means a
 * URL copied out of the frame is worthless by the time anyone tries it.
 */
export function DocumentViewer({
  candidateId,
  candidateName,
  document: doc,
  onClose,
}: {
  candidateId: string;
  candidateName?: string;
  document: CandidateDocument;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const viewUrl = `/api/admin/documents/${candidateId}/${doc.kind}?mode=view`;
  const downloadUrl = `/api/admin/documents/${candidateId}/${doc.kind}`;
  const isPdf = extensionOf(doc.filename) === ".pdf";

  // Read through a ref so onClose is not a dependency: callers pass an inline
  // arrow, and depending on it would re-run this on every render.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.document.addEventListener("keydown", onKey);
    return () => window.document.removeEventListener("keydown", onKey);
  }, []);

  // A frame that never fires load leaves a spinner forever. After a few
  // seconds, offer the way out rather than leaving the reader stuck.
  useEffect(() => {
    if (!isPdf || loaded) return;
    const t = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(t);
  }, [isPdf, loaded]);

  return (
    <div
      // Above the profile modal (z-50), the confirm dialogs (z-60) and the
      // cookie banner (z-70).
      className="fixed inset-0 z-[80] flex flex-col bg-navy-900/80 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${DOCUMENT_LABEL[doc.kind]} for ${candidateName || "candidate"}`}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-none bg-white shadow-card sm:rounded-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
              {DOCUMENT_LABEL[doc.kind]}
              {candidateName ? ` · ${candidateName}` : ""}
            </p>
            <p className="truncate text-sm font-bold text-navy-900">{doc.filename}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-3 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50"
            >
              <Icon name="upload" className="h-3.5 w-3.5 rotate-180" />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-2 text-navy-500 transition hover:bg-navy-100"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-navy-50">
          {isPdf ? (
            <>
              <iframe
                src={viewUrl}
                title={`${doc.filename} preview`}
                onLoad={() => setLoaded(true)}
                className="h-full w-full border-0"
              />
              {!loaded ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-50">
                  <p className="text-sm font-medium text-navy-500">Opening {doc.filename}…</p>
                  {slow ? (
                    <p className="pointer-events-auto max-w-sm text-center text-xs text-navy-400">
                      Taking longer than usual. Some browsers refuse to preview PDFs — use
                      Download above to open it instead.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-navy-400 shadow-sm">
                <Icon name="briefcase" className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-navy-900">
                  Word documents cannot be previewed
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-navy-500">
                  No browser can display {extensionOf(doc.filename) || "this format"} files.
                  Download it to read it — it opens in Word, Pages or Google Docs.
                </p>
              </div>
              <a href={downloadUrl} className="btn-primary !px-5 !py-2 text-sm">
                Download {doc.filename}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
