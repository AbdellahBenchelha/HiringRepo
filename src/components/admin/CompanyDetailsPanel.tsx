"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  COMPANY_LABELS,
  REQUIRED_COMPANY_DOCS,
  companyChanges,
  formatCompanyAddress,
  hasCompanyDoc,
  missingCompanyDocs,
} from "@/lib/companyDetails";
import { COMPANY_KINDS, DOCUMENT_LABEL, type CandidateDocument } from "@/lib/documents";
import type { CandidateView } from "@/lib/candidateView";

/**
 * The company a candidate contracts through, and whether it is confirmed.
 *
 * Shown only for somebody who accepted as a company. For everybody else the
 * agreement is with them personally and there is nothing here to ask about.
 *
 * The diff against the acceptance form is the point of the whole step: a
 * company number typed in a hurry on a phone and the one printed on a state
 * certificate are frequently not the same string, and the agreement depends on
 * which of them is right.
 */

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function CompanyDetailsPanel({
  candidate,
  onOpenDocument,
  onChange,
}: {
  candidate: CandidateView;
  onOpenDocument?: (doc: CandidateDocument) => void;
  onChange?: (patch: Partial<CandidateView>) => void;
}) {
  const [requests, setRequests] = useState<string[]>(
    candidate.companyRequests ?? (candidate.companyRequestedAt ? [candidate.companyRequestedAt] : []),
  );
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const engagedAs = candidate.confirmedDetails?.engagedAs;
  if (!candidate.offerAcceptedAt || engagedAs !== "Company") return null;

  const details = candidate.companyDetails;
  const missing = missingCompanyDocs(candidate.documents);
  const changes = details ? companyChanges(candidate.confirmedDetails, details) : [];
  const hasEmail = !!candidate.email?.includes("@");

  const current = (kind: string) =>
    (candidate.documents ?? []).find((d) => d.kind === kind && !d.supersededAt && !!d.key);

  async function send() {
    if (busy) return;
    setBusy(true);
    setAsking(false);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/company-request`, {});
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        companyRequestedAt?: string;
        companyRequestCount?: number;
        companyRequests?: string[];
      };
      if (data.ok) {
        const next = data.companyRequests ?? [...requests, data.companyRequestedAt ?? ""];
        setRequests(next.filter(Boolean));
        setResult("sent");
        onChange?.({
          companyRequestedAt: data.companyRequestedAt,
          companyRequestCount: data.companyRequestCount,
          companyRequests: data.companyRequests,
        });
      } else {
        setResult(data.error ?? "failed");
      }
    } catch {
      setResult("failed");
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mt-4 rounded-xl border border-navy-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-navy-800">Company details</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                candidate.companyNeeded
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {candidate.companyNeeded ? "Not confirmed" : "Confirmed"}
            </span>
          </div>
          {candidate.companyNeeded ? (
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={!hasEmail || busy}
              title={hasEmail ? "Email them the company details form" : "No email on file"}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              <Icon name="mail" className="h-3.5 w-3.5" />
              {requests.length ? "Request again" : "Request company details"}
            </button>
          ) : null}
        </div>

        {/* The blocker, said plainly: an agreement drawn up now would name a
            company we have a claim about and no evidence of. */}
        {candidate.companyNeeded ? (
          <p className="mt-2.5 text-xs leading-relaxed text-red-700">
            No agreement can be issued yet — it would be made with the company, and{" "}
            {!details && missing.length
              ? "neither the details nor the paperwork are on file."
              : !details
                ? "the details have not been confirmed."
                : `the ${missing.map((k) => DOCUMENT_LABEL[k as (typeof COMPANY_KINDS)[number]]).join(" and ")} ${missing.length === 1 ? "is" : "are"} missing.`}
          </p>
        ) : null}

        {/* What they said when accepting, always. It is the claim the rest of
            this panel is measured against. */}
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <Row label="Name given on acceptance" value={candidate.confirmedDetails?.companyName} />
          <Row label="Number given on acceptance" value={candidate.confirmedDetails?.companyNumber} />
        </dl>

        {details ? (
          <>
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-navy-100 pt-3 text-sm sm:grid-cols-2">
              <Row label={COMPANY_LABELS.companyName} value={details.companyName} />
              <Row label={COMPANY_LABELS.companyNumber} value={details.companyNumber} />
              <Row label={COMPANY_LABELS.ein} value={details.ein} />
              <Row label="Registered address" value={formatCompanyAddress(details)} full />
              {/* One or the other, never both. Older records have neither. */}
              {details.website ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-navy-400">
                    {COMPANY_LABELS.website}
                  </dt>
                  <dd className="break-words text-sm font-medium">
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-brand-700 underline"
                    >
                      {details.website}
                    </a>
                  </dd>
                </div>
              ) : null}
              {details.activity ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-navy-400">
                    {COMPANY_LABELS.activity}
                  </dt>
                  <dd className="whitespace-pre-line break-words text-sm text-navy-900">
                    {details.activity}
                  </dd>
                  <p className="mt-0.5 text-xs text-navy-400">They have no website.</p>
                </div>
              ) : null}
            </dl>
            <p className="mt-1.5 text-xs text-navy-400">
              Confirmed {fmt(candidate.companyDetailsAt)}
            </p>

            {changes.length ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                  Corrected from the acceptance form
                </p>
                <ul className="mt-2 space-y-1.5">
                  {changes.map((c) => (
                    <li key={c.label} className="text-xs text-amber-900">
                      <span className="font-semibold">{c.label}:</span>{" "}
                      <span className="line-through opacity-70">{c.was}</span>{" "}
                      <span aria-hidden>→</span> <span className="font-semibold">{c.now}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        {/* The paperwork. A tick is not evidence — each one opens. */}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-navy-100 pt-3">
          {COMPANY_KINDS.map((kind) => {
            const doc = current(kind);
            const required = (REQUIRED_COMPANY_DOCS as readonly string[]).includes(kind);
            const there = hasCompanyDoc(candidate.documents, kind);
            if (!there) {
              return (
                <span
                  key={kind}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    required
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-navy-200 bg-navy-50 text-navy-400"
                  }`}
                >
                  {DOCUMENT_LABEL[kind]} — {required ? "missing" : "not sent"}
                </span>
              );
            }
            return (
              <button
                key={kind}
                type="button"
                onClick={() => doc && onOpenDocument?.(doc)}
                className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-800 transition hover:bg-green-100"
              >
                <Icon name="document" className="h-3 w-3" />
                {DOCUMENT_LABEL[kind]}
              </button>
            );
          })}
        </div>

        {/* Dates, like the identity reminders: what was asked and when. */}
        {requests.length ? (
          <div className="mt-3 border-t border-navy-100 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-500">Requests sent</p>
            <ol className="mt-1.5 space-y-1 text-xs text-navy-600">
              {requests.map((at, i) => (
                <li key={at} className="flex gap-2">
                  <span className="font-semibold text-navy-400">{i + 1}.</span>
                  <span>{fmt(at)}</span>
                </li>
              ))}
            </ol>
            {candidate.companyOpenedAt ? (
              <p className="mt-1.5 text-xs text-navy-500">
                They opened the form on {fmt(candidate.companyOpenedAt)}.
              </p>
            ) : requests.length ? (
              <p className="mt-1.5 text-xs text-navy-500">They have not opened the form yet.</p>
            ) : null}
          </div>
        ) : candidate.companyNeeded ? (
          <p className="mt-3 border-t border-navy-100 pt-3 text-xs text-navy-500">
            Nothing requested yet.
          </p>
        ) : null}

        {result === "sent" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
            <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Request emailed.
          </p>
        ) : result ? (
          <p className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={asking}
        icon="mail"
        title={requests.length ? "Request the details again?" : "Request company details?"}
        confirmLabel={busy ? "Sending…" : "Send request"}
        busy={busy}
        warning={
          requests.length
            ? `${requests.length === 1 ? "One has" : `${requests.length} have`} already been sent, the last on ${fmt(requests[requests.length - 1])}.`
            : undefined
        }
        onCancel={() => setAsking(false)}
        onConfirm={() => void send()}
        body={
          <>
            An email goes to{" "}
            <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
            {candidate.email ? (
              <>
                {" "}
                at <span className="font-medium text-navy-800">{candidate.email}</span>
              </>
            ) : null}
            , asking them to confirm{" "}
            <strong className="text-navy-900">
              {candidate.confirmedDetails?.companyName || "their company"}
            </strong>{" "}
            — its number, EIN, registered address and website — and to attach a signed W-9 and the
            certificate of formation. Their link is pre-filled with what they told us when they
            accepted.
          </>
        }
      />
    </>
  );
}

function Row({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="break-words text-sm font-medium text-navy-900">{value || "—"}</dd>
    </div>
  );
}
