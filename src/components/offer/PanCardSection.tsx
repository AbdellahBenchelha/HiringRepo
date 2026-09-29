"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { prepareImage } from "@/components/verify/prepareImage";
import { COMPANY_MIME, MAX_IMAGE_BYTES } from "@/lib/documents";
import { isValidGstin, normaliseGstin } from "@/lib/pan";

/**
 * The PAN card (required) and GSTIN (optional), on the offer page of people
 * living in India. See lib/pan.
 *
 * Controlled: the form owns the files and the number, because it uploads the
 * card before recording the acceptance — the server will not accept an offer
 * from India without it.
 */

export interface PanFiles {
  front?: File;
  back?: File;
}

type Side = keyof PanFiles;

const SIDES: { side: Side; title: string; hint: string; optional?: boolean }[] = [
  {
    side: "front",
    title: "PAN card — front (required)",
    hint: "The side with your name, photo and PAN. All four corners visible, text readable.",
  },
  {
    side: "back",
    title: "PAN card — back",
    hint: "Only if your card has one. An e-PAN has no back — skip this.",
    optional: true,
  },
];

/** What the GSTIN box says about what has been typed so far. */
export function gstinProblem(value: string): string {
  const g = normaliseGstin(value);
  if (!g) return "";
  return isValidGstin(g) ? "" : "This doesn't look like a valid GSTIN — please check it, or leave it empty.";
}

export function PanCardSection({
  files,
  onFiles,
  gstin,
  onGstin,
  disabled,
}: {
  files: PanFiles;
  onFiles: (f: PanFiles) => void;
  gstin: string;
  onGstin: (v: string) => void;
  disabled?: boolean;
}) {
  const [gstinTouched, setGstinTouched] = useState(false);
  const gstinError = gstinTouched ? gstinProblem(gstin) : "";
  const [errors, setErrors] = useState<Partial<Record<Side, string>>>({});
  const [preparing, setPreparing] = useState<Side | null>(null);
  const previews = useRef<Partial<Record<Side, string>>>({});

  useEffect(() => {
    const urls = previews.current;
    return () => Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u));
  }, []);

  async function pick(side: Side, file: File | null) {
    setErrors((e) => ({ ...e, [side]: "" }));
    if (!file) return;
    if (!(COMPANY_MIME as readonly string[]).includes(file.type)) {
      setErrors((e) => ({ ...e, [side]: "Please choose a JPG, PNG or PDF file." }));
      return;
    }
    setPreparing(side);
    // Photos are shrunk and stripped of location data; a PDF goes as it is.
    const ready = file.type === "application/pdf" ? file : await prepareImage(file);
    setPreparing(null);
    if (ready.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, [side]: "That file is too large — the limit is 5 MB." }));
      return;
    }
    const old = previews.current[side];
    if (old) URL.revokeObjectURL(old);
    previews.current[side] = ready.type === "application/pdf" ? undefined : URL.createObjectURL(ready);
    onFiles({ ...files, [side]: ready });
  }

  function remove(side: Side) {
    const old = previews.current[side];
    if (old) URL.revokeObjectURL(old);
    previews.current[side] = undefined;
    onFiles({ ...files, [side]: undefined });
  }

  return (
    <div className="card p-6" id="pan-card">
      <h2 className="text-lg font-bold text-navy-900">
        Your PAN card{" "}
        <span className="text-sm font-medium text-red-600">(required)</span>
      </h2>
      <p className="mt-1 text-sm text-navy-500">
        We need your PAN card for your tax details before we can send your final agreement. A
        photo of the card or your e-PAN PDF is fine.
      </p>


      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {SIDES.map(({ side, title, hint, optional }) => {
          const file = files[side];
          const preview = previews.current[side];
          const error = errors[side];
          return (
            <div
              key={side}
              className={`rounded-2xl border-2 p-4 ${
                error
                  ? "border-red-300 bg-red-50/40"
                  : file
                    ? "border-brand-300 bg-brand-50/30"
                    : "border-dashed border-navy-200 bg-white"
              }`}
            >
              <p className="text-sm font-bold text-navy-900">
                {title}{" "}
                {optional ? <span className="text-xs font-medium text-navy-400">(optional)</span> : null}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-navy-600">{hint}</p>

              <label className={`group mt-3 block cursor-pointer overflow-hidden rounded-xl ${disabled ? "pointer-events-none opacity-60" : ""}`}>
                <span className="sr-only">{title}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={disabled}
                  onChange={(e) => {
                    void pick(side, e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
                <span
                  className={`relative flex aspect-[16/10] items-center justify-center rounded-xl transition ${
                    file ? "bg-navy-100" : "border-2 border-dashed border-navy-200 bg-navy-50 group-hover:border-brand-400 group-hover:bg-brand-50/50"
                  }`}
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt={`${title} preview`} className="absolute inset-0 h-full w-full object-contain p-1" />
                  ) : file ? (
                    <span className="flex flex-col items-center gap-1.5 text-navy-600">
                      <Icon name="document" className="h-7 w-7" />
                      <span className="max-w-[12rem] truncate text-xs font-semibold">{file.name}</span>
                    </span>
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-navy-500 transition group-hover:text-brand-700">
                      <Icon name="upload" className="h-7 w-7" />
                      <span className="text-xs font-semibold">
                        {preparing === side ? "Preparing…" : "Choose a photo or PDF"}
                      </span>
                      <span className="text-[11px] font-medium text-navy-400">JPG, PNG or PDF</span>
                    </span>
                  )}
                </span>
              </label>

              <p className="mt-2 flex items-center justify-between gap-2 text-xs">
                {error ? (
                  <span className="font-medium text-red-700">{error}</span>
                ) : file ? (
                  <span className="flex items-center gap-1 font-semibold text-green-700">
                    <Icon name="checkCircle" className="h-3.5 w-3.5" /> Ready
                  </span>
                ) : (
                  <span className="text-navy-400">Not chosen yet</span>
                )}
                {file && !disabled ? (
                  <button type="button" onClick={() => remove(side)} className="font-semibold text-navy-500 underline hover:text-navy-700">
                    Remove
                  </button>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 border-t border-navy-100 pt-5">
        <label htmlFor="gstin" className="block text-sm font-bold text-navy-900">
          GSTIN (Goods and Services Tax Identification Number){" "}
          <span className="font-medium text-navy-400">(optional)</span>
        </label>
        <p className="mt-1 text-sm text-navy-600">
          Already have a GSTIN? Please add it — it helps us send you your final agreement
          faster. If you don&rsquo;t have one, leave this empty.
        </p>
        <input
          id="gstin"
          value={gstin}
          disabled={disabled}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          placeholder="15 characters, e.g. 27ABCDE1234F1Z0"
          onChange={(e) => onGstin(normaliseGstin(e.target.value))}
          onBlur={() => setGstinTouched(true)}
          aria-invalid={!!gstinError}
          aria-describedby="gstin-help"
          className={`mt-3 w-full rounded-xl border-2 px-4 py-3 font-mono text-base tracking-wider text-navy-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-navy-400 focus:outline-none sm:max-w-sm ${
            gstinError ? "border-red-300 focus:border-red-400" : "border-navy-200 focus:border-brand-400"
          }`}
        />
        <p id="gstin-help" className={`mt-1.5 text-xs ${gstinError ? "font-medium text-red-700" : "text-navy-400"}`}>
          {gstinError || (gstin ? `${gstin.length} / 15` : "15 letters and numbers.")}
        </p>
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs text-navy-500">
        <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
        Stored privately and seen only by our recruitment team. We only need the card — never
        your Aadhaar, bank details or any password.
      </p>
    </div>
  );
}
