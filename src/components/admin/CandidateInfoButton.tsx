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
 * It holds its own copy of the candidate so edits made in the dialog — a
 * status, a verification decision, a note — are reflected without a reload.
 */
export function CandidateInfoButton({ candidate }: { candidate: CandidateView }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(candidate);
  const [viewing, setViewing] = useState<CandidateDocument | null>(null);

  async function changeStatus(id: string, status: CandidateStatus) {
    setCurrent((c) => ({ ...c, status }));
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
          candidate={current}
          onClose={() => setOpen(false)}
          onOpenDocument={setViewing}
          onStatusChange={changeStatus}
          onChange={(patch) => setCurrent((c) => ({ ...c, ...patch }))}
        />
      ) : null}

      {viewing ? (
        <DocumentViewer
          candidateId={current.id}
          candidateName={current.fullName}
          document={viewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </>
  );
}
