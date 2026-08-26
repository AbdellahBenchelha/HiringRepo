"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DOCUMENT_LABEL, type CandidateDocument } from "@/lib/documents";
import { VERIFICATION_LABEL, type VerificationStatus } from "@/lib/verification";

/**
 * Review a candidate's identity photographs.
 *
 * Both images side by side, because the whole check is comparing one to the
 * other: a face against a document. Stacking them would mean scrolling between
 * the two things being compared, which is how mistakes get made.
 */

const TONE: Record<VerificationStatus, string> = {
  not_required: "bg-navy-50 text-navy-500 border-navy-200",
  awaiting: "bg-amber-50 text-amber-700 border-amber-200",
  provided: "bg-brand-50 text-brand-800 border-brand-300",
  verified: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "not_required") {
    return <span className="text-xs text-navy-300">—</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE[status]}`}
    >
      {status === "verified" ? <Icon name="checkCircle" className="h-3 w-3" /> : null}
      {status === "rejected" ? <Icon name="shield" className="h-3 w-3" /> : null}
      {VERIFICATION_LABEL[status]}
    </span>
  );
}

export interface VerificationState {
  status: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  imagesDeletedAt?: string;
  consentAt?: string;
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function VerificationPanel({
  id,
  fullName,
  documents,
  initial,
}: {
  id: string;
  fullName?: string;
  documents?: CandidateDocument[];
  initial: VerificationState;
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [zoom, setZoom] = useState<CandidateDocument | null>(null);
  /** "sent", or the reason the request email did not go out. */
  const [requestEmailed, setRequestEmailed] = useState("");

  const images = (documents ?? []).filter(
    (d) => (d.kind === "identity" || d.kind === "selfie") && d.status !== "blocked" && d.key,
  );
  const hasImages = images.length > 0;

  async function act(action: string, extra?: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/verification`, { action, ...extra });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        verifiedAt?: string;
        rejectedAt?: string;
        rejectionReason?: string;
        verifiedBy?: string;
        emailed?: boolean;
        emailError?: string;
      };
      if (!data.ok) {
        setError(`Could not save (${data.error ?? "unknown"}).`);
      } else if (action === "verify") {
        setState((s) => ({
          ...s,
          status: "verified",
          verifiedAt: data.verifiedAt,
          verifiedBy: data.verifiedBy,
          rejectedAt: undefined,
          rejectionReason: undefined,
        }));
      } else if (action === "reject") {
        setState((s) => ({
          ...s,
          status: "rejected",
          rejectedAt: data.rejectedAt,
          rejectionReason: data.rejectionReason,
          verifiedAt: undefined,
        }));
      } else if (action === "clear-images") {
        setState((s) => ({ ...s, imagesDeletedAt: new Date().toISOString() }));
        // The images are gone; reload so the panel reflects storage.
        window.location.reload();
      } else if (action === "request") {
        setState((s) => ({ ...s, status: "awaiting" }));
        // The request is recorded either way, but a candidate who was never
        // told is a request that will never be answered.
        setRequestEmailed(data.emailed ? "sent" : (data.emailError ?? "failed"));
      }
    } catch {
      setError("Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-navy-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-navy-800">Identity verification</p>
          <VerificationBadge status={state.status} />
        </div>
        {state.status === "not_required" ? (
          <button
            type="button"
            onClick={() => act("request")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-3 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
          >
            <Icon name="shield" className="h-3.5 w-3.5" />
            Request verification
          </button>
        ) : null}
      </div>

      {state.status === "awaiting" ? (
        <p className="mt-2 text-sm text-navy-500">
          Waiting for {fullName || "the candidate"} to upload their ID and photo. They see this step
          on their assessment link.
        </p>
      ) : null}

      {requestEmailed === "sent" ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-green-700">
          <Icon name="checkCircle" className="h-4 w-4 shrink-0" />
          Asked by email, with their assessment link.
        </p>
      ) : requestEmailed ? (
        <p className="mt-2 text-sm font-medium text-amber-700">
          Recorded, but the email did not go out ({requestEmailed}). Contact them another way, or
          they will never know to come back.
        </p>
      ) : null}

      {state.imagesDeletedAt && !hasImages ? (
        <p className="mt-2 text-sm text-navy-500">
          Photographs were deleted on {fmt(state.imagesDeletedAt)}. The decision below is kept.
        </p>
      ) : null}

      {hasImages ? (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {images.map((doc) => (
              <button
                key={doc.kind}
                type="button"
                onClick={() => setZoom(doc)}
                title="Click to enlarge"
                className="group overflow-hidden rounded-xl border border-navy-200 text-left transition hover:border-brand-400"
              >
                <div className="aspect-[4/3] overflow-hidden bg-navy-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/documents/${id}/${doc.kind}?mode=view`}
                    alt={DOCUMENT_LABEL[doc.kind]}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
                <p className="px-3 py-2 text-xs font-semibold text-navy-700">
                  {DOCUMENT_LABEL[doc.kind]}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-navy-400">
            Click either photo to enlarge. Check the face matches the document, and that the
            document is readable and not expired.
          </p>
        </>
      ) : null}

      {state.status === "verified" ? (
        <p className="mt-3 text-sm font-medium text-green-700">
          Verified {fmt(state.verifiedAt)}
          {state.verifiedBy ? ` by ${state.verifiedBy}` : ""}.
        </p>
      ) : null}
      {state.status === "rejected" ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          Rejected {fmt(state.rejectedAt)}
          {state.rejectionReason ? ` — ${state.rejectionReason}` : ""}.
        </p>
      ) : null}

      {hasImages || state.status === "verified" || state.status === "rejected" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3">
          {hasImages ? (
            <>
              <button
                type="button"
                onClick={() => act("verify")}
                disabled={busy || state.status === "verified"}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-40"
              >
                <Icon name="checkCircle" className="h-3.5 w-3.5" />
                Verify
              </button>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={busy}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-3.5 py-1.5 text-xs font-bold text-navy-600 transition hover:bg-navy-50 disabled:opacity-40"
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
                Delete photos
              </button>
            </>
          ) : null}
          {error ? <p className="w-full text-xs font-medium text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {/* Reject, with a reason the candidate's record keeps. */}
      <ConfirmDialog
        open={rejecting}
        icon="shield"
        tone="danger"
        title="Reject this verification?"
        confirmLabel="Reject"
        busy={busy}
        onCancel={() => setRejecting(false)}
        onConfirm={() => {
          setRejecting(false);
          void act("reject", { reason });
        }}
        body={
          <div>
            <p>
              <strong className="text-navy-900">{fullName || "This candidate"}</strong> will be
              marked as failing identity verification.
            </p>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (e.g. photo unreadable)"
              className="input mt-3 !py-2 text-sm"
            />
          </div>
        }
      />

      <ConfirmDialog
        open={confirmClear}
        icon="trash"
        tone="danger"
        title="Delete the identity photos?"
        confirmLabel="Delete photos"
        warning="This cannot be undone. The candidate would have to upload them again."
        busy={busy}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void act("clear-images");
        }}
        body={
          <>
            The ID and photo for{" "}
            <strong className="text-navy-900">{fullName || "this candidate"}</strong> will be erased
            from storage. The verification decision, who made it and when, is kept.
          </>
        }
      />

      {/* Enlarged view, for reading small print on a document. */}
      {zoom ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-900/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={DOCUMENT_LABEL[zoom.kind]}
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/documents/${id}/${zoom.kind}?mode=view`}
            alt={DOCUMENT_LABEL[zoom.kind]}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={() => setZoom(null)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 text-navy-700 transition hover:bg-white"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
