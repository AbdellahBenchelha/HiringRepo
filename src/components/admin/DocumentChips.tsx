"use client";

import { Icon } from "@/components/Icon";
import {
  DOCUMENT_KINDS,
  DOCUMENT_LABEL,
  DOCUMENT_SHORT,
  type CandidateDocument,
} from "@/lib/documents";

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Which documents a candidate sent, at a glance.
 *
 * Three fixed slots rather than a list of what happens to exist, so the column
 * reads down the table: the same shape appears on every row and a missing CV is
 * a gap in a known place rather than something you have to notice is absent.
 */
export function DocumentChips({
  id,
  documents,
  onOpen,
}: {
  id: string;
  documents?: CandidateDocument[];
  /** Opens the viewer. Without it the chip falls back to downloading. */
  onOpen?: (doc: CandidateDocument) => void;
}) {
  const byKind = new Map((documents ?? []).map((d) => [d.kind, d]));

  return (
    <div className="flex flex-wrap gap-1">
      {DOCUMENT_KINDS.map((kind) => {
        const doc = byKind.get(kind);
        const short = DOCUMENT_SHORT[kind];

        if (!doc) {
          return (
            <span
              key={kind}
              title={`No ${DOCUMENT_LABEL[kind].toLowerCase()}`}
              className="rounded-full border border-navy-100 px-2 py-0.5 text-[11px] font-medium text-navy-300"
            >
              {short}
            </span>
          );
        }

        if (doc.status === "blocked") {
          return (
            <span
              key={kind}
              title={`${doc.filename} was blocked: ${doc.reason ?? "failed the security check"}`}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700"
            >
              <Icon name="shield" className="h-3 w-3" />
              {short}
            </span>
          );
        }

        const unscanned = doc.status === "unscanned";
        const style = `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition ${
          unscanned
            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
        }`;
        const title = `${doc.filename} · ${sizeLabel(doc.size)}${unscanned ? " · could not be scanned" : ""}`;

        // A button that opens the reader, not a link that saves a file. The
        // download is still one click away inside it, but reading a CV should
        // not require putting it on disk first.
        return onOpen ? (
          <button
            key={kind}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(doc);
            }}
            title={title}
            className={style}
          >
            <Icon name="search" className="h-3 w-3" />
            {short}
          </button>
        ) : (
          <a key={kind} href={`/api/admin/documents/${id}/${kind}`} title={title} className={style}>
            <Icon name="upload" className="h-3 w-3 rotate-180" />
            {short}
          </a>
        );
      })}
    </div>
  );
}

/** The fuller listing, for the candidate profile. */
export function DocumentList({
  id,
  documents,
  onOpen,
}: {
  id: string;
  documents?: CandidateDocument[];
  onOpen?: (doc: CandidateDocument) => void;
}) {
  const docs = documents ?? [];
  if (docs.length === 0) {
    return <p className="text-sm text-navy-400">No documents were attached to this application.</p>;
  }

  return (
    <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100">
      {DOCUMENT_KINDS.filter((k) => docs.some((d) => d.kind === k)).map((kind) => {
        const doc = docs.find((d) => d.kind === kind)!;
        const blocked = doc.status === "blocked";
        return (
          <li key={kind} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                {DOCUMENT_LABEL[kind]}
              </p>
              <p className="truncate text-sm font-medium text-navy-900">{doc.filename}</p>
              <p className="text-xs text-navy-500">
                {blocked ? (
                  <span className="font-semibold text-red-600">Blocked — {doc.reason}</span>
                ) : (
                  <>
                    {sizeLabel(doc.size)} ·{" "}
                    {new Date(doc.uploadedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {doc.status === "unscanned" ? (
                      <span className="font-semibold text-amber-700"> · not scanned</span>
                    ) : null}
                  </>
                )}
              </p>
            </div>
            {blocked ? (
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                Deleted
              </span>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(doc)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800"
                  >
                    <Icon name="search" className="h-3.5 w-3.5" />
                    View
                  </button>
                ) : null}
                <a
                  href={`/api/admin/documents/${id}/${kind}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-3.5 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50"
                >
                  <Icon name="upload" className="h-3.5 w-3.5 rotate-180" />
                  Download
                </a>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
