"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { prepareImage } from "@/components/verify/prepareImage";
import { IMAGE_MIME, MAX_IMAGE_BYTES } from "@/lib/documents";
import { isValidGstin, normaliseGstin } from "@/lib/pan";
import { fileHasCameraExif } from "@/lib/cameraExif";

/**
 * The PAN card (required, front and back) and GSTIN (optional), on the offer
 * page of people living in India. See lib/pan.
 *
 * Photos of the physical card only: no PDF, so no e-PAN and no scanned page.
 * On a phone the box opens the camera. Whether each picture carries a
 * camera's details is checked here, before it is resized (which drops them),
 * and sent with the upload: a picture without them may be a scan or a
 * screenshot, and is flagged for the recruiter in View info only — the
 * candidate is not told, and never refused, because WhatsApp strips the same
 * details from real photos.
 *
 * Controlled: the form owns the files and the number, because it uploads the
 * card before recording the acceptance — the server will not accept an offer
 * from India without it.
 */

export type Side = "front" | "back";

export interface PanFiles {
  front?: File;
  back?: File;
  /** Per side: did the picture as chosen carry camera details? */
  camera?: Partial<Record<Side, boolean>>;
}

const SIDES: { side: Side; title: string; hint: string }[] = [
  {
    side: "front",
    title: "PAN card — front",
    hint: "The side with your name, photo and PAN. All four corners visible, text readable.",
  },
  {
    side: "back",
    title: "PAN card — back",
    hint: "The other side of the same card. All four corners visible.",
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
  showGstin = true,
}: {
  files: PanFiles;
  onFiles: (f: PanFiles) => void;
  gstin: string;
  onGstin: (v: string) => void;
  disabled?: boolean;
  /** Off on the re-upload page for somebody who already gave one. */
  showGstin?: boolean;
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
    if (file.type === "application/pdf") {
      setErrors((e) => ({
        ...e,
        [side]: "A PDF is not accepted — please take a photo of your physical PAN card.",
      }));
      return;
    }
    if (!(IMAGE_MIME as readonly string[]).includes(file.type)) {
      setErrors((e) => ({ ...e, [side]: "Please choose a photo (JPG or PNG)." }));
      return;
    }
    setPreparing(side);
    // Read before resizing: resizing re-encodes the photo and drops these
    // details, along with the location, which is the point of it.
    const camera = await fileHasCameraExif(file);
    const ready = await prepareImage(file);
    setPreparing(null);
    if (ready.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, [side]: "That file is too large — the limit is 5 MB." }));
      return;
    }
    const old = previews.current[side];
    if (old) URL.revokeObjectURL(old);
    previews.current[side] = URL.createObjectURL(ready);
    onFiles({ ...files, [side]: ready, camera: { ...files.camera, [side]: camera } });
  }

  function remove(side: Side) {
    const old = previews.current[side];
    if (old) URL.revokeObjectURL(old);
    previews.current[side] = undefined;
    onFiles({ ...files, [side]: undefined, camera: { ...files.camera, [side]: undefined } });
  }

  return (
    <div className="card p-6" id="pan-card">
      <h2 className="text-lg font-bold text-navy-900">
        Your PAN card{" "}
        <span className="text-sm font-medium text-red-600">(required)</span>
      </h2>
      <p className="mt-1 text-sm text-navy-500">
        We need your PAN card for your tax details before we can send your final agreement.
        Please take a clear photo of your <strong className="text-navy-800">physical PAN card</strong>,
        front and back.
      </p>
      <p className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
        <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        A scan, a screenshot or an e-PAN is not accepted — only a real photo of the card.
      </p>


      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {SIDES.map(({ side, title, hint }) => {
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
                {title} <span className="text-xs font-medium text-red-600">(required)</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-navy-600">{hint}</p>

              <label className={`group mt-3 block cursor-pointer overflow-hidden rounded-xl ${disabled ? "pointer-events-none opacity-60" : ""}`}>
                <span className="sr-only">{title}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  // On a phone: straight to the back camera, for a photo of the card itself.
                  capture="environment"
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
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-navy-500 transition group-hover:text-brand-700">
                      <Icon name="upload" className="h-7 w-7" />
                      <span className="text-xs font-semibold">
                        {preparing === side ? "Preparing…" : "Take a photo"}
                      </span>
                      <span className="text-[11px] font-medium text-navy-400">Photo of the card · JPG or PNG</span>
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
      {showGstin ? (
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
      ) : null}

      <p className="mt-5 flex items-start gap-2 text-xs text-navy-500">
        <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
        Stored privately and seen only by our recruitment team. We only need the card — never
        your Aadhaar, bank details or any password.
      </p>
    </div>
  );
}
