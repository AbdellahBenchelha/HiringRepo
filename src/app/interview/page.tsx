import type { Metadata } from "next";
import Link from "next/link";
import { readInterviewToken } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { publicQuestions, sections } from "@/config/interviewQuestions";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { InterviewExperience } from "@/components/interview/InterviewExperience";

export const metadata: Metadata = {
  title: "Candidate Assessment",
  robots: { index: false, follow: false },
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function InterviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const candidateId = one(params.c); // short link: /interview?c=<id>
  const tokenParam = one(params.id); // legacy signed-token link

  // Prefer the short candidate-id link (looked up in storage); fall back to the
  // legacy signed token so old links keep working.
  let identity: { id?: string; name: string } | null = null;
  let alreadyCompleted = false;
  if (candidateId) {
    const cand = await getCandidate(candidateId);
    if (cand) {
      identity = { id: cand.id, name: cand.fullName };
      alreadyCompleted = !!cand.interview;
    }
  }
  if (!identity && tokenParam) {
    const fromToken = readInterviewToken(tokenParam);
    if (fromToken) {
      identity = fromToken;
      // If the token carries a candidate id, check whether they've finished.
      if (fromToken.id) {
        const cand = await getCandidate(fromToken.id);
        if (cand?.interview) alreadyCompleted = true;
      }
    }
  }

  // Already submitted — show a confirmation instead of letting them retake it.
  if (identity && alreadyCompleted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-navy-900 sm:text-3xl">
          You have already completed this assessment
        </h1>
        <p className="mt-3 leading-relaxed text-navy-600">
          Thank you, {identity.name.split(/\s+/)[0] || identity.name}. Your interview has already
          been submitted, so it cannot be taken again. Our recruitment team will review your
          answers and contact you about the next steps.
        </p>
        <Link href="/" className="btn-secondary mt-8">
          Go to {siteConfig.company.name}
        </Link>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <Icon name="close" className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-navy-900">This link is invalid or expired</h1>
        <p className="mt-3 leading-relaxed text-navy-600">
          The assessment link could not be verified. Please use the exact link sent to you by our
          recruitment team, or contact them for a new one.
        </p>
        <Link href="/" className="btn-secondary mt-8">
          Go to {siteConfig.company.name}
        </Link>
      </div>
    );
  }

  return (
    <InterviewExperience
      fullName={identity.name}
      candidateId={identity.id}
      token={identity.id ? undefined : tokenParam}
      questions={publicQuestions()}
      sections={sections}
    />
  );
}
