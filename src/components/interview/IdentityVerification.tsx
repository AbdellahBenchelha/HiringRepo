"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { IdentityUpload } from "@/components/verify/IdentityUpload";

/**
 * The step a candidate reaches after their assessment, where required.
 *
 * Their result is already scored and saved by the time this renders — this
 * never gates the assessment itself, only what happens next. There is no skip
 * control: for a listed country this is required, and offering a way past it
 * would make it optional in practice.
 *
 * A closed browser cannot be prevented, so the assessment link keeps working
 * and returns here. Someone whose phone dies halfway must be able to come back
 * rather than being locked out of their own application.
 *
 * The upload itself lives in IdentityUpload, which the offer flow also uses:
 * the same two photographs are asked for again at the offer from anyone whose
 * country never required them here.
 */
export function IdentityVerification({
  candidateId,
  fullName,
}: {
  candidateId: string;
  fullName?: string;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-navy-900 sm:text-3xl">Verification received</h1>
        <p className="mt-4 leading-relaxed text-navy-600">
          Thank you{fullName ? `, ${fullName.split(" ")[0]}` : ""}. Our team will review your
          documents and be in touch about the next step.
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
        <IdentityUpload
          candidateId={candidateId}
          eyebrow="Assessment submitted"
          heading="One last step"
          intro="Before we can continue with your application, we need to confirm your identity. This takes about a minute."
          onDone={() => setDone(true)}
        />
      </div>
    </div>
  );
}
