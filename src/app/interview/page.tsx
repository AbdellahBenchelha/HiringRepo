import type { Metadata } from "next";
import Link from "next/link";
import { readInterviewToken } from "@/lib/token";
import { publicQuestions, sections } from "@/config/interviewQuestions";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { InterviewExperience } from "@/components/interview/InterviewExperience";

export const metadata: Metadata = {
  title: "Candidate Assessment",
  robots: { index: false, follow: false },
};

export default async function InterviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  const identity = readInterviewToken(id);

  if (!identity || !id) {
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
      token={id}
      questions={publicQuestions()}
      sections={sections}
    />
  );
}
