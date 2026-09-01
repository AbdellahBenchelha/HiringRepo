"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { CandidateProfileModal } from "@/components/admin/CandidateProfileModal";
import { DocumentViewer } from "@/components/admin/DocumentViewer";
import type { CandidateDocument } from "@/lib/documents";
import type { CandidateView } from "@/lib/candidateView";
import type { CandidateStatus } from "@/lib/candidateStatus";

/**
 * One row's worth of interactivity on an otherwise server-rendered table.
 *
 * The Interviews tab has no client state of its own, and converting the whole
 * table into a client component to add one button would ship every row's markup
 * to the browser twice. This keeps the table on the server and puts a small
 * island in the cell that needs one.
 *
 * The candidate comes from the row and every edit is reported back through
 * `onChange` rather than kept here. The row is what the other island in the
 * same row — the voice assessment controls — also writes to, and the two must
 * agree: passing the assessment there is what opens the offer form here.
 */
export function CandidateInfoButton({
  candidate,
  showOffer,
  onChange,
}: {
  candidate: CandidateView;
  /** Whether this tab is where offers are made. */
  showOffer?: boolean;
  onChange: (patch: Partial<CandidateView>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<CandidateDocument | null>(null);

  async function changeStatus(id: string, status: CandidateStatus) {
    onChange({ status });
    try {
      await adminPost(`/api/admin/candidates/${id}/status`, { status });
    } catch {
      /* optimistic; the table reloads with the truth */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-2.5 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-navy-50"
      >
        <Icon name="users" className="h-3.5 w-3.5" />
        View info
      </button>

      {open ? (
        <CandidateProfileModal
          candidate={candidate}
          showOffer={showOffer}
          onClose={() => setOpen(false)}
          onOpenDocument={setViewing}
          onStatusChange={changeStatus}
          onChange={onChange}
        />
      ) : null}

      {viewing ? (
        <DocumentViewer
          candidateId={candidate.id}
          candidateName={candidate.fullName}
          document={viewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </>
  );
}
