"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { PanCardSection, gstinProblem, type PanFiles } from "@/components/offer/PanCardSection";
import { uploadDocument } from "@/components/verify/uploadDocument";

/**
 * The PAN card re-upload page's form: front and back (both required, photos
 * of the physical card), and the GSTIN when none is on file yet.
 *
 * Uploads each side first, then tells the server it is done — the server
 * checks both sides arrived since the request before it records anything.
 */
export function PanReuploadForm({
  token,
  candidateId,
  askGstin,
}: {
  token: string;
  candidateId: string;
  askGstin: boolean;
}) {
  const [files, setFiles] = useState<PanFiles>({});
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  /** Sides already uploaded, so a second attempt does not send them again. */
  const uploaded = useRef<Partial<Record<"front" | "back", File>>>({});

  async function submit() {
    if (busy) return;
    const found: string[] = [];
    if (!files.front) found.push("Please add the front of your PAN card.");
    if (!files.back) found.push("Please add the back of your PAN card.");
    const g = askGstin ? gstinProblem(gstin) : "";
    if (g) found.push(g);
    setProblems(found);
    if (found.length) return;

    setBusy(true);
    try {
      // One at a time: two uploads at once on a weak phone signal is how both fail.
      for (const [side, kind] of [
        ["front", "panFront"],
        ["back", "panBack"],
      ] as const) {
        const file = files[side];
        if (!file || uploaded.current[side] === file) continue;
        const camera = files.camera?.[side];
        const result = await uploadDocument(candidateId, kind, file, camera === undefined ? {} : { camera });
        if (!result.ok) {
          setProblems([`Your PAN card did not upload: ${result.message}`]);
          return;
        }
        uploaded.current[side] = file;
      }
      const res = await fetch("/api/pan/reupload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, gstin: askGstin ? gstin : undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; problems?: string[]; error?: string };
      if (data.ok) setDone(true);
      else
        setProblems(
          data.problems?.length
            ? data.problems
            : [
                data.error === "replaced"
                  ? "A newer link was sent to you — please use the one in the most recent email."
                  : "That did not go through. Please try again.",
              ],
        );
    } catch {
      setProblems(["We could not reach the server. Please check your connection and try again."]);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center" data-pan-reupload="done">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Icon name="checkCircle" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-navy-900">Thank you — we&rsquo;ve received your PAN card</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">
          Our team will check it and continue preparing your final agreement. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <>
      <PanCardSection
        files={files}
        onFiles={(f) => {
          setFiles(f);
          // A message about a missing side is stale the moment one is chosen.
          setProblems([]);
        }}
        gstin={gstin}
        onGstin={setGstin}
        disabled={busy}
        showGstin={askGstin}
      />
      {problems.length ? (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send my PAN card"}
      </button>
    </>
  );
}
