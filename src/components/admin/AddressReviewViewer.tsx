"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { currentDocument, extensionOf } from "@/lib/documents";
import { ADDRESS_STATUS_LABEL, addressDocTypeLabel, addressOnFile } from "@/lib/addressProof";
import { ADDRESS_STATUS_STYLE, AddressCompare } from "@/components/admin/AddressProofPanel";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Proof of address, one candidate after another: the document, the address
 * they gave beside ours, and Approve — then the arrow (or → key) to the next
 * candidate who sent one. Only the address document is shown: no ID photos,
 * no other files.
 *
 * The queue is the list the recruiter was looking at (the Accepted tab, with
 * its filters), so "Proof of address: Received" there gives exactly the ones
 * still to check.
 */

type Patch = Partial<CandidateView>;

function fmt(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Somebody with an address document to look at. */
export function hasAddressDocument(c: CandidateView): boolean {
  const status = c.addressProofStatus ?? "not_asked";
  if (status !== "received" && status !== "approved") return false;
  return !!currentDocument(
    (c.documents ?? []).filter((d) => d.kind === "addressProof" && d.status !== "blocked" && d.key),
    "addressProof",
  );
}

export function AddressReviewViewer({
  queue,
  startId,
  onClose,
  onChange,
}: {
  queue: CandidateView[];
  startId: string;
  onClose: () => void;
  onChange: (id: string, patch: Patch) => void;
}) {
  const list = queue.filter(hasAddressDocument);
  const [index, setIndex] = useState(() => Math.max(0, list.findIndex((c) => c.id === startId)));
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const c = list[Math.min(index, list.length - 1)];
  const total = list.length;

  const move = (by: -1 | 1) => {
    setIndex((i) => Math.min(Math.max(i + by, 0), total - 1));
    setLoaded(false);
    setResult(null);
  };
  const keys = useRef({ move, onClose });
  keys.current = { move, onClose };
  useEffect(() => {
    // Kept from the View info window underneath, which uses the same keys
    // to step through candidates and Escape to close.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") keys.current.onClose();
      if (e.key === "ArrowRight") keys.current.move(1);
      if (e.key === "ArrowLeft") keys.current.move(-1);
    };
    window.document.addEventListener("keydown", onKey);
    return () => window.document.removeEventListener("keydown", onKey);
  }, []);

  if (!c) return null;
  const status = c.addressProofStatus ?? "received";
  const style = ADDRESS_STATUS_STYLE[status];
  const doc = currentDocument(
    (c.documents ?? []).filter((d) => d.kind === "addressProof" && d.status !== "blocked" && d.key),
    "addressProof",
  )!;
  const latest = (c.addressProofSubmissions ?? []).at(-1);
  const viewUrl = `/api/admin/documents/${c.id}/addressProof?mode=view`;
  const downloadUrl = `/api/admin/documents/${c.id}/addressProof`;
  const isPdf = extensionOf(doc.filename) === ".pdf";

  async function approve(action: "approve" | "unapprove"): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setResult(null);
    try {
      const res = await adminPost(`/api/admin/candidates/${c.id}/address-proof`, { action });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { ok?: boolean; error?: string };
      if (!data.ok) {
        setResult({ ok: false, text: res.status === 401 ? "Your admin session has expired — sign in again." : "Not done. Try again." });
        setBusy(false);
        return false;
      } else {
        const patch: Patch = {};
        for (const key of ["addressProofApprovedAt", "addressProofApprovedBy", "addressProofStatus"] as const) {
          (patch as Record<string, unknown>)[key] = data[key] ?? undefined;
        }
        onChange(c.id, patch);
        setResult({ ok: true, text: action === "approve" ? "Approved." : "Approval undone." });
      }
    } catch {
      setResult({ ok: false, text: "Could not reach the server." });
      setBusy(false);
      return false;
    }
    setBusy(false);
    return true;
  }

  const arrow =
    "inline-flex h-9 items-center gap-1 rounded-full border border-navy-200 px-3 text-xs font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-30";

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-navy-900/80 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Proof of address for ${c.fullName || "candidate"}`}
      data-address-viewer
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-card sm:rounded-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Proof of address</p>
            <p className="truncate text-sm font-bold text-navy-900" data-address-viewer-name>
              {c.fullName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => move(-1)} disabled={index <= 0} className={arrow} data-address-prev aria-label="Previous candidate">
              <Icon name="chevronLeft" className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="min-w-[4.5rem] text-center text-xs font-semibold text-navy-500" data-address-position>
              {index + 1} of {total}
            </span>
            <button type="button" onClick={() => move(1)} disabled={index >= total - 1} className={arrow} data-address-next aria-label="Next candidate">
              <span className="hidden sm:inline">Next</span> <Icon name="chevronRight" className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="ml-1 rounded-lg p-2 text-navy-500 transition hover:bg-navy-100">
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-[55vh] flex-1 bg-navy-50 lg:min-h-0">
            {isPdf ? (
              <>
                <iframe
                  key={`${c.id}-${doc.key}`}
                  src={viewUrl}
                  title={`${doc.filename} preview`}
                  onLoad={() => setLoaded(true)}
                  className="h-full w-full border-0"
                  data-address-frame
                />
                {!loaded ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy-50">
                    <p className="text-sm font-medium text-navy-500">Opening {doc.filename}…</p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-navy-500">
                This file cannot be previewed.{" "}
                <a href={downloadUrl} className="ml-1 font-semibold text-brand-700 underline">
                  Download it
                </a>
              </div>
            )}
          </div>

          <aside className="w-full shrink-0 space-y-4 overflow-y-auto border-t border-navy-100 p-4 text-sm lg:w-80 lg:border-l lg:border-t-0">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.chip}`} data-address-viewer-status={status}>
              <Icon name={style.icon} className="h-3.5 w-3.5" />
              {ADDRESS_STATUS_LABEL[status]}
            </span>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-navy-400">Document</dt>
                <dd className="font-semibold text-navy-900">{latest ? addressDocTypeLabel(latest.type) : doc.filename}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-navy-400">Received</dt>
                <dd className="text-navy-900">{fmt(latest?.at ?? doc.uploadedAt)}</dd>
              </div>
            </dl>
            {latest ? <AddressCompare given={latest.address} onFile={latest.onFile || addressOnFile(c)} /> : null}

            <div className="flex flex-wrap gap-2 pt-1">
              {status === "received" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void approve("approve")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  data-address-viewer-approve
                >
                  <Icon name="check" className="h-4 w-4" /> Approve
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void approve("unapprove")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-50"
                >
                  Undo approval
                </button>
              )}
              {status === "received" && index < total - 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (await approve("approve")) move(1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100 disabled:opacity-50"
                  data-address-viewer-approve-next
                >
                  Approve &amp; next <Icon name="chevronRight" className="h-4 w-4" />
                </button>
              ) : null}
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                <Icon name="download" className="h-4 w-4" /> Download
              </a>
            </div>
            {result ? (
              <p role={result.ok ? "status" : "alert"} className={`text-xs font-semibold ${result.ok ? "text-green-700" : "text-red-700"}`} data-address-viewer-result>
                {result.text}
              </p>
            ) : null}
            <p className="text-xs text-navy-400">
              To ask for a new document, close this and use <strong>Ask again</strong> in their ID check tab. Keys: ← → to move,
              Esc to close.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
