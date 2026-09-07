"use client";

import { Icon } from "@/components/Icon";
import { supersededDocuments, type CandidateDocument } from "@/lib/documents";
import { currentVoiceRecording } from "@/lib/voice";
import type { VoiceStatus } from "@/lib/candidateStatus";

/**
 * Listen to a candidate's voice assessment.
 *
 * It used to arrive on WhatsApp, which meant scrolling a thread to find a
 * voice note and working out whose it was. Here it is on their record, beside
 * their assessment answers, and it plays where the decision is made.
 *
 * Earlier recordings are kept the same way earlier identity photographs are:
 * a recruiter who asks for a second attempt should be able to hear both, and
 * the first one is the only evidence of what was actually sent.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** ?v= names a specific version; without it the route serves the current one. */
function src(id: string, doc: CandidateDocument): string {
  return `/api/admin/documents/${id}/voice?mode=view${
    doc.supersededAt ? `&v=${encodeURIComponent(doc.key ?? "")}` : ""
  }`;
}

export function VoicePanel({
  id,
  documents,
  voiceStatus,
  requestedAt,
}: {
  id: string;
  documents?: CandidateDocument[];
  voiceStatus?: VoiceStatus;
  /** When a recording was last asked for, so waiting can be dated. */
  requestedAt?: string;
}) {
  const current = currentVoiceRecording(documents);
  const earlier = supersededDocuments(documents, ["voice"]).filter((d) => !!d.key);

  // Nothing asked for and nothing sent. Saying so would be noise on the
  // profile of everyone who has not reached this stage.
  if (!current && !earlier.length && !requestedAt) return null;

  return (
    <div className="rounded-xl border border-navy-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-navy-800">Voice assessment</p>
        {current ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
            <Icon name="checkCircle" className="h-3 w-3" />
            Recording received
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Waiting for the recording
          </span>
        )}
      </div>

      {current ? (
        <>
          <audio src={src(id, current)} controls preload="none" className="mt-3 w-full" />
          <p className="mt-1.5 text-xs text-navy-500">
            Sent {fmt(current.uploadedAt)}. Judge it here, then set the outcome above —
            &ldquo;Received&rdquo; only means it arrived.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-navy-500">
          {requestedAt ? (
            <>
              Asked on {fmt(requestedAt)}. Their assessment link shows the recording step until
              something arrives.
            </>
          ) : (
            <>No recording yet.</>
          )}
        </p>
      )}

      {/* Kept, not replaced. A recruiter who asked for a second attempt is
          usually asking whether it is any better than the first. */}
      {earlier.length ? (
        <details className="mt-3 rounded-lg border border-navy-100 bg-navy-50/50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-navy-700">
            Earlier recordings ({earlier.length}) — kept until deleted
          </summary>
          <div className="mt-2 space-y-3">
            {earlier.map((doc) => (
              <div key={doc.key}>
                <p className="text-[11px] font-semibold text-navy-500">
                  Sent {fmt(doc.uploadedAt)} · replaced {fmt(doc.supersededAt)}
                </p>
                <audio src={src(id, doc)} controls preload="none" className="mt-1 w-full" />
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {voiceStatus === "Voice Assessment Failed" ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          Marked as failed. Asking again from the Interviews tab reopens the step on their link,
          and this recording is kept.
        </p>
      ) : null}
    </div>
  );
}
