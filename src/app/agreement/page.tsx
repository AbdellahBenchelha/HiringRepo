import type { Metadata } from "next";
import Link from "next/link";
import { readAgreementToken } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { agreementStatus, contractorName } from "@/lib/agreement";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { AgreementUploadForm } from "@/components/offer/AgreementUploadForm";

/**
 * Where a candidate sends back their signed final agreement, after the email
 * that carried it. See lib/agreement.
 *
 * The link never expires and every link we sent shows the same thing: the
 * page reads where the candidate stands now. Once a signed copy is in, it says
 * so on every visit, until a recruiter asks for it again.
 */

export const metadata: Metadata = {
  title: "Your agreement",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AgreementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = one((await searchParams).t) ?? "";
  const read = readAgreementToken(token);
  if (!read.ok) {
    return (
      <Shell>
        <Notice
          title="This link is not valid"
          body="Please open the link exactly as it appears in the email we sent you — some mail apps cut long links in half."
        />
      </Shell>
    );
  }

  const candidate = await getCandidate(read.link.id);
  if (!candidate || !candidate.agreementSentAt) {
    return (
      <Shell>
        <Notice title="We could not find your agreement" body="Please reply to our email and we will sort it out." />
      </Shell>
    );
  }

  const status = agreementStatus(candidate);
  if (status === "signed" || status === "approved") {
    return (
      <Shell>
        <Notice
          tone="green"
          title={status === "approved" ? "Your signed agreement is confirmed" : "Thank you — we have your signed agreement"}
          body={
            status === "approved"
              ? "Everything is in order. We will be in touch about your start."
              : "Nothing more is needed. Our team will check it and confirm the next steps with you shortly."
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">Final step</p>
        <h1 className="mt-2 font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-navy-900 sm:text-[2rem]">
          Sign your agreement
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-navy-600 sm:text-base">
          Read your Independent Contractor Agreement, sign it, and send it back to us here.
        </p>
      </header>

      {candidate.agreementReason ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4" data-agreement-reason>
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-900">Please send it again</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">{candidate.agreementReason}</p>
          </div>
        </div>
      ) : null}

      <AgreementUploadForm
        token={token}
        candidateId={candidate.id}
        fullName={contractorName(candidate)}
        agreementRef={candidate.agreementRef ?? ""}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="border-b border-cream-300 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex min-h-[44px] items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="flex flex-col">
              <span className="font-display text-lg font-extrabold leading-none tracking-tight text-navy-900">
                {siteConfig.company.name}
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-brand-700">
                {siteConfig.company.descriptor}
              </span>
            </span>
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
        <p className="mt-8 text-center text-xs leading-relaxed text-navy-500">
          Questions? Write to{" "}
          <a href={`mailto:${siteConfig.contact.recruitmentEmail}`} className="font-medium text-brand-700 underline">
            {siteConfig.contact.recruitmentEmail}
          </a>
        </p>
      </div>
    </main>
  );
}

function Notice({ title, body, tone = "navy" }: { title: string; body: string; tone?: "navy" | "green" }) {
  return (
    <div className="card-soft p-8 text-center" data-agreement-notice={tone === "green" ? "done" : "problem"}>
      <span
        className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
          tone === "green" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        <Icon name={tone === "green" ? "checkCircle" : "shield"} className="h-7 w-7" />
      </span>
      <h1 className="mt-4 font-display text-xl font-extrabold text-navy-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">{body}</p>
    </div>
  );
}
