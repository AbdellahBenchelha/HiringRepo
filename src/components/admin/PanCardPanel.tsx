"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ImageZoom } from "@/components/admin/ImageZoom";
import { CopyButton } from "@/components/admin/CopyButton";
import { DOCUMENT_LABEL, extensionOf, type CandidateDocument } from "@/lib/documents";
import { PAN_KINDS, currentPanDocument, panExpected, panStatus, type PanStatus } from "@/lib/pan";
import type { CandidateView } from "@/lib/candidateView";

/**
 * The PAN card a candidate living in India chose to send at acceptance.
 *
 * On the Company tab, under the confirmed details, because it is paperwork for
 * the agreement and its payments rather than an identity check. Optional from
 * start to finish — "Doesn't have one" is an ordinary answer, not a warning.
 *
 * Photos open in the zoom viewer, where a sideways card can be turned; an
 * e-PAN arrives as a PDF and opens in the document reader instead.
 */

const STATUS: Record<Exclude<PanStatus, "not_asked">, { label: string; tone: string }> = {
  provided: { label: "Provided", tone: "border-green-200 bg-green-50 text-green-800" },
  no: { label: "No / skipped", tone: "border-navy-200 bg-navy-50 text-navy-600" },
  missing: { label: "Said yes — upload didn’t arrive", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  deleted: { label: "Deleted", tone: "border-navy-200 bg-navy-50 text-navy-600" },
};

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function PanCardPanel({
  candidate,
  onOpenDocument,
  onChange,
}: {
  candidate: CandidateView;
  onOpenDocument?: (doc: CandidateDocument) => void;
  onChange?: (patch: Partial<CandidateView>) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zoomAt, setZoomAt] = useState<number | null>(null);

  const status = panStatus(candidate);
  const livesInIndia = panExpected(candidate.confirmedDetails?.country);
  // Silent for everybody the question never reached. An accepted candidate in
  // India from before the question existed is shown as not asked, so the
  // empty space is not mistaken for "no".
  if (status === "not_asked" && !(candidate.offerAcceptedAt && livesInIndia)) return null;

  const docs = PAN_KINDS.map((k) => currentPanDocument(candidate.documents, k)).filter(
    (d): d is CandidateDocument => !!d,
  );
  const photos = docs.filter((d) => extensionOf(d.filename) !== ".pdf");
  const viewUrl = (d: CandidateDocument) => `/api/admin/documents/${candidate.id}/${d.kind}?mode=view`;

  async function clear() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/pan`, { action: "clear" });
      const data = (await res.json()) as { ok?: boolean; panDeletedAt?: string; error?: string };
      if (data.ok) {
        setAsking(false);
        onChange?.({
          documents: (candidate.documents ?? []).filter((d) => !(PAN_KINDS as readonly string[]).includes(d.kind)),
          panDeletedAt: data.panDeletedAt,
        });
      } else {
        setError(data.error ?? "failed");
      }
    } catch {
      setError("failed");
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 rounded-xl border border-navy-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Icon name="document" className="h-4 w-4 text-navy-400" />
          PAN card &amp; GSTIN
          <span className="text-xs font-normal text-navy-400">India</span>
        </p>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
            status === "not_asked" ? "border-navy-200 bg-navy-50 text-navy-500" : STATUS[status].tone
          }`}
        >
          {status === "not_asked" ? "Not asked" : STATUS[status].label}
        </span>
      </div>

      {status === "not_asked" ? (
        <p className="mt-1.5 text-xs text-navy-500">
          They accepted before the offer page asked about a PAN card.
        </p>
      ) : status === "no" ? (
        <p className="mt-1.5 text-xs text-navy-500">
          They chose No / skip, or left it unanswered, when accepting
          {candidate.panAnsweredAt ? ` on ${fmt(candidate.panAnsweredAt)}` : ""}.
        </p>
      ) : status === "missing" ? (
        <p className="mt-1.5 text-xs text-navy-500">
          They said they have one, but no photo reached us — the upload failed or they skipped it.
        </p>
      ) : status === "deleted" ? (
        <p className="mt-1.5 text-xs text-navy-500">
          The card was deleted on {fmt(candidate.panDeletedAt)}. They had said they have one.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => {
              const isPdf = extensionOf(doc.filename) === ".pdf";
              return isPdf ? (
                <button
                  key={doc.kind}
                  type="button"
                  onClick={() => onOpenDocument?.(doc)}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-navy-200 bg-navy-50 text-navy-600 transition hover:border-brand-400"
                >
                  <Icon name="document" className="h-8 w-8" />
                  <span className="text-xs font-semibold">{DOCUMENT_LABEL[doc.kind]} (PDF)</span>
                </button>
              ) : (
                <button
                  key={doc.kind}
                  type="button"
                  onClick={() => setZoomAt(photos.indexOf(doc))}
                  title={`Open ${DOCUMENT_LABEL[doc.kind]} to zoom in`}
                  className="group overflow-hidden rounded-xl border border-navy-200 text-left transition hover:border-brand-400"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-navy-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewUrl(doc)}
                      alt={DOCUMENT_LABEL[doc.kind]}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy-900/45 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-navy-800">
                        <Icon name="zoomIn" className="h-3.5 w-3.5" />
                        Zoom in
                      </span>
                    </span>
                  </div>
                  <p className="px-3 py-2 text-xs font-semibold text-navy-700">{DOCUMENT_LABEL[doc.kind]}</p>
                </button>
              );
            })}
          </div>
          {!currentPanDocument(candidate.documents, "panBack") ? (
            <p className="mt-2 text-xs text-navy-500">No back sent — optional, and an e-PAN has none.</p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50"
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
              Delete PAN card
            </button>
          </div>
        </>
      )}

      {/* The GSTIN, optional: shown whenever the card is, so an empty one reads
          as "not given" rather than as missing from the page. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 pt-3" data-gstin>
        <p className="text-sm text-navy-700">
          <span className="font-semibold text-navy-800">GSTIN:</span>{" "}
          {candidate.gstin ? (
            <span className="font-mono tracking-wider text-navy-900">{candidate.gstin}</span>
          ) : (
            <span className="text-navy-400">Not provided (optional)</span>
          )}
        </p>
        {candidate.gstin ? <CopyButton text={candidate.gstin} title="GSTIN" /> : null}
      </div>

      {error ? <p className="mt-2 text-xs font-medium text-amber-700">Not deleted ({error}).</p> : null}

      <ConfirmDialog
        open={asking}
        icon="trash"
        title="Delete the PAN card?"
        confirmLabel={busy ? "Deleting…" : "Delete"}
        busy={busy}
        onCancel={() => setAsking(false)}
        onConfirm={() => void clear()}
        body={
          <>
            Both sides are deleted from storage for good. The record keeps that they said they have
            one, and when it was deleted.
          </>
        }
      />

      {zoomAt !== null && photos[zoomAt] ? (
        <ImageZoom
          images={photos.map((d) => ({ src: viewUrl(d), label: DOCUMENT_LABEL[d.kind] }))}
          index={zoomAt}
          onIndex={setZoomAt}
          onClose={() => setZoomAt(null)}
        />
      ) : null}
    </div>
  );
}
