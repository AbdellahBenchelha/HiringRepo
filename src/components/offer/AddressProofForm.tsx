"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { uploadDocument } from "@/components/verify/uploadDocument";
import { ADDRESS_DOC_TYPES, MAX_ADDRESS_LENGTH, type AddressDocType } from "@/lib/addressProof";
import { MAX_IMAGE_BYTES } from "@/lib/documents";

/**
 * The proof-of-address form: the name and address the document must show
 * (the address editable — pre-filled with what we have, required if we have
 * nothing), which kind of document it is, the PDF, and a tick to confirm.
 *
 * Uploads the PDF first, then tells the server it is done — the server checks
 * a PDF arrived since the request before it records anything.
 */

const MAX_MB = MAX_IMAGE_BYTES / (1024 * 1024);

function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf") && (!file.type || file.type === "application/pdf");
}

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function AddressProofForm({
  token,
  candidateId,
  fullName,
  initialAddress,
}: {
  token: string;
  candidateId: string;
  fullName: string;
  initialAddress: string;
}) {
  const ids = useId();
  const [address, setAddress] = useState(initialAddress);
  const [type, setType] = useState<AddressDocType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  /** The file already uploaded, so a second attempt does not send it again. */
  const uploaded = useRef<File | null>(null);

  function choose(f: File | undefined) {
    setProblems([]);
    if (!f) return;
    if (!isPdf(f)) {
      setFile(null);
      setFileError("Please choose a PDF file. Other formats are not accepted.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      setFile(null);
      setFileError(`This file is ${sizeLabel(f.size)}. The limit is ${MAX_MB} MB.`);
      return;
    }
    setFileError("");
    setFile(f);
  }

  async function submit() {
    if (busy) return;
    const found: string[] = [];
    if (!address.trim()) found.push("Please enter your full address.");
    if (!type) found.push("Please choose which document you are submitting.");
    if (!file) found.push("Please upload your document (PDF).");
    if (!confirmed) found.push("Please tick the box to confirm the document.");
    setProblems(found);
    if (found.length || !file) return;

    setBusy(true);
    try {
      if (uploaded.current !== file) {
        // Some phones hand over a PDF with no type; the storage link is signed
        // for application/pdf, so say what it is.
        const pdf = file.type ? file : new File([file], file.name, { type: "application/pdf" });
        const result = await uploadDocument(candidateId, "addressProof", pdf);
        if (!result.ok) {
          setProblems([`Your document did not upload: ${result.message}`]);
          return;
        }
        uploaded.current = file;
      }
      const res = await fetch("/api/address/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, type, address, confirmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; problems?: string[] };
      if (data.ok) setDone(true);
      else setProblems(data.problems?.length ? data.problems : ["That did not go through. Please try again."]);
    } catch {
      setProblems(["We could not reach the server. Please check your connection and try again."]);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card-soft p-8 text-center" data-address-proof="done">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Icon name="checkCircle" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-navy-900">
          Thank you — we&rsquo;ve received your proof of address
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">
          Our team will check it and send you your final agreement as soon as possible. You can close this page.
        </p>
      </div>
    );
  }

  const addressId = `${ids}-address`;
  const fileId = `${ids}-file`;

  return (
    <div className="form-pro space-y-5">
      {/* What the document must show */}
      <section className="card-soft p-5 sm:p-6">
        <p className="text-[15px] font-semibold leading-relaxed text-navy-900">
          The document must include the following name and address (it does not have to be in English):
        </p>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-cream-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-500">Full name</p>
            <p className="mt-1 break-words text-base font-semibold text-navy-900" data-address-name>
              {fullName || "—"}
            </p>
          </div>
          <div>
            <label htmlFor={addressId} className="label">
              Full address
            </label>
            <textarea
              id={addressId}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setProblems([]);
              }}
              maxLength={MAX_ADDRESS_LENGTH}
              rows={3}
              required
              disabled={busy}
              autoComplete="street-address"
              placeholder="Street and number, city, postcode, country"
              className={`textarea !min-h-[5.5rem] ${problems.length && !address.trim() ? "input-invalid" : ""}`}
            />
            <p className="mt-1.5 text-[13px] leading-relaxed text-navy-500">
              If the address on your document is different, change it here so the two match.
            </p>
          </div>
        </div>
      </section>

      {/* Which document */}
      <section className="card-soft p-5 sm:p-6">
        <p id={`${ids}-type-label`} className="text-[15px] font-semibold text-navy-900">
          Which document are you submitting?
        </p>
        <div role="radiogroup" aria-labelledby={`${ids}-type-label`} className="mt-4 space-y-3">
          {ADDRESS_DOC_TYPES.map((t) => {
            const on = type === t.value;
            return (
              <label
                key={t.value}
                className={`flex cursor-pointer items-start gap-3.5 rounded-xl border-[1.5px] p-4 transition ${
                  on ? "border-brand-400 bg-brand-50/60 ring-4 ring-brand-100" : "border-cream-300 bg-white hover:border-brand-200"
                }`}
              >
                <input
                  type="radio"
                  name={`${ids}-type`}
                  value={t.value}
                  checked={on}
                  disabled={busy}
                  onChange={() => {
                    setType(t.value);
                    setProblems([]);
                  }}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                  data-address-type={t.value}
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-snug text-navy-900">{t.label}</span>
                  {t.lines.map((line) => (
                    <span key={line} className="mt-1 block text-[13.5px] leading-relaxed text-navy-600">
                      {line}
                    </span>
                  ))}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* The PDF */}
      <section className="card-soft p-5 sm:p-6">
        <label htmlFor={fileId} className="text-[15px] font-semibold text-navy-900">
          Upload your document
        </label>
        <p className="mt-1 text-[13.5px] text-navy-500">PDF only · one file · up to {MAX_MB} MB</p>
        <input
          ref={input}
          id={fileId}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            choose(e.target.files?.[0]);
            // Choosing the same file again after removing it must still fire.
            e.target.value = "";
          }}
          data-address-file
        />
        {file ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-green-700 ring-1 ring-green-200">
              <Icon name="document" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy-900" data-address-filename>
                {file.name}
              </span>
              <span className="block text-xs text-navy-500">{sizeLabel(file.size)}</span>
            </span>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm font-semibold text-brand-700 hover:bg-white disabled:opacity-50"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-50 ${
              fileError || (problems.length && !file) ? "border-red-300 bg-red-50/40" : "border-cream-400 bg-cream-50"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="upload" className="h-6 w-6" />
            </span>
            <span className="text-sm font-bold text-navy-900">Choose a PDF file</span>
            <span className="text-xs text-navy-500">From your phone or computer</span>
          </button>
        )}
        {fileError ? (
          <p role="alert" className="field-error">
            {fileError}
          </p>
        ) : null}
      </section>

      {/* The confirmation */}
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
          data-address-confirm
        />
        <span className="text-[14.5px] leading-relaxed text-navy-800">
          This document is dated within the last 3 months and shows my name and the address above.
        </span>
      </label>

      {problems.length ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="btn-brand w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Sending…" : "Submit document"}
      </button>
    </div>
  );
}
