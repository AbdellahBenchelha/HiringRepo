"use client";

import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { adminPost, csrfToken } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { CandidateDocument } from "@/lib/documents";
import {
  AGREEMENT_REASK_REASONS,
  AGREEMENT_STATUS_LABEL,
  MAX_AGREEMENT_REASON,
  MAX_SIGNED_FILES,
  agreementReaskMessage,
  agreementVersions,
  formatAgreementDate,
  type AgreementStatus,
} from "@/lib/agreement";
import type { CandidateView } from "@/lib/candidateView";
import { OnboardingChatBox } from "@/components/admin/OnboardingChatBox";
import {
  COMPANY_TIME_ZONE,
  DAY_KEYS,
  DAY_LABELS,
  REQUIRED_DAYS,
  START_TIMES,
  endTimeFor,
  formatAvailability,
  knownTimeZones,
  windowInCompanyTime,
  type DayKey,
} from "@/lib/availability";

/**
 * The final agreement for one candidate — see lib/agreement.
 *
 * Preview it, send it (Full verified only), remind, and when the signed copy
 * is back: open it, accept it, or ask for it again with a reason. A copy that
 * came back by email is uploaded here with "Mark as signed".
 */

const STYLE: Record<AgreementStatus, { chip: string; icon: IconName }> = {
  not_sent: { chip: "bg-navy-100 text-navy-600", icon: "document" },
  sent: { chip: "bg-amber-100 text-amber-800", icon: "clock" },
  signed: { chip: "bg-blue-100 text-blue-800", icon: "fileCheck" },
  approved: { chip: "bg-green-100 text-green-800", icon: "checkCircle" },
};

const EVENT_LABEL = {
  sent: "Agreement sent",
  updated: "Updated agreement sent",
  reminder: "Reminder",
  reask: "Asked to send again",
} as const;

const ERRORS: Record<string, string> = {
  warmup_limit: "today's sending limit is reached — try again after it resets, or raise the cap on the Warm-up tab",
  no_email: "no email address on file",
  too_soon: "the same email went less than a minute ago",
  missing: "some details are missing — see the list above",
  already_signed: "they have already sent it back signed",
  not_waiting: "they are not waiting to sign",
  no_document: "there is no signed copy to replace",
  not_sent: "no agreement has been sent yet",
  no_reason: "choose a reason or write one",
  nothing_to_approve: "there is no new signed copy to accept",
  fake_recipient: "the email address is not a real mailbox",
  no_files: "choose the signed file first",
  too_many: `up to ${MAX_SIGNED_FILES} files`,
  too_large: "a file is larger than 10 MB",
  bad_type: "only PDF, JPG or PNG files",
  blocked: "a file did not pass the file check",
  storage_unavailable: "file storage is not available",
  bad_date: "choose a valid date",
  same_date: "that is already the start date in their agreement",
  bad_availability: "choose a start time, a timezone and exactly 5 days",
  already_sent: "the agreement has already been sent",
};

function fmt(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Patch = Partial<CandidateView>;
const PATCH_KEYS = [
  "agreementStartDate", "agreementSentAt", "agreementRef", "agreementReason", "agreementEvents", "agreementSignedAt",
  "agreementSubmissions", "agreementApprovedAt", "agreementApprovedBy", "agreementStatus", "agreementMissing", "documents",
  "availability", "availabilitySetBy",
] as const;

export function AgreementPanel({
  candidate,
  onOpenDocument,
  onChange,
}: {
  candidate: CandidateView;
  onOpenDocument: (doc: CandidateDocument) => void;
  onChange: (patch: Patch) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"send" | "reminder" | "update" | null>(null);
  const [reasking, setReasking] = useState(false);
  const [reason, setReason] = useState<string>(AGREEMENT_REASK_REASONS[0].value);
  const [custom, setCustom] = useState("");
  const [marking, setMarking] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const offerStart = candidate.offer?.startDate ?? "";
  const currentStart = candidate.agreementStartDate || offerStart;
  const [startDate, setStartDate] = useState(currentStart);
  const fileInput = useRef<HTMLInputElement>(null);
  const hours = candidate.availability;
  const [editHours, setEditHours] = useState(!hours);
  const [hStart, setHStart] = useState(hours?.startTime ?? "09:00");
  const [hZone, setHZone] = useState(hours?.timeZone ?? COMPANY_TIME_ZONE);
  const [hDays, setHDays] = useState<DayKey[]>(hours?.days ?? ["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const zones = knownTimeZones();

  const status = candidate.agreementStatus ?? "not_sent";
  const missing = candidate.agreementMissing ?? [];
  const canPreview = !missing.some((m) => m !== "the candidate is not Full verified");
  const events = candidate.agreementEvents ?? [];
  const submissions = candidate.agreementSubmissions ?? [];
  const latest = submissions.at(-1);
  const docs = (candidate.documents ?? []).filter((d) => d.kind === "signedAgreement" && d.key);
  const signedDocs = latest ? latest.keys.map((k) => docs.find((d) => d.key === k)).filter((d): d is CandidateDocument => !!d) : [];
  const earlier = submissions.slice(0, -1);
  const versions = agreementVersions(events);
  const replaced = versions.slice(0, -1).reverse();
  const reminders = events.filter((e) => e.kind === "reminder" && (!candidate.agreementSentAt || e.at >= candidate.agreementSentAt)).length;
  const lastEvent = events.at(-1);
  const recentEvent = !!lastEvent && Date.now() - Date.parse(lastEvent.at) < 24 * 60 * 60 * 1000;
  const hasEmail = !!candidate.email?.includes("@");
  const reaskMessage = agreementReaskMessage(reason, custom);
  const api = `/api/admin/candidates/${candidate.id}/agreement`;

  function apply(data: Record<string, unknown>) {
    const patch: Patch = {};
    for (const key of PATCH_KEYS) (patch as Record<string, unknown>)[key] = data[key] ?? undefined;
    onChange(patch);
  }

  async function handle(res: Response, okText: string) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { ok?: boolean; error?: string; reason?: string };
    if (!data.ok) {
      const why =
        res.status === 401
          ? "your admin session has expired — sign in again"
          : `${ERRORS[data.error ?? ""] ?? data.error ?? "failed"}${data.reason ? ` (${data.reason})` : ""}`;
      setResult({ ok: false, text: `Not done (${why}).` });
      return false;
    }
    apply(data);
    setResult({ ok: true, text: okText });
    return true;
  }

  async function act(action: "send" | "reminder" | "update" | "reask" | "approve" | "unapprove") {
    if (busy) return;
    if (action === "reask" && !reaskMessage) {
      setResult({ ok: false, text: ERRORS.no_reason });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await adminPost(api, {
        action,
        ...(action === "reask" ? { reason, custom } : {}),
        ...(action === "update" ? { date: startDate } : {}),
      });
      const ok = await handle(
        res,
        {
          send: "Agreement emailed.",
          reminder: "Reminder emailed.",
          update: "Updated agreement emailed — it replaces the earlier version.",
          reask: "Asked to send it again — their page is open again.",
          approve: "Signed agreement accepted.",
          unapprove: "Acceptance undone.",
        }[action],
      );
      if (ok && action === "reask") {
        setReasking(false);
        setCustom("");
      }
    } catch {
      setResult({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function saveStartDate() {
    if (busy || !startDate) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await adminPost(api, { action: "startDate", date: startDate });
      await handle(res, "Start date saved.");
    } catch {
      setResult({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  async function saveHours() {
    if (busy || hDays.length !== REQUIRED_DAYS) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await adminPost(api, { action: "availability", availability: { startTime: hStart, timeZone: hZone, days: hDays } });
      if (await handle(res, "Work hours and days saved.")) setEditHours(false);
    } catch {
      setResult({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  async function markSigned() {
    if (busy || !files.length) return;
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.set("action", "signed");
      for (const f of files) form.append("files", f);
      const res = await fetch(api, { method: "POST", headers: { "x-csrf-token": csrfToken() }, body: form });
      if (await handle(res, "Signed copy saved — press Accept once you have checked it.")) {
        setMarking(false);
        setFiles([]);
      }
    } catch {
      setResult({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  const btn = "inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50";
  const style = STYLE[status];

  return (
    <section className="mt-5 rounded-2xl border border-navy-100 bg-white p-5" data-agreement-panel={status}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy-500">
            <Icon name="fileCheck" className="h-4 w-4" />
            Final agreement
          </h3>
          <p className="mt-1.5 text-sm text-navy-600">
            The Independent Contractor Agreement, filled with their details, sent to sign and send back.
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.chip}`} data-agreement-status>
          <Icon name={style.icon} className="h-3.5 w-3.5" />
          {AGREEMENT_STATUS_LABEL[status]}
        </span>
      </div>

      {missing.length && status === "not_sent" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900" data-agreement-missing>
          <p className="font-semibold">Cannot be sent yet:</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Work hours and days: the candidate's choice, or set here when they made none */}
      {status === "not_sent" ? (
        <div
          className={`mt-4 rounded-xl border p-3.5 ${hours ? "border-cream-300 bg-white" : "border-2 border-brand-300 bg-brand-50/50"}`}
          data-agreement-hours={hours ? "set" : "missing"}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-navy-500">Work hours and days</p>
              <p className="mt-0.5 text-xs text-navy-500">
                {hours
                  ? candidate.availabilitySetBy
                    ? `Set here by ${candidate.availabilitySetBy}.`
                    : "Chosen by the candidate when they accepted the offer."
                  : "They did not choose their hours and days. Choose them here — they go into the agreement."}
              </p>
              {hours && !editHours ? (
                <p className="mt-1.5 text-sm font-semibold text-navy-900" data-agreement-hours-value>
                  {formatAvailability(hours)} <span className="font-normal text-navy-500">(UK {windowInCompanyTime(hours)})</span>
                </p>
              ) : null}
            </div>
            {hours && !editHours ? (
              <button type="button" onClick={() => setEditHours(true)} className={`${btn} border border-navy-200 bg-white text-navy-700 hover:bg-navy-50`} data-agreement-hours-change>
                Change
              </button>
            ) : null}
          </div>
          {editHours ? (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-navy-600">
                  Starts at (8-hour window)
                  <select value={hStart} onChange={(e) => setHStart(e.target.value)} className="select mt-1 py-2 text-sm" data-agreement-hours-start>
                    {START_TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t} – {endTimeFor(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-navy-600">
                  Their timezone
                  <select value={hZone} onChange={(e) => setHZone(e.target.value)} className="select mt-1 py-2 text-sm" data-agreement-hours-zone>
                    {(zones.includes(hZone) ? zones : [hZone, ...zones]).map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend className="text-xs font-semibold text-navy-600">
                  Days ({hDays.length} of {REQUIRED_DAYS})
                </legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {DAY_KEYS.map((d) => {
                    const on = hDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        data-agreement-hours-day={d}
                        onClick={() => setHDays((x) => (on ? x.filter((k) => k !== d) : x.length < REQUIRED_DAYS ? [...x, d] : x))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          on ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
                        }`}
                        title={DAY_LABELS[d]}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || hDays.length !== REQUIRED_DAYS}
                  onClick={() => void saveHours()}
                  className={`${btn} bg-navy-900 text-white hover:bg-navy-800`}
                  data-agreement-hours-save
                >
                  Save hours and days
                </button>
                {hours ? (
                  <button type="button" onClick={() => setEditHours(false)} className={`${btn} border border-navy-200 bg-white text-navy-700 hover:bg-navy-50`}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Start date: from the offer, or set here when the offer has none */}
      {status === "not_sent" ? (
        <div
          className={`mt-4 rounded-xl border p-3.5 ${currentStart ? "border-cream-300 bg-white" : "border-2 border-brand-300 bg-brand-50/50"}`}
          data-agreement-start
        >
          <label htmlFor={`agreement-start-${candidate.id}`} className="text-xs font-bold uppercase tracking-wide text-navy-500">
            Start date
          </label>
          <p className="mt-0.5 text-xs text-navy-500">
            {currentStart
              ? candidate.agreementStartDate
                ? `Set here${offerStart ? ` (the offer said ${formatAgreementDate(offerStart)})` : " — the offer had none"}.`
                : "From the offer. Change it here if it has moved."
              : "The offer has no start date. Choose one — it goes into the agreement (the offer itself is not changed)."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id={`agreement-start-${candidate.id}`}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"
              data-agreement-start-input
            />
            <button
              type="button"
              disabled={busy || !startDate || startDate === currentStart}
              onClick={() => void saveStartDate()}
              className={`${btn} bg-navy-900 text-white hover:bg-navy-800`}
              data-agreement-start-save
            >
              Save start date
            </button>
          </div>
        </div>
      ) : status === "sent" ? (
        <div className="mt-4 rounded-xl border border-cream-300 bg-white p-3.5" data-agreement-start data-agreement-change>
          <label htmlFor={`agreement-start-${candidate.id}`} className="text-xs font-bold uppercase tracking-wide text-navy-500">
            Start date
          </label>
          <p className="mt-0.5 text-xs text-navy-500">
            In their agreement now: <strong className="text-navy-800">{currentStart ? formatAgreementDate(currentStart) : "—"}</strong>. Not
            signed yet — to change it, choose the new date and send them an updated agreement. It replaces the one they have.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id={`agreement-start-${candidate.id}`}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"
              data-agreement-start-input
            />
            {startDate && startDate !== currentStart ? (
              <a
                href={`${api}?preview=1&start=${encodeURIComponent(startDate)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btn} border border-navy-200 bg-white text-navy-800 hover:bg-navy-50`}
                data-agreement-preview-new
              >
                <Icon name="search" className="h-4 w-4" />
                Preview new agreement
              </a>
            ) : null}
            <button
              type="button"
              disabled={busy || !hasEmail || !startDate || startDate === currentStart}
              onClick={() => setConfirm("update")}
              className={`${btn} bg-navy-900 text-white hover:bg-navy-800`}
              data-agreement-action="update"
            >
              <Icon name="send" className="h-4 w-4" />
              Send updated agreement
            </button>
          </div>
        </div>
      ) : currentStart ? (
        <p className="mt-3 text-xs text-navy-500" data-agreement-start>
          Start date in the agreement: <strong className="text-navy-800">{formatAgreementDate(currentStart)}</strong>
        </p>
      ) : null}

      {candidate.agreementSentAt ? (
        <div className="mt-4 rounded-xl border border-cream-300 bg-cream-100 p-3.5 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            {candidate.agreementReason ? "Asked to send again" : "Sent"} {fmt(candidate.agreementSentAt)}
            {candidate.agreementRef ? ` · ${candidate.agreementRef}` : ""}
            {reminders ? ` · ${reminders} reminder${reminders === 1 ? "" : "s"}` : ""}
          </p>
          {candidate.agreementReason ? <p className="mt-1.5 leading-relaxed text-navy-700">{candidate.agreementReason}</p> : null}
        </div>
      ) : null}

      {/* The signed copy */}
      {latest && (status === "signed" || status === "approved") ? (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4" data-agreement-signed>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Signed copy · {latest.via === "admin" ? `uploaded by ${latest.by ?? "a recruiter"}` : "uploaded by the candidate"} · {fmt(latest.at)}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {signedDocs.map((d, i) => (
              <li key={d.key}>
                <button
                  type="button"
                  onClick={() => onOpenDocument(d)}
                  className={`${btn} border border-navy-200 bg-white text-navy-800 hover:bg-navy-50`}
                  data-agreement-open-signed
                >
                  <Icon name="document" className="h-4 w-4" />
                  {signedDocs.length > 1 ? `File ${i + 1}` : "Open signed copy"}
                  <span className="max-w-[10rem] truncate text-xs font-normal text-navy-400">{d.filename}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-navy-500">
            Check every page is there, and that it is signed and dated where it says “The Contractor”.
            {versions.length > 1 && candidate.agreementRef ? (
              <>
                {" "}It was updated, so check the reference at the foot of each page is{" "}
                <strong className="text-navy-800">{candidate.agreementRef}</strong> — not an earlier version.
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {status === "approved" ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-700" data-agreement-approved>
          <Icon name="checkCircle" className="h-4 w-4" />
          Accepted {fmt(candidate.agreementApprovedAt)}
          {candidate.agreementApprovedBy ? ` by ${candidate.agreementApprovedBy}` : ""}.
        </p>
      ) : null}

      {/* The next step once it is accepted: the onboarding chat. */}
      {status === "approved" ? <OnboardingChatBox candidate={candidate} onChange={onChange} /> : null}

      {/* Ask for it again */}
      {reasking ? (
        <div className="mt-4 rounded-xl border-2 border-brand-200 bg-brand-50/40 p-4" data-agreement-reask-form>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-500">Why does it need to be sent again?</p>
          <div className="mt-2 space-y-1.5">
            {[...AGREEMENT_REASK_REASONS, { value: "custom", label: "Write my own reason" }].map((r) => (
              <label key={r.value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name={`agreement-reask-${candidate.id}`}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-brand-600"
                  data-agreement-reason={r.value}
                />
                <span className="text-navy-700">{r.label}</span>
              </label>
            ))}
          </div>
          {reason === "custom" ? (
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
              maxLength={MAX_AGREEMENT_REASON}
              placeholder="Shown to the candidate exactly as written."
              className="mt-2 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm"
            />
          ) : null}
          {reaskMessage ? (
            <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-navy-600">They will read: &ldquo;{reaskMessage}&rdquo;</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !hasEmail} onClick={() => void act("reask")} className={`${btn} bg-brand-500 text-navy-900 hover:bg-brand-400`} data-agreement-reask-send>
              {busy ? "Sending…" : "Send email"}
            </button>
            <button type="button" disabled={busy} onClick={() => setReasking(false)} className={`${btn} border border-navy-200 bg-white text-navy-700 hover:bg-navy-50`}>
              Cancel
            </button>
          </div>
        </div>
      ) : marking ? (
        <div className="mt-4 rounded-xl border-2 border-navy-200 bg-navy-50/40 p-4" data-agreement-mark-form>
          <p className="text-sm font-semibold text-navy-900">Upload the signed copy they emailed you</p>
          <p className="mt-0.5 text-xs text-navy-500">PDF, JPG or PNG · up to {MAX_SIGNED_FILES} files, 10 MB each</p>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_SIGNED_FILES))}
            className="mt-3 block w-full text-sm text-navy-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-navy-800"
            data-agreement-mark-files
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !files.length} onClick={() => void markSigned()} className={`${btn} bg-navy-900 text-white hover:bg-navy-800`} data-agreement-mark-send>
              {busy ? "Uploading…" : "Upload and mark as signed"}
            </button>
            <button type="button" disabled={busy} onClick={() => setMarking(false)} className={`${btn} border border-navy-200 bg-white text-navy-700 hover:bg-navy-50`}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {canPreview && status === "not_sent" ? (
            <a href={`${api}?preview=1`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-navy-200 bg-white text-navy-800 hover:bg-navy-50`} data-agreement-preview>
              <Icon name="search" className="h-4 w-4" />
              Preview agreement
            </a>
          ) : null}
          {status === "not_sent" ? (
            <button
              type="button"
              disabled={busy || !hasEmail || missing.length > 0}
              onClick={() => setConfirm("send")}
              className={`${btn} bg-navy-900 text-white hover:bg-navy-800`}
              data-agreement-action="send"
            >
              <Icon name="send" className="h-4 w-4" />
              Send final agreement
            </button>
          ) : null}
          {candidate.agreementSentAt ? (
            <a href={`${api}?file=sent`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-navy-200 bg-white text-navy-800 hover:bg-navy-50`} data-agreement-open-sent>
              <Icon name="document" className="h-4 w-4" />
              Agreement sent
            </a>
          ) : null}
          {status === "sent" ? (
            <>
              <button type="button" disabled={busy || !hasEmail} onClick={() => setConfirm("reminder")} className={`${btn} bg-navy-900 text-white hover:bg-navy-800`} data-agreement-action="reminder">
                <Icon name="mail" className="h-4 w-4" />
                Send reminder
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setResult(null);
                  setMarking(true);
                }}
                className={`${btn} border border-navy-200 bg-white text-navy-800 hover:bg-navy-50`}
                data-agreement-action="mark"
              >
                <Icon name="upload" className="h-4 w-4" />
                Mark as signed
              </button>
            </>
          ) : null}
          {status === "signed" ? (
            <button type="button" disabled={busy} onClick={() => void act("approve")} className={`${btn} bg-green-600 text-white hover:bg-green-700`} data-agreement-action="approve">
              <Icon name="check" className="h-4 w-4" />
              Accept
            </button>
          ) : null}
          {status === "signed" || status === "approved" ? (
            <button
              type="button"
              disabled={busy || !hasEmail}
              onClick={() => {
                setResult(null);
                setReasking(true);
              }}
              className={`${btn} border border-red-200 bg-white text-red-700 hover:bg-red-50`}
              data-agreement-action="reask"
            >
              Ask again
            </button>
          ) : null}
          {status === "approved" ? (
            <button type="button" disabled={busy} onClick={() => void act("unapprove")} className={`${btn} border border-navy-200 bg-white text-navy-600 hover:bg-navy-50`} data-agreement-action="unapprove">
              Undo acceptance
            </button>
          ) : null}
        </div>
      )}

      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`mt-3 flex items-center gap-1 text-xs font-medium ${result.ok ? "text-green-700" : "text-amber-700"}`}
          data-agreement-result={result.ok ? "ok" : "error"}
        >
          {result.ok ? <Icon name="checkCircle" className="h-3.5 w-3.5" /> : null}
          {result.text}
        </p>
      ) : null}

      {events.length ? (
        <div className="mt-4 text-xs text-navy-600">
          <p className="font-semibold text-navy-500">Emails</p>
          <ol className="mt-1 space-y-0.5" data-agreement-events>
            {events.map((e, i) => (
              <li key={e.at} className="flex gap-x-2">
                <span className="shrink-0 font-semibold text-navy-400">{i + 1}.</span>
                <span className="min-w-0">
                  {EVENT_LABEL[e.kind]} · {fmt(e.at)}
                  {e.by ? ` by ${e.by}` : ""}
                  {e.kind === "updated" && e.toDate
                    ? ` · start date ${e.fromDate ? formatAgreementDate(e.fromDate) : "—"} → ${formatAgreementDate(e.toDate)}`
                    : ""}
                  {e.ref ? ` · ${e.ref}` : ""}
                  {e.reason ? ` — ${e.reason}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {replaced.length ? (
        <div className="mt-3 text-xs text-navy-600" data-agreement-replaced>
          <p className="font-semibold text-navy-500">Earlier versions (replaced)</p>
          <ul className="mt-1 space-y-1">
            {replaced.map((v) => (
              <li key={v.at}>
                <a
                  href={`${api}?file=version&at=${encodeURIComponent(v.at)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  {v.ref || "Agreement"}
                </a>{" "}
                · sent {fmt(v.at)} · replaced
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {earlier.length ? (
        <div className="mt-3 text-xs text-navy-600">
          <p className="font-semibold text-navy-500">Earlier signed copies</p>
          <ul className="mt-1 space-y-1">
            {earlier.map((s) => (
              <li key={s.at} className="flex flex-wrap items-center gap-x-2">
                <span>{fmt(s.at)}:</span>
                {s.keys.map((k, i) => {
                  const d = docs.find((x) => x.key === k);
                  return d ? (
                    <button key={k} type="button" onClick={() => onOpenDocument(d)} className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
                      {s.keys.length > 1 ? `file ${i + 1}` : d.filename}
                    </button>
                  ) : null;
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        icon="mail"
        title={
          confirm === "reminder"
            ? "Send an agreement reminder?"
            : confirm === "update"
              ? "Send the updated agreement?"
              : "Send the final agreement?"
        }
        confirmLabel={busy ? "Sending…" : "Send email"}
        busy={busy}
        warning={recentEvent ? `An email about this already went out on ${fmt(lastEvent?.at)}.` : undefined}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void act(confirm)}
        body={
          <p>
            An email goes to <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
            {candidate.email ? (
              <>
                {" "}at <span className="font-medium text-navy-800">{candidate.email}</span>
              </>
            ) : null}{" "}
            {confirm === "reminder"
              ? "reminding them to sign and send back their agreement. The same PDF is attached again."
              : confirm === "update"
                ? `with a new version of their agreement: the start date changes from ${currentStart ? formatAgreementDate(currentStart) : "—"} to ${startDate ? formatAgreementDate(startDate) : "—"}. The email tells them the earlier version no longer applies and not to sign it.`
              : "with their Independent Contractor Agreement attached as a PDF, filled with their details, and a personal link to upload it signed."}{" "}
            You get a Telegram message when they upload it.
          </p>
        }
      />
    </section>
  );
}
