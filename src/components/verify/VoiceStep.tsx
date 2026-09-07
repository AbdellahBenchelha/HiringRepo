"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { VoiceRecorder } from "@/components/verify/VoiceRecorder";

/**
 * The voice assessment as a whole page.
 *
 * The step reached on the assessment link once a recruiter has asked for a
 * recording. Separate from the recorder itself because what a finished
 * submission should say belongs to the page around it, not to the thing that
 * captured the audio — the same split as the identity upload.
 */
export function VoiceStep({
  candidateId,
  fullName,
  script,
}: {
  candidateId: string;
  fullName: string;
  script: string;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-navy-900 sm:text-3xl">
          Thank you — we have your recording
        </h1>
        <p className="mt-4 leading-relaxed text-navy-600">
          {fullName ? `Thank you, ${fullName.split(" ")[0]}. ` : ""}Our recruitment team will
          listen to it and be in touch about the next step.
        </p>
        <p className="mt-6 text-sm text-navy-400">You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 flex justify-center">
          <Logo className="h-9 w-auto" />
        </div>
        <VoiceRecorder
          candidateId={candidateId}
          script={script}
          onDone={() => setDone(true)}
        />
      </div>
    </div>
  );
}
