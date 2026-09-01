"use client";

import { Icon } from "@/components/Icon";
import { VerificationPanel, type VerificationState } from "@/components/admin/VerificationPanel";
import type { CandidateDocument } from "@/lib/documents";

/**
 * The identity photos, one click away from the ID check column.
 *
 * Getting here used to mean opening the whole profile and scrolling to find
 * them — three steps to look at two photographs. This is only ever reached
 * from a badge that is already "Ready to review" or "Verified", so there is
 * always something to show: nobody opens this to find an empty panel.
 *
 * Deliberately just the panel, not the profile. Reviewing a document rarely
 * needs the candidate's address or their notes in view at the same time, and
 * a smaller dialog is one that opens and closes faster for the case a
 * recruiter is about to do many times in a row.
 */
export function VerificationQuickView({
  id,
  fullName,
  documents,
  initial,
  onClose,
  onChange,
}: {
  id: string;
  fullName?: string;
  documents?: CandidateDocument[];
  initial: VerificationState;
  onClose: () => void;
  onChange: (state: VerificationState) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${fullName || "Candidate"} identity verification`}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-bold text-navy-900">{fullName || "Candidate"}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-navy-500 hover:bg-navy-100"
            aria-label="Close"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <VerificationPanel
          id={id}
          fullName={fullName}
          documents={documents}
          initial={initial}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
