"use client";

import { useEffect, useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { CandidateProfileModal } from "@/components/admin/CandidateProfileModal";
import { DocumentViewer } from "@/components/admin/DocumentViewer";
import type { CandidateView } from "@/lib/candidateView";
import type { CandidateDocument } from "@/lib/documents";
import type { CandidateStatus } from "@/lib/candidateStatus";

/**
 * View info, opened from the Live chat tab by clicking the candidate's name.
 *
 * The chat only carries a summary of the person, so the full record is fetched
 * when the popup opens — the same view, and the same tabs, as View info on the
 * candidate tables. Whatever is changed here is saved the same way too.
 */
export function ChatProfilePopup({
  candidateId,
  onClose,
  onStatusChange,
}: {
  candidateId: string;
  onClose: () => void;
  /** So the chat can show "Full verified" at once, without waiting for a poll. */
  onStatusChange?: (status: CandidateStatus) => void;
}) {
  const [candidate, setCandidate] = useState<CandidateView | null>(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<CandidateDocument | null>(null);

  useEffect(() => {
    let stale = false;
    setCandidate(null);
    setError("");
    (async () => {
      try {
        const res = await fetchWithTimeout(`/api/admin/candidates/${candidateId}`, { cache: "no-store" }, 12_000);
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; candidate?: CandidateView; error?: string };
        if (stale) return;
        if (data.ok && data.candidate) setCandidate(data.candidate);
        else
          setError(
            res.status === 401
              ? "Your admin session has expired — sign in again."
              : res.status === 404
                ? "This candidate is no longer on record."
                : "Could not load their information.",
          );
      } catch {
        if (!stale) setError("Could not reach the server.");
      }
    })();
    return () => {
      stale = true;
    };
  }, [candidateId]);

  // Escape closes the loading / error card too, not only the full popup.
  useEffect(() => {
    if (candidate) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [candidate, onClose]);

  async function changeStatus(id: string, next: CandidateStatus) {
    setCandidate((c) => (c ? { ...c, status: next } : c));
    onStatusChange?.(next);
    try {
      await adminPost(`/api/admin/candidates/${id}/status`, { status: next });
    } catch {
      /* optimistic, like the tables: the next open shows the truth */
    }
  }

  if (!candidate) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Candidate information"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-card" onClick={(e) => e.stopPropagation()}>
          {error ? (
            <>
              <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-full border border-navy-200 px-4 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-50"
              >
                Close
              </button>
            </>
          ) : (
            <p className="text-sm text-navy-500">Loading their information…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <CandidateProfileModal
        key={candidate.id}
        candidate={candidate}
        showOffer
        onClose={onClose}
        onOpenDocument={setViewing}
        onStatusChange={changeStatus}
        onChange={(p) => {
          setCandidate((c) => (c ? { ...c, ...p } : c));
          if (p.status) onStatusChange?.(p.status);
        }}
      />
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
