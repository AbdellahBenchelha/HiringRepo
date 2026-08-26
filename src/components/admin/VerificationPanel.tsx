"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ImageZoom } from "@/components/admin/ImageZoom";
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

/**
 * "Awaiting upload" hides a distinction that matters when working a list:
 * someone who has been asked and is taking their time, and someone who has
 * never been told this exists — anyone who finished their assessment before
 * the check was added. The second will wait forever unless a recruiter acts,
 * so it gets its own, louder label rather than looking like ordinary patience.
 */
export function VerificationBadge({
  status,
  requestedAt,
}: {
  status: VerificationStatus;
  requestedAt?: string;
}) {
  if (status === "not_required") {
    return <span className="text-xs text-navy-300">—</span>;
  }
  const unasked = status === "awaiting" && !requestedAt;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        unasked ? "border-red-200 bg-red-50 text-red-700" : TONE[status]
      }`}
    >
      {status === "verified" ? <Icon name="checkCircle" className="h-3 w-3" /> : null}
      {status === "rejected" ? <Icon name="shield" className="h-3 w-3" /> : null}
      {unasked ? <Icon name="mail" className="h-3 w-3" /> : null}
      {unasked ? "Not asked yet" : VERIFICATION_LABEL[status]}
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
  /** When we last asked them to upload, if we ever did. */
  requestedAt?: string;
}

/**
 * Whether we can usefully ask this candidate to upload, and what to call it.
 *
 * "Awaiting upload" covers two very different people: someone who was asked
 * and has not got round to it, and someone who finished their assessment
 * before this check existed and has never been told about it at all. The
 * second will wait forever — nothing takes them back to their link — so the
 * button has to be offered in that state, not only when verification is
 * optional for them.
 */
function askAction(state: VerificationState): { label: string; hint: string } | null {
  if (state.status === "not_required") {
    return {
      label: "Request verification",
      hint: "Their country does not require it. This asks them anyway and emails them the link.",
    };
  }
  if (state.status === "awaiting") {
    return state.requestedAt
      ? { label: "Ask again", hint: "Sends the request email again with their assessment link." }
      : {
          label: "Send request by email",
          hint: "They have not been told yet — this emails them their link.",
        };
  }
  if (state.status === "rejected") {
    return {
      label: "Ask them to try again",
      hint: "Clears the rejection so they can upload again, and emails them the link.",
    };
  }
  return null;
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
  onChange,
}: {
  id: string;
  fullName?: string;
  documents?: CandidateDocument[];
  initial: VerificationState;
  /**
   * Report the new state upward. Without this the row behind the profile keeps
   * the value it was rendered with, so verifying someone leaves the table
   * still saying "Ready to review" until the page is reloaded.
   */
  onChange?: (state: VerificationState) => void;
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmAsk, setConfirmAsk] = useState(false);
  /** Which photo the inspector is showing, or null when it is closed. */
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  /** "sent", or the reason the request email did not go out. */
  const [requestEmailed, setRequestEmailed] = useState("");

  const images = (documents ?? []).filter(
    (d) => (d.kind === "identity" || d.kind === "selfie") && d.status !== "blocked" && d.key,
  );
  const hasImages = images.length > 0;
  const ask = askAction(state);

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
        verificationRequestedAt?: string;
      };
      // One place that applies the change, so the panel and the row behind it
      // can never disagree about what just happened.
      const apply = (patch: Partial<VerificationState>) =>
        setState((s) => {
          const next = { ...s, ...patch };
          onChange?.(next);
          return next;
        });

      if (!data.ok) {
        setError(`Could not save (${data.error ?? "unknown"}).`);
      } else if (action === "verify") {
        apply({
          status: "verified",
          verifiedAt: data.verifiedAt,
          verifiedBy: data.verifiedBy,
          rejectedAt: undefined,
          rejectionReason: undefined,
        });
      } else if (action === "reject") {
        apply({
          status: "rejected",
          rejectedAt: data.rejectedAt,
          rejectionReason: data.rejectionReason,
          verifiedAt: undefined,
        });
      } else if (action === "clear-images") {
        apply({ imagesDeletedAt: new Date().toISOString() });
        // The images are gone; reload so the panel reflects storage.
        window.location.reload();
      } else if (action === "request") {
        apply({
          status: "awaiting",
          requestedAt: data.verificationRequestedAt,
          // Asking again withdraws the rejection, so the panel must stop
          // showing one.
          rejectedAt: undefined,
          rejectionReason: undefined,
        });
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
          <VerificationBadge status={state.status} requestedAt={state.requestedAt} />
        </div>
        {ask ? (
          <button
            type="button"
            onClick={() => setConfirmAsk(true)}
            disabled={busy}
            title={ask.hint}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <Icon name="mail" className="h-3.5 w-3.5" />
            {ask.label}
          </button>
        ) : null}
      </div>

      {state.status === "awaiting" ? (
        <p className="mt-2 text-sm text-navy-500">
          {state.requestedAt ? (
            <>
              Asked on {fmt(state.requestedAt)}. Waiting for {fullName || "the candidate"} to upload
              their ID and photo.
            </>
          ) : (
            <>
              {fullName || "This candidate"} has not been asked yet — they finished their assessment
              before this check existed, so nothing takes them back to their link. Send the request
              and they will see the upload step there.
            </>
          )}
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
            {images.map((doc, i) => (
              <button
                key={doc.kind}
                type="button"
                onClick={() => setZoomAt(i)}
                title={`Open ${DOCUMENT_LABEL[doc.kind]} to zoom in`}
                className="group overflow-hidden rounded-xl border border-navy-200 text-left transition hover:border-brand-400"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-navy-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/documents/${id}/${doc.kind}?mode=view`}
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
                <p className="px-3 py-2 text-xs font-semibold text-navy-700">
                  {DOCUMENT_LABEL[doc.kind]}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-navy-500">
            Click a photo to zoom, pan and rotate it — a sideways passport photograph is readable
            once turned. Check the face matches the document, and that the document is readable and
            not expired.
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

      {/* Asking sends a real email to a real person, so it is confirmed —
          and for a rejected candidate it also withdraws that rejection. */}
      <ConfirmDialog
        open={confirmAsk}
        icon="mail"
        title={ask?.label ?? "Request verification"}
        confirmLabel="Send request"
        busy={busy}
        warning={
          state.status === "rejected"
            ? "This clears the existing rejection so they can upload again."
            : undefined
        }
        onCancel={() => setConfirmAsk(false)}
        onConfirm={() => {
          setConfirmAsk(false);
          void act("request");
        }}
        body={
          <>
            <strong className="text-navy-900">{fullName || "This candidate"}</strong> will be
            emailed their assessment link and asked to upload an ID document and a photo of
            themselves holding it. The upload step appears on that link.
          </>
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
      {zoomAt !== null && images[zoomAt] ? (
        <ImageZoom
          images={images.map((d) => ({
            src: `/api/admin/documents/${id}/${d.kind}?mode=view`,
            label: DOCUMENT_LABEL[d.kind],
          }))}
          index={zoomAt}
          onIndex={setZoomAt}
          onClose={() => setZoomAt(null)}
        />
      ) : null}
    </div>
  );
}
