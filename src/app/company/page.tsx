import type { Metadata } from "next";
import Link from "next/link";
import { readCompanyToken } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { acceptedAsCompany, hasCompanyDoc } from "@/lib/companyDetails";
import { COMPANY_KINDS } from "@/lib/documents";
import { CompanyDetailsForm } from "@/components/company/CompanyDetailsForm";

/**
 * Where a candidate confirms the company their agreement will be made with.
 *
 * Reaching this page records nothing beyond the fact that it was opened, and
 * even that is reported from the browser rather than the render — mail
 * scanners fetch every link in an email, and only submitting the form writes
 * anything that matters.
 *
 * Every wrong way of arriving gets a page that explains itself. Somebody
 * holding an expired link is a person we want to hear from, not somebody who
 * should meet a blank screen.
 */

export const metadata: Metadata = {
  title: "Confirm your company details",
  robots: { index: false, follow: false },
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = one(params.t);
  const read = readCompanyToken(token);

  if (!read.ok) {
    return (
      <Shell>
        <Notice
          title={read.reason === "expired" ? "This link has expired" : "This link is not valid"}
          body={
            read.reason === "expired"
              ? "Company links are usable for 21 days. Reply to the email we sent you and we will send a new one."
              : "Please use the link exactly as it appears in the email we sent you. If you copied it by hand, a character may have been missed."
          }
        />
      </Shell>
    );
  }

  const candidate = await getCandidate(read.link.id);
  if (!candidate || !acceptedAsCompany(candidate)) {
    return (
      <Shell>
        <Notice
          title="Nothing to confirm here"
          body="Our records show this offer was accepted in your own name rather than through a company, so there are no company details to give us. If that is wrong, reply to your offer email and we will put it right."
        />
      </Shell>
    );
  }

  if (candidate.companyDetails) {
    return (
      <Shell>
        <Notice
          tone="green"
          title="We already have your company details"
          body="Thank you — nothing more is needed. Our team is preparing your agreement in the company's name. If something has changed since, reply to your email and tell us what."
        />
      </Shell>
    );
  }

  const already = COMPANY_KINDS.filter((k) => hasCompanyDoc(candidate.documents, k));
  const first = candidate.firstName || "";

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
          Company details
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">
          {first ? `${first}, tell us about your company` : "Tell us about your company"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-600">
          You are contracting through a company, so the agreement and the invoices are in the
          company&rsquo;s name rather than yours. We need its details confirmed, with the
          paperwork, before the agreement can be drawn up.
        </p>
      </header>

      {/* The one dead end this form can create, answered before they hit it.
          The fields below ask for an EIN and a US state; a company registered
          anywhere else has neither, and a form that cannot be finished with no
          way out is how somebody decides we are not serious. */}
      <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-navy-200 bg-cream-100 p-4 text-sm text-navy-700">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
        <span>
          This form is for a company registered in the United States. If yours is registered
          elsewhere, do not guess at these fields — reply to the email we sent you and we will take
          your details another way.
        </span>
      </p>

      <CompanyDetailsForm
        token={token ?? ""}
        candidateId={candidate.id}
        initial={{
          companyName: candidate.confirmedDetails?.companyName ?? "",
          companyNumber: candidate.confirmedDetails?.companyNumber ?? "",
        }}
        already={already}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="mb-8 inline-flex flex-col">
          <span className="text-xl font-extrabold tracking-tight text-navy-900">
            {siteConfig.company.name}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">
            {siteConfig.company.descriptor}
          </span>
        </Link>
        {children}
        <p className="mt-8 text-center text-xs text-navy-400">
          Questions? Write to{" "}
          <a
            href={`mailto:${siteConfig.contact.recruitmentEmail}`}
            className="text-brand-700 underline"
          >
            {siteConfig.contact.recruitmentEmail}
          </a>
        </p>
      </div>
    </main>
  );
}

function Notice({
  title,
  body,
  tone = "navy",
}: {
  title: string;
  body: string;
  tone?: "navy" | "green";
}) {
  return (
    <div className="card p-8 text-center">
      <span
        className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
          tone === "green" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        <Icon name={tone === "green" ? "checkCircle" : "shield"} className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-navy-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">{body}</p>
    </div>
  );
}
