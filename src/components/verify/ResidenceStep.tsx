"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { ResidenceUpload } from "@/components/verify/ResidenceUpload";

/**
 * The residence step, and what a candidate sees once they have answered it.
 *
 * Two entry points use this and neither owns it: the assessment link, for
 * somebody asked before an offer, and the offer link, for the usual case where
 * the two countries only appeared side by side when they accepted. The
 * acknowledgement has to be the same in both — someone who sends a permit
 * should not get a different answer depending on which email they happened to
 * open.
 *
 * Deliberately vague about what happens next, because it depends: an answer
 * here goes to a person, and telling a candidate their agreement is on its way
 * before anybody has looked would be a promise this page cannot keep.
 */
export function ResidenceStep({
  candidateId,
  firstName,
  country,
  reason,
  alsoOwed,
}: {
  candidateId: string;
  firstName?: string;
  country?: string;
  reason?: string;
  /**
   * What else is outstanding, named in the candidate's terms, when this is not
   * the only thing we are waiting for.
   *
   * A candidate can owe two things at once — new identity photographs and a
   * residence permit — and finishing one of them must not end with "you can
   * close this page". Somebody who does as they are told and is then told
   * they are finished will not come back for the other half, and the
   * application stalls with nobody at fault.
   */
  alsoOwed?: string;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-navy-900 sm:text-3xl">Thank you</h1>
        <p className="mt-4 leading-relaxed text-navy-600">
          {firstName ? `Thanks, ${firstName}. ` : ""}We have what you sent. A member of our team
          will look at it and come back to you about your agreement.
        </p>

        {alsoOwed ? (
          <>
            <p className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              There is one more thing outstanding: {alsoOwed}.
            </p>
            {/* A reload rather than a link, because the page works out which
                step is next from the record — which has just changed. */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary mt-4 justify-center"
            >
              Continue to the next step
            </button>
          </>
        ) : (
          <p className="mt-6 text-sm text-navy-400">You can close this page.</p>
        )}
      </div>
    );
  }

  return (
    <ResidenceUpload
      candidateId={candidateId}
      country={country}
      reason={reason}
      onDone={() => setDone(true)}
    />
  );
}

/** The same step as a page of its own, for the assessment link. */
export function ResidencePage(props: {
  candidateId: string;
  firstName?: string;
  country?: string;
  reason?: string;
  alsoOwed?: string;
}) {
  return (
    <div className="min-h-screen bg-cream-100 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 flex justify-center">
          <Logo className="h-9 w-auto" />
        </div>
        <ResidenceStep {...props} />
      </div>
    </div>
  );
}
