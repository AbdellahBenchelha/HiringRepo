"use client";

import { useEffect, useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { Icon } from "@/components/Icon";
import { DOCUMENT_LABEL, type CandidateDocument } from "@/lib/documents";
import {
  RESIDENCE_KINDS,
  RESIDENCE_LABEL,
  RESIDENCE_REASONS,
  isResidenceKind,
  residenceStatus,
  type ResidenceInput,
  type ResidenceStatus,
} from "@/lib/residence";

/**
 * Proof that a candidate lives where they say they live.
 *
 * Sits under the identity photographs because it is the same question asked
 * one step further on: the passport says who they are and which country issued
 * it, and this says which country they are in. The two are routinely different
 * and the agreement carries the second one.
 *
 * Nothing here happens on its own. The request is a button a recruiter
 * presses, because the mismatch that prompts it is common and almost always
 * innocent, and a rule that emailed everyone whose passport and address
 * disagreed would spend its time troubling expats.
 */

const STYLE: Record<ResidenceStatus, { chip: string; icon: "shield" | "clock" | "checkCircle" | "close" | "mapPin" }> = {
  not_asked: { chip: "bg-navy-100 text-navy-600", icon: "mapPin" },
  awaiting: { chip: "bg-amber-100 text-amber-800", icon: "clock" },
  provided: { chip: "bg-blue-100 text-blue-800", icon: "shield" },
  explained: { chip: "bg-blue-100 text-blue-800", icon: "shield" },
  verified: { chip: "bg-green-100 text-green-800", icon: "checkCircle" },
  rejected: { chip: "bg-red-100 text-red-800", icon: "close" },
};

function fmt(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export interface ResidencePanelState extends ResidenceInput {
  documents?: CandidateDocument[];
}

export function ResidencePanel({
  id,
  documents,
  state,
  defaultCountry,
  nationality,
  onChange,
}: {
  id: string;
  documents?: CandidateDocument[];
  state: ResidencePanelState;
  /** Prefilled into the request form — the country the agreement will carry. */
  defaultCountry?: string;
  /** Shown beside it, because the pair is the whole reason to ask. */
  nationality?: string;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<string>(RESIDENCE_REASONS[0].value);
  const [custom, setCustom] = useState("");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [emailed, setEmailed] = useState("");
  /**
   * Their words, fetched rather than passed in.
   *
   * Not on the candidate view for the same reason the SSN is not: that object
   * is built for every row of a table. Fetched as this panel opens rather
   * than behind a button, because it is the one thing a recruiter has to read
   * and a panel that hid it would be a panel nobody read.
   */
  const [explanation, setExplanation] = useState("");

  const explainedAt = state.residenceExplainedAt;
  useEffect(() => {
    if (!explainedAt) {
      setExplanation("");
      return;
    }
    let live = true;
    fetch(`/api/admin/candidates/${id}/residence`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; explanation?: string }) => {
        if (live && d.ok) setExplanation(d.explanation ?? "");
      })
      .catch(() => {
        /* the status still shows; the words are the only thing missing */
      });
    return () => {
      live = false;
    };
  }, [id, explainedAt]);

  const status = residenceStatus({ ...state, documents });
  const style = STYLE[status];

  const usable = (d: CandidateDocument) =>
    isResidenceKind(d.kind) && d.status !== "blocked" && !!d.key;
  const images = (documents ?? []).filter((d) => usable(d) && !d.supersededAt);
  const previous = (documents ?? []).filter((d) => usable(d) && !!d.supersededAt);

  const viewUrl = (d: CandidateDocument) =>
    `/api/admin/documents/${id}/${d.kind}?mode=view${
      d.supersededAt ? `&v=${encodeURIComponent(d.key ?? "")}` : ""
    }`;

  async function act(action: string, extra?: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/residence`, { action, ...extra });
      const data = (await res.json()) as Record<string, unknown> & { ok?: boolean; error?: string };
      if (!data.ok) {
        setError(
          data.error === "warmup_limit"
            ? "Today's sending limit is reached, so nothing was sent. Try again after it resets, or raise the cap on the Warm-up tab."
            : data.error === "reason_required"
              ? "Choose a reason, or write one."
              : "That did not go through.",
        );
        return;
      }
      if (action === "request") {
        setAsking(false);
        setEmailed(
          data.emailed
            ? "sent"
            : data.emailError === "no_email"
              ? "no email address on file"
              : `not sent (${String(data.emailError ?? "unknown")})`,
        );
      }
      if (action === "reject") setRejecting(false);
      onChange(data);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-navy-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy-500">
            <Icon name="mapPin" className="h-4 w-4" />
            Proof of residence
          </h3>
          {/* The pair, stated plainly. A recruiter deciding whether to ask
              wants both countries in one line, not one here and one three
              tabs away. */}
          <p className="mt-1.5 text-sm text-navy-600">
            {nationality || defaultCountry ? (
              <>
                Nationality <strong className="text-navy-900">{nationality || "—"}</strong> · lives
                in <strong className="text-navy-900">{defaultCountry || "—"}</strong>
              </>
            ) : (
              "Their nationality and country of residence are not both on file yet."
            )}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.chip}`}
        >
          <Icon name={style.icon} className="h-3.5 w-3.5" />
          {RESIDENCE_LABEL[status]}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* What we asked                                                      */}
      {/* ------------------------------------------------------------------ */}
      {state.residenceRequestedAt ? (
        <div className="mt-4 rounded-xl border border-cream-300 bg-cream-100 p-3.5 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Asked {fmt(state.residenceReuploadRequestedAt ?? state.residenceRequestedAt)}
            {state.residenceCountry ? ` · to prove ${state.residenceCountry}` : ""}
          </p>
          {state.residenceReason ? (
            <p className="mt-1.5 leading-relaxed text-navy-700">{state.residenceReason}</p>
          ) : null}
          {emailed ? (
            <p className="mt-2 text-xs font-medium text-navy-500">Email: {emailed}</p>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* What came back                                                     */}
      {/* ------------------------------------------------------------------ */}
      {explainedAt ? (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
            They have no permit — their explanation, {fmt(explainedAt)}
          </p>
          {/* Their own words, wrapped and whole. Truncating the one thing a
              recruiter has to judge would defeat the point of asking. */}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy-800">
            {explanation || "Loading…"}
          </p>
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {images.map((d) => (
            <a
              key={d.key}
              href={viewUrl(d)}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-xl border border-navy-200 bg-navy-50 transition hover:border-brand-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewUrl(d)}
                alt={DOCUMENT_LABEL[d.kind]}
                className="aspect-[4/3] w-full bg-navy-100 object-contain"
              />
              <span className="block px-3 py-2 text-xs font-semibold text-navy-700 group-hover:text-brand-700">
                {DOCUMENT_LABEL[d.kind]} · {fmt(d.uploadedAt)}
              </span>
            </a>
          ))}
        </div>
      ) : null}

      {previous.length > 0 ? (
        <p className="mt-2 text-xs text-navy-400">
          {previous.length} earlier {previous.length === 1 ? "photo" : "photos"} replaced.
        </p>
      ) : null}

      {state.residenceRejectionReason ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          Rejected {fmt(state.residenceRejectedAt)} — {state.residenceRejectionReason}
        </p>
      ) : null}
      {status === "verified" ? (
        <p className="mt-3 text-sm text-green-700">
          Residence confirmed {fmt(state.residenceVerifiedAt)}
          {state.residenceCountry ? ` — ${state.residenceCountry}` : ""}.
        </p>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* The request form                                                   */}
      {/* ------------------------------------------------------------------ */}
      {asking ? (
        <div className="mt-4 rounded-xl border-2 border-brand-200 bg-brand-50/40 p-4">
          <label
            htmlFor="residence-country"
            className="block text-xs font-bold uppercase tracking-wide text-navy-500"
          >
            Country they must prove
          </label>
          <input
            id="residence-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. China"
            className="mt-1.5 w-full max-w-xs rounded-xl border border-navy-200 px-3 py-2 text-sm"
          />

          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-navy-500">
            What to tell them
          </label>
          <div className="mt-1.5 space-y-1.5">
            {RESIDENCE_REASONS.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="residence-reason"
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-brand-600"
                />
                <span className="text-navy-700">{r.label}</span>
              </label>
            ))}
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="residence-reason"
                checked={reason === "custom"}
                onChange={() => setReason("custom")}
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-brand-600"
              />
              <span className="text-navy-700">Write my own</span>
            </label>
          </div>

          {reason === "custom" ? (
            <textarea
              id="residence-custom-reason"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="Shown to the candidate exactly as written."
              className="mt-2 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
            />
          ) : (
            <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs leading-relaxed text-navy-500">
              {RESIDENCE_REASONS.find((r) => r.value === reason)?.message}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act("request", { reason, customReason: custom, country })
              }
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-brand-400 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send the request"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAsking(false)}
              className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {rejecting ? (
        <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50/60 p-4">
          <label
            htmlFor="residence-reject-reason"
            className="block text-xs font-bold uppercase tracking-wide text-navy-500"
          >
            Why is it being rejected?
          </label>
          <textarea
            id="residence-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            maxLength={400}
            className="mt-1.5 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act("reject", { reason: rejectReason })}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejecting(false)}
              className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* The buttons                                                        */}
      {/* ------------------------------------------------------------------ */}
      {!asking && !rejecting ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCountry(defaultCountry ?? "");
              setAsking(true);
            }}
            className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            {status === "not_asked" ? "Ask for proof of address" : "Ask again"}
          </button>

          {/* Only once there is something to decide on. A Verify button with
              nothing in front of it invites a decision made from nothing. */}
          {status === "provided" || status === "explained" || status === "rejected" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act("verify")}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              Accept as proven
            </button>
          ) : null}
          {status === "provided" || status === "explained" || status === "verified" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          ) : null}
          {images.length > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act("clear-images")}
              className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-600 transition hover:bg-navy-50 disabled:opacity-50"
            >
              Forget the photos
            </button>
          ) : null}
        </div>
      ) : null}

      {state.residenceImagesDeletedAt ? (
        <p className="mt-2 text-xs text-navy-400">
          Photographs deleted {fmt(state.residenceImagesDeletedAt)}. The decision above stands.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

      {status === "not_asked" ? (
        <p className="mt-3 text-xs leading-relaxed text-navy-400">
          Only ask when you need to. Holding a passport from one country and living in another is
          ordinary, and the agreement only needs this when the address on it has nothing behind
          it. Nothing is sent until you press the button — {RESIDENCE_KINDS.length} photos are
          requested, and the candidate can answer in writing instead if they have no permit.
        </p>
      ) : null}
    </section>
  );
}
