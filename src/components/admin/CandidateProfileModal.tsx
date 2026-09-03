"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { InterviewBadge } from "@/components/admin/StatusBadge";
import { CANDIDATE_STATUSES, type CandidateStatus } from "@/lib/candidateStatus";
import { DocumentList } from "@/components/admin/DocumentChips";
import { NotesEditor } from "@/components/admin/NotesEditor";
import { VerificationPanel, verificationStateOf } from "@/components/admin/VerificationPanel";
import type { CandidateDocument } from "@/lib/documents";
import type { CandidateView } from "@/lib/candidateView";
import { PhoneCountryFlag } from "@/components/admin/PhoneCountryFlag";
import { countryMatch } from "@/lib/countryCheck";
import { OfferPanel } from "@/components/admin/OfferPanel";
import { canOffer } from "@/lib/offer";
import { ConfirmedDetailsPanel } from "@/components/admin/ConfirmedDetailsPanel";
import { CompanyCheckPanel } from "@/components/admin/CompanyCheckPanel";

/**
 * Everything known about one candidate, in a dialog.
 *
 * Shared by the Candidates and Interviews tabs rather than written twice. Two
 * profile views of the same person would drift, and the one that got less use
 * would quietly stop showing whatever was added to the other.
 *
 * It owns no data. Every change is reported through `onChange` so whichever
 * table opened it can keep its own row in step — a modal that silently knew
 * more than the page behind it is how a row ends up showing a stale badge.
 *
 * Callers must give it `key={candidate.id}`. The panels inside seed their own
 * state from their props once, on mount, so swapping the candidate underneath
 * a mounted dialog would leave the verification panel, the offer form and the
 * Companies House result all describing the person you just navigated away
 * from — and a save from any of them would write their data onto this one.
 */

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Stepping to the next candidate without closing the dialog. */
export interface ProfileNav {
  /** Zero-based position in the filtered list. */
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function CandidateProfileModal({
  candidate,
  showOffer,
  nav,
  onClose,
  onChange,
  onOpenDocument,
  onStatusChange,
  onSendWhatsApp,
}: {
  candidate: CandidateView;
  /** Omitted where there is nothing to step through, which hides the controls. */
  nav?: ProfileNav;
  /**
   * Whether to offer the job from here.
   *
   * Only the Interviews tab does. An offer follows the live interview, which
   * only happens once the voice assessment is passed, and that whole sequence
   * is run from that tab — putting the form in front of every applicant on the
   * Candidates tab as well only invites it being sent to the wrong person.
   */
  showOffer?: boolean;
  onClose: () => void;
  /** Fields that changed, for the caller to merge into its own copy. */
  onChange: (patch: Partial<CandidateView>) => void;
  onOpenDocument: (doc: CandidateDocument) => void;
  onStatusChange: (id: string, status: CandidateStatus) => void;
  /** Omitted where the tab has no WhatsApp action of its own. */
  onSendWhatsApp?: (c: CandidateView) => void;
}) {
  const verification = verificationStateOf(candidate);

  /**
   * Notes are saved on a button, not on every keystroke, so a half-written note
   * lives only in the textarea. Stepping to the next candidate would discard it
   * without a word — so the first press warns and the second goes, the same
   * two-step the offer and verification panels use for anything irreversible.
   */
  const [notesDirty, setNotesDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<"prev" | "next" | null>(null);

  function move(dir: "prev" | "next") {
    if (!nav) return;
    if (notesDirty && confirmLeave !== dir) {
      setConfirmLeave(dir);
      return;
    }
    (dir === "prev" ? nav.onPrev : nav.onNext)();
  }

  const atStart = !nav || nav.index <= 0;
  const atEnd = !nav || nav.index >= nav.total - 1;

  // Read through a ref so the listener is registered once rather than being
  // torn down and rebuilt on every render by an inline `nav` object.
  const moveRef = useRef(move);
  moveRef.current = move;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // While something is being typed in or chosen from, the arrows belong to
      // it — navigating away mid-sentence is not what the key was pressed for.
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      moveRef.current(e.key === "ArrowLeft" ? "prev" : "next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${candidate.fullName || "Candidate"} profile`}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-navy-900">{candidate.fullName || "Candidate"}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* There is no status column on either table, so this is the only
                  place a status can be changed. Editable here rather than a
                  badge, or the capability disappears with the column. */}
              <select
                value={candidate.status}
                onChange={(e) => onStatusChange(candidate.id, e.target.value as CandidateStatus)}
                className="select !w-auto !py-1.5 text-xs"
                aria-label="Change status"
              >
                {CANDIDATE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <InterviewBadge
                completed={candidate.interviewCompleted}
                opened={!!candidate.interviewOpenedAt}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {nav ? (
              <>
                <button
                  type="button"
                  onClick={() => move("prev")}
                  disabled={atStart}
                  className="rounded-lg border border-navy-200 px-2 py-1.5 text-navy-600 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Previous candidate"
                  title="Previous candidate (←)"
                >
                  <Icon name="chevronLeft" className="h-4 w-4" />
                </button>
                {/* Position in the filtered list, so it answers "how many left". */}
                <span className="whitespace-nowrap px-1 text-xs font-semibold tabular-nums text-navy-500">
                  {nav.index + 1} of {nav.total}
                </span>
                <button
                  type="button"
                  onClick={() => move("next")}
                  disabled={atEnd}
                  className="mr-1 rounded-lg border border-navy-200 px-2 py-1.5 text-navy-600 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Next candidate"
                  title="Next candidate (→)"
                >
                  <Icon name="chevronRight" className="h-4 w-4" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-navy-500 hover:bg-navy-100"
              aria-label="Close"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {confirmLeave ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Your notes have not been saved. Press{" "}
            {confirmLeave === "prev" ? "Previous" : "Next"} again to leave them behind, or save
            them first.
          </p>
        ) : null}

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Email" value={candidate.email} />
          <Field
            label="WhatsApp number"
            value={
              <>
                {candidate.phone}
                <PhoneCountryFlag country={candidate.country} phone={candidate.phone} />
              </>
            }
          />
          <Field label="Date of birth" value={candidate.dob} />
          <Field label="Position" value={candidate.position} />
          <Field label="Country" value={candidate.country} />
          {/* Where the application actually came from, so the stated country
              can be read next to it rather than taken on trust. */}
          <Field
            label="Sent from"
            value={
              candidate.detectedCountryName ? (
                <>
                  <span
                    className={
                      countryMatch(candidate) === "mismatch" ? "font-semibold text-amber-700" : ""
                    }
                  >
                    {candidate.detectedCountryName}
                  </span>
                  <span className="block text-xs font-normal text-navy-400">
                    Detected {fmt(candidate.detectedCountryAt)} · from the network address, not the
                    form
                  </span>
                </>
              ) : (
                <span className="text-navy-400">Not detected</span>
              )
            }
          />
          <Field label="City" value={candidate.city} />
          <Field label="Full address" value={candidate.address} full />
          <Field label="Languages" value={candidate.languages.join(", ")} full />
          <Field
            label="LinkedIn"
            full
            value={
              candidate.linkedin ? (
                <a
                  href={candidate.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 underline"
                >
                  {candidate.linkedin}
                </a>
              ) : (
                ""
              )
            }
          />
          <Field label="Applied" value={fmt(candidate.submittedAt || candidate.createdAt)} />
          <Field label="Invitation sent" value={fmt(candidate.invitationSentAt)} />
        </dl>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-navy-800">Documents</p>
          <DocumentList
            id={candidate.id}
            documents={candidate.documents}
            onOpen={onOpenDocument}
          />
        </div>

        <div className="mt-5">
          <VerificationPanel
            id={candidate.id}
            fullName={candidate.fullName}
            documents={candidate.documents}
            initial={verification}
            onChange={(v) =>
              onChange({
                verificationStatus: v.status,
                verifiedAt: v.verifiedAt,
                verifiedBy: v.verifiedBy,
                rejectedAt: v.rejectedAt,
                rejectionReason: v.rejectionReason,
                imagesDeletedAt: v.imagesDeletedAt,
                verificationRequestedAt: v.requestedAt,
              })
            }
          />
        </div>

        {/* The live interview happens off-system, once the recording is in;
            this is where its outcome lands. */}
        {showOffer && canOffer(candidate.voiceStatus, candidate) ? (
          <div className="mt-5">
            <OfferPanel
              id={candidate.id}
              fullName={candidate.fullName}
              position={candidate.position}
              hasEmail={!!candidate.email}
              initial={{
                offer: candidate.offer,
                offerSentAt: candidate.offerSentAt,
                offerAcceptedAt: candidate.offerAcceptedAt,
                offerDeclinedAt: candidate.offerDeclinedAt,
                offerDeclineReason: candidate.offerDeclineReason,
              }}
              onChange={({ status, ...offerState }) =>
                onChange({
                  ...offerState,
                  ...(status ? { status: status as CandidateStatus } : {}),
                })
              }
            />
          </div>
        ) : null}

        {/* What they stated when accepting, and what they corrected. Sits
            directly under the offer, which is what prompted it. */}
        <ConfirmedDetailsPanel candidate={candidate} />

        {/* Whether they already trade through a UK limited company, which is
            the same question the offer step asks them. */}
        <CompanyCheckPanel
          id={candidate.id}
          initial={candidate.companyCheck}
          hasDob={!!(candidate.dob || candidate.confirmedDetails?.dob)}
        />

        <NotesEditor
          id={candidate.id}
          initial={candidate.notes ?? ""}
          onSaved={(notes) => onChange({ notes })}
          onDirtyChange={(dirty) => {
            setNotesDirty(dirty);
            // Saving them clears the warning, rather than leaving it standing
            // over a note that is now safely stored.
            if (!dirty) setConfirmLeave(null);
          }}
        />

        <div className="mt-5 rounded-xl border border-navy-100 bg-navy-50/50 p-4">
          <p className="text-sm font-semibold text-navy-800">Interview</p>
          {candidate.interviewCompleted ? (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-navy-600">
                Score:{" "}
                <strong>
                  {candidate.score}/{candidate.total}
                </strong>
              </p>
              <Link
                href={`/admin/interviews/${candidate.id}`}
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                View full results →
              </Link>
            </div>
          ) : (
            <p className="mt-1 text-sm text-navy-500">Not completed yet.</p>
          )}
        </div>

        {onSendWhatsApp ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSendWhatsApp(candidate)}
              disabled={!candidate.phone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Icon name="chat" className="h-4 w-4" /> Send interview link via WhatsApp
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-navy-900">{value || "—"}</dd>
    </div>
  );
}
