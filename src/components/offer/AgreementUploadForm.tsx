"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { uploadDocument } from "@/components/verify/uploadDocument";
import { MAX_SIGNED_FILES } from "@/lib/agreement";
import { MAX_SIGNED_AGREEMENT_BYTES } from "@/lib/documents";

/**
 * Sending back the signed agreement: download it, sign it, upload the signed
 * PDF or photos of every page. See lib/agreement.
 */

const MAX_MB = MAX_SIGNED_AGREEMENT_BYTES / (1024 * 1024);
const OK_TYPES = ["application/pdf", "image/jpeg", "image/png"];

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function typeOf(f: File): string {
  if (f.type) return f.type;
  const ext = f.name.toLowerCase().split(".").pop();
  return ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "";
}

export function AgreementUploadForm({
  token,
  candidateId,
  fullName,
  agreementRef,
}: {
  token: string;
  candidateId: string;
  fullName: string;
  agreementRef: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  /** Files already uploaded, so a second attempt does not send them again. */
  const uploaded = useRef(new Set<File>());

  function add(list: FileList | null) {
    setProblems([]);
    setFileError("");
    const picked = Array.from(list ?? []);
    const next = [...files];
    for (const f of picked) {
      if (!OK_TYPES.includes(typeOf(f))) {
        setFileError(`“${f.name}” is not a PDF, JPG or PNG file.`);
        continue;
      }
      if (f.size > MAX_SIGNED_AGREEMENT_BYTES) {
        setFileError(`“${f.name}” is ${sizeLabel(f.size)}. The limit is ${MAX_MB} MB per file.`);
        continue;
      }
      if (next.length >= MAX_SIGNED_FILES) {
        setFileError(`You can send up to ${MAX_SIGNED_FILES} files.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  }

  async function submit() {
    if (busy) return;
    const found: string[] = [];
    if (!files.length) found.push("Please add your signed agreement (a PDF, or photos of every page).");
    if (!confirmed) found.push("Please tick the box to confirm you have signed the agreement.");
    setProblems(found);
    if (found.length) return;

    setBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (uploaded.current.has(f)) continue;
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const typed = f.type ? f : new File([f], f.name, { type: typeOf(f) });
        const result = await uploadDocument(candidateId, "signedAgreement", typed);
        if (!result.ok) {
          setProblems([`“${f.name}” did not upload: ${result.message}`]);
          return;
        }
        uploaded.current.add(f);
      }
      setProgress("Sending…");
      const res = await fetch("/api/agreement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, confirmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; problems?: string[] };
      if (data.ok) setDone(true);
      else setProblems(data.problems?.length ? data.problems : ["That did not go through. Please try again."]);
    } catch {
      setProblems(["We could not reach the server. Please check your connection and try again."]);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  if (done) {
    return (
      <div className="card-soft p-8 text-center" data-agreement-upload="done">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Icon name="checkCircle" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-navy-900">Thank you — we have your signed agreement</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">
          Our team will check it and confirm the next steps with you shortly. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <div className="form-pro space-y-5">
      {/* Step 1: the agreement */}
      <section className="card-soft p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Step 1</p>
        <h2 className="mt-1 text-[17px] font-bold text-navy-900">Read your agreement</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-navy-600">
          Made out to <strong className="text-navy-900">{fullName}</strong> · reference {agreementRef}. It is also attached to the email we sent you.
        </p>
        <a
          href={`/api/agreement/file?t=${encodeURIComponent(token)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary mt-4 w-full sm:w-auto"
          data-agreement-download
        >
          <Icon name="document" className="h-4 w-4" /> Open the agreement (PDF)
        </a>
      </section>

      {/* Step 2: how to sign */}
      <section className="card-soft p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Step 2</p>
        <h2 className="mt-1 text-[17px] font-bold text-navy-900">Sign it — choose one way</h2>
        <ul className="mt-3 space-y-3">
          <li className="flex gap-3 rounded-xl bg-cream-100 p-4">
            <Icon name="pencil" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span className="text-[14px] leading-relaxed text-navy-700">
              <strong className="text-navy-900">On paper:</strong> print it, sign and date it where it says “The Contractor”, then scan it or take a clear photo of
              every page.
            </span>
          </li>
          <li className="flex gap-3 rounded-xl bg-cream-100 p-4">
            <Icon name="laptop" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span className="text-[14px] leading-relaxed text-navy-700">
              <strong className="text-navy-900">Digitally:</strong> open the PDF in a PDF app (for example Adobe Acrobat Reader, which is free), add your
              signature and the date where it says “The Contractor”, and save it.
            </span>
          </li>
        </ul>
      </section>

      {/* Step 3: upload */}
      <section className="card-soft p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Step 3</p>
        <label htmlFor="agreement-files" className="mt-1 block text-[17px] font-bold text-navy-900">
          Upload the signed agreement
        </label>
        <p className="mt-1 text-[13.5px] text-navy-500">
          The signed PDF, or photos of every page · PDF, JPG or PNG · up to {MAX_SIGNED_FILES} files, {MAX_MB} MB each
        </p>
        <input
          ref={input}
          id="agreement-files"
          type="file"
          multiple
          accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
          data-agreement-file
        />
        {files.length ? (
          <ul className="mt-4 space-y-2" data-agreement-files>
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-green-700 ring-1 ring-green-200">
                  <Icon name="document" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-900">{f.name}</span>
                  <span className="block text-xs text-navy-500">{sizeLabel(f.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  disabled={busy}
                  aria-label={`Remove ${f.name}`}
                  className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm font-semibold text-navy-500 hover:bg-white hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {files.length < MAX_SIGNED_FILES ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-50 ${
              fileError || (problems.length && !files.length) ? "border-red-300 bg-red-50/40" : "border-cream-400 bg-cream-50"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="upload" className="h-6 w-6" />
            </span>
            <span className="text-sm font-bold text-navy-900">{files.length ? "Add another file" : "Choose files"}</span>
            <span className="text-xs text-navy-500">From your phone or computer</span>
          </button>
        ) : null}
        {fileError ? (
          <p role="alert" className="field-error">
            {fileError}
          </p>
        ) : null}
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cream-300 bg-white p-4 sm:p-5">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(e) => {
            setConfirmed(e.target.checked);
            setProblems([]);
          }}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-navy-300 accent-brand-600"
          data-agreement-confirm
        />
        <span className="text-[14.5px] leading-relaxed text-navy-800">
          I have read the agreement, and signed and dated it where it says “The Contractor”.
        </span>
      </label>

      {problems.length ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      ) : null}

      <button type="button" onClick={() => void submit()} disabled={busy} className="btn-primary w-full" data-agreement-submit>
        {busy ? progress || "Sending…" : "Send my signed agreement"}
      </button>
      <p className="text-center text-[13px] leading-relaxed text-navy-500">
        Prefer email? You can also reply to our email with the signed agreement attached.
      </p>
    </div>
  );
}
