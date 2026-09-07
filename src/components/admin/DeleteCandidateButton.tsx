"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminDelete } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { isVerificationKind } from "@/lib/verification";
import type { CandidateDocument } from "@/lib/documents";

/**
 * Delete a candidate, from any of the lists they appear in.
 *
 * One component rather than the same twenty lines in three tables. The
 * confirmation is the part worth not copying: it names the person, and it
 * lists what actually goes with them — which differs by how far along they
 * are, and is the difference between an informed click and a reflex.
 *
 * The dialog lives inside the button rather than at the top of the table,
 * because unlike the profile dialog it only ever concerns one row and needs to
 * know nothing about the others. It renders nothing while closed.
 */

/** The smallest shape this needs. Every table's row satisfies it. */
export interface DeletableCandidate {
  id: string;
  fullName: string;
  email?: string;
  documents?: CandidateDocument[];
  interviewCompleted?: boolean;
  offerAcceptedAt?: string;
}

/**
 * What will be destroyed, in the candidate's own terms.
 *
 * Built from what they actually have, not from a fixed sentence. "Their
 * application and notes" is true of everyone and warns nobody; "their offer,
 * the details they confirmed and 5 identity photographs" is what makes someone
 * stop and check they are on the right row.
 */
function losses(c: DeletableCandidate): string[] {
  const have = (c.documents ?? []).filter((d) => !!d.key);
  const photos = have.filter((d) => isVerificationKind(d.kind)).length;
  const voice = have.filter((d) => d.kind === "voice").length;
  const files = have.filter((d) => !isVerificationKind(d.kind) && d.kind !== "voice").length;
  return [
    "their application and your notes",
    c.interviewCompleted ? "their assessment answers and score" : null,
    c.offerAcceptedAt ? "their accepted offer and the details they confirmed" : null,
    photos ? `${photos} identity photograph${photos === 1 ? "" : "s"}` : null,
    voice ? `${voice} voice recording${voice === 1 ? "" : "s"}` : null,
    files ? `${files} uploaded file${files === 1 ? "" : "s"}` : null,
  ].filter((s): s is string => typeof s === "string");
}

export function DeleteCandidateButton({
  candidate,
  onDeleted,
}: {
  candidate: DeletableCandidate;
  /** Drop the row. The record is gone; a list still showing it is lying. */
  onDeleted: (id: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setAsking(false);
    setBusy(true);
    try {
      const res = await adminDelete(`/api/admin/candidates/${candidate.id}`);
      if (res.ok) onDeleted(candidate.id);
      else window.alert("Could not delete this candidate. Please try again.");
    } catch {
      window.alert("Could not delete this candidate. Please try again.");
    }
    setBusy(false);
  }

  const what = losses(candidate);

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        disabled={busy}
        title="Delete this candidate permanently"
        aria-label={`Delete ${candidate.fullName || "candidate"}`}
        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={asking}
        tone="danger"
        icon="trash"
        title="Delete this candidate?"
        confirmLabel="Delete permanently"
        busy={busy}
        warning={
          candidate.offerAcceptedAt
            ? "This person accepted an offer. Deleting them erases the record of that."
            : "This cannot be undone."
        }
        onCancel={() => setAsking(false)}
        onConfirm={remove}
        body={
          <>
            <p>
              <strong className="text-navy-900">{candidate.fullName || "This candidate"}</strong>
              {candidate.email ? (
                <>
                  {" "}
                  (<span className="break-all">{candidate.email}</span>)
                </>
              ) : null}{" "}
              will be erased, along with:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {what.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        }
      />
    </>
  );
}
