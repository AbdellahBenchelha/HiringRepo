"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { IdentityUpload } from "@/components/verify/IdentityUpload";

/**
 * The identity step as a self-contained page section.
 *
 * For the case where nobody is around to hold the state: the offer page is a
 * server component, and someone returning to their link to finish an upload
 * they abandoned needs a working "done" screen without a form wrapped round it.
 */
export function IdentityStep({
  candidateId,
  firstName,
}: {
  candidateId: string;
  firstName?: string;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="card p-8 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Icon name="checkCircle" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-navy-900">That is everything, thank you</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">
          {firstName ? `Thank you, ${firstName}. ` : ""}Your acceptance and your identity documents
          are both with us. Our recruitment team will review them and send your written agreement
          for signature, along with everything you need for your first day.
        </p>
        <p className="mt-6 text-xs text-navy-400">You can close this page.</p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
        Your acceptance is confirmed. One last step.
      </p>
      <IdentityUpload
        candidateId={candidateId}
        eyebrow="Step 2 of 2"
        heading="Confirm your identity"
        intro="Before we prepare your written agreement, we need to check that you are who you say you are. This takes about a minute."
        submitLabel="Send and finish"
        onDone={() => setDone(true)}
      />
    </>
  );
}
