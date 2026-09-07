"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { siteConfig } from "@/config/site";
import { AUDIO_MIME, MAX_AUDIO_BYTES, extensionOf } from "@/lib/documents";

/**
 * The voice assessment, recorded in the browser or attached from the phone.
 *
 * Both, always, and that is the point rather than an indulgence. Recording
 * fails for real people in ways they cannot fix: a link opened inside the
 * Facebook or Instagram app runs in a web view where the microphone is often
 * blocked outright, an accidental "Block" on the permission prompt is buried
 * in settings most people will never find, and older handsets simply have no
 * MediaRecorder. If recording were the only route, every one of those
 * candidates would be stranded on a dead page and we would never learn why
 * they dropped out. So the recorder is the front door and the file picker is
 * always there beside it.
 *
 * Recordings used to arrive on WhatsApp. That got the company's number banned
 * repeatedly — a number strangers message in volume is the pattern the
 * platform acts on — and meant matching a voice note to a name by hand
 * afterwards. Here the file lands on the candidate's own record.
 */

/** Two minutes. The script reads in well under one; this is a stop, not a target. */
const MAX_SECONDS = 120;

/**
 * What this browser can actually produce.
 *
 * Chrome on Android gives WebM/Opus, Safari on iOS gives MP4/AAC, and asking
 * for the wrong one throws rather than falling back. Offering the list and
 * taking the first it admits to is the only approach that works on both
 * without sniffing user agents.
 */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t));
}

/** The file extension for what the recorder produced, so the key is honest. */
function extensionForType(type: string): string {
  if (type.includes("webm")) return ".webm";
  if (type.includes("ogg")) return ".ogg";
  if (type.includes("mp4") || type.includes("aac") || type.includes("m4a")) return ".m4a";
  return ".webm";
}

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Stage = "idle" | "recording" | "ready" | "uploading" | "done";

export function VoiceRecorder({
  candidateId,
  script,
  onDone,
}: {
  candidateId: string;
  /** Shown while they record, so they are not switching back to their email. */
  script: string;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  /** Set when the microphone is unavailable, so the page can say why. */
  const [micProblem, setMicProblem] = useState("");
  const [canRecord, setCanRecord] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preview = useRef<string>("");

  // Recording needs a secure context and a MediaRecorder, and neither is worth
  // discovering by throwing at the moment someone presses the button.
  useEffect(() => {
    setCanRecord(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined" &&
        !!pickMimeType(),
    );
  }, []);

  // A live microphone and an object URL both outlive this component unless
  // they are stopped by hand.
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
      if (preview.current) URL.revokeObjectURL(preview.current);
    };
  }, []);

  function keep(blob: Blob, name: string) {
    if (preview.current) URL.revokeObjectURL(preview.current);
    const made = new File([blob], name, { type: blob.type || "audio/webm" });
    preview.current = URL.createObjectURL(made);
    setFile(made);
    setStage("ready");
  }

  async function start() {
    setError("");
    setMicProblem("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Refused, unavailable, or an in-app browser that will not ask. Never a
      // dead end: the upload below is the same submission by another route.
      setMicProblem(
        "We could not use your microphone. Your browser may have blocked it, or you may be inside an app's built-in browser. You can record with your phone's own voice recorder and attach the file below instead.",
      );
      setCanRecord(false);
      return;
    }

    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      const type = rec.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunks.current, { type });
      if (!blob.size) {
        setError("That recording came out empty. Please try again.");
        setStage("idle");
        return;
      }
      keep(blob, `voice-assessment${extensionForType(type)}`);
    };

    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setStage("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        // Stopping itself at the cap rather than refusing the file afterwards:
        // being told at the end that two minutes of talking was wasted is the
        // worst possible moment to find out.
        if (s + 1 >= MAX_SECONDS) rec.state === "recording" && rec.stop();
        return s + 1;
      });
    }, 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function pickFile(chosen: File | null) {
    setError("");
    if (!chosen) return;
    const okType =
      (AUDIO_MIME as readonly string[]).includes(chosen.type) ||
      chosen.type.startsWith("audio/");
    if (!okType && !extensionOf(chosen.name)) {
      setError("Please choose an audio file — a recording from your phone's voice recorder.");
      return;
    }
    if (chosen.size > MAX_AUDIO_BYTES) {
      setError("That file is too large. Please send a recording of a minute or two.");
      return;
    }
    keep(chosen, chosen.name);
  }

  function again() {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = "";
    setFile(null);
    setSeconds(0);
    setError("");
    setStage("idle");
  }

  async function send() {
    if (!file || stage === "uploading") return;
    setStage("uploading");
    setError("");
    try {
      const res = await fetch("/api/applications/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: candidateId,
          kind: "voice",
          filename: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; key?: string; error?: string };
      if (res.status === 429) {
        const mins = Math.ceil(Number(res.headers.get("Retry-After") ?? 600) / 60);
        setError(`Too many attempts. Please wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`);
        setStage("ready");
        return;
      }
      if (!data.ok || !data.url || !data.key) throw new Error(data.error ?? `http_${res.status}`);

      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`storage_${put.status}`);

      const confirm = await fetch("/api/applications/documents/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: candidateId, kind: "voice", key: data.key, filename: file.name }),
      });
      const result = (await confirm.json()) as { ok?: boolean; status?: string; reason?: string; error?: string };
      if (result.status === "blocked") {
        setError(result.reason ?? "That recording was not accepted. Please try again.");
        setStage("ready");
        return;
      }
      // Anything that is not an accepted document is a failure, and has to be
      // shown as one. Treating "no verdict" as success told a candidate we had
      // their recording when the confirm step had refused it — the worst thing
      // this screen could get wrong, because they walk away and neither side
      // knows anything is missing.
      if (result.status !== "clean") throw new Error(result.error ?? "not_confirmed");

      setStage("done");
      onDone();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[voice] upload failed", err);
      setError("Upload failed. Please check your connection and try again.");
      setStage("ready");
    }
  }

  const busy = stage === "uploading";

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Icon name="headset" className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-green-600">
            Assessment passed
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">Your voice assessment</h1>
          <p className="mt-2 leading-relaxed text-navy-600">
            Read the text below out loud, slowly and naturally. We use it to hear your
            pronunciation and clarity. It takes about a minute.
          </p>
        </div>
      </div>

      {/* On the page, not only in the email. Reading a script from an inbox you
          have to switch away from to press record is how people lose their
          place and record it three times. */}
      <blockquote className="mt-6 rounded-2xl border border-navy-200 bg-cream-100 p-5 text-[15px] italic leading-relaxed text-navy-800">
        {script}
      </blockquote>

      <div className="mt-6 rounded-2xl border-2 border-navy-200 bg-white p-5">
        {stage === "recording" ? (
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-bold text-red-600">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
              Recording — {mmss(seconds)}
            </p>
            <p className="mt-1 text-xs text-navy-500">Stops on its own at {mmss(MAX_SECONDS)}.</p>
            <button type="button" onClick={stop} className="btn-primary mt-4 !py-3 w-full sm:w-auto sm:px-10">
              Stop recording
            </button>
          </div>
        ) : file ? (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <Icon name="checkCircle" className="h-4 w-4 shrink-0" />
              Ready to send{seconds ? ` — ${mmss(seconds)}` : ""}
            </p>
            {/* Listen before sending. WhatsApp only lets you hear it after it
                has gone, which is why so many arrive unusable. */}
            <audio src={preview.current} controls className="mt-3 w-full" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={send}
                disabled={busy}
                className="btn-primary !py-3 flex-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send my recording"}
              </button>
              <button
                type="button"
                onClick={again}
                disabled={busy}
                className="btn-secondary !py-3 disabled:opacity-50"
              >
                Record again
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {canRecord ? (
              <>
                <button
                  type="button"
                  onClick={start}
                  className="btn-primary !py-3 w-full sm:w-auto sm:px-10"
                >
                  <Icon name="phone" className="mr-2 inline h-4 w-4" />
                  Start recording
                </button>
                <p className="mt-2 text-xs text-navy-500">
                  Your browser will ask permission to use the microphone.
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-navy-600">
                Record with your phone&rsquo;s own voice recorder, then attach the file below.
              </p>
            )}
          </div>
        )}
      </div>

      {micProblem ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
          {micProblem}
        </p>
      ) : null}

      {/* Always offered, never hidden behind a failure. Someone who would
          rather record in their own time with their own app is not an edge
          case to be talked out of. */}
      {stage !== "recording" && stage !== "done" ? (
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-navy-300 bg-navy-50 px-4 py-3 text-sm font-semibold text-navy-700 transition hover:border-brand-400 hover:bg-brand-50/40">
          <Icon name="upload" className="h-4 w-4 shrink-0" />
          {file ? "Choose a different file" : "Or upload a recording from your phone"}
          <input
            type="file"
            accept="audio/*"
            disabled={busy}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      ) : null}

      {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}

      <ul className="mt-6 space-y-2 border-t border-navy-100 pt-5">
        {[
          "Somewhere quiet, with no music or television behind you",
          "Read at your normal speaking pace — this is not a speed test",
          `Heard only by the ${siteConfig.company.name} recruitment team, and never shared onward`,
        ].map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-xs leading-relaxed text-navy-600">
            <Icon name="checkCircle" className="mt-px h-3.5 w-3.5 shrink-0 text-brand-600" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
