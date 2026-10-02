import type { Metadata } from "next";
import Link from "next/link";
import { readPanReuploadToken, PAN_REUPLOAD_TTL_DAYS } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { PanReuploadForm } from "@/components/offer/PanReuploadForm";

/**
 * Where a candidate who already accepted sends their PAN card again, after a
 * recruiter asked (see lib/pan, "Re-upload"). Opening it records nothing —
 * only sending the photos does.
 *
 * Every wrong way of arriving gets a page that explains itself.
 */

export const metadata: Metadata = {
  title: "Re-upload your PAN card",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PanReuploadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = one((await searchParams).t) ?? "";
  const read = readPanReuploadToken(token);
  if (!read.ok && read.reason === "invalid") {
    return (
      <Shell>
        <Notice
          title="This link is not valid"
          body="Please open the link exactly as it appears in the email we sent you — some mail apps cut long links in half."
        />
      </Shell>
    );
  }

  const link = read.link;
  const candidate = await getCandidate(link.id);
  if (!candidate) {
    return (
      <Shell>
        <Notice title="We could not find your details" body="Please reply to our email and we will sort it out." />
      </Shell>
    );
  }
  if (candidate.panReuploadRequestedAt !== link.sentAt) {
    return (
      <Shell>
        <Notice
          title="A newer link was sent"
          body="This link belongs to an earlier email. Please open the link in the most recent email we sent you."
        />
      </Shell>
    );
  }
  if (candidate.panReuploadedAt && candidate.panReuploadedAt > link.sentAt) {
    return (
      <Shell>
        <Notice
          tone="green"
          title="We've received your PAN card"
          body="Thank you — nothing more is needed. Our team is checking it and preparing your final agreement."
        />
      </Shell>
    );
  }
  if (!read.ok) {
    return (
      <Shell>
        <Notice
          title="This link has expired"
          body={`Re-upload links are usable for ${PAN_REUPLOAD_TTL_DAYS} days. Reply to our email and we will send you a new one.`}
        />
      </Shell>
    );
  }

  const first = candidate.confirmedDetails?.firstName || candidate.firstName || "";
  return (
    <Shell>
      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">Action needed</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">
          {first ? `${first}, please re-upload your PAN card` : "Please re-upload your PAN card"}
        </h1>
      </header>
      {candidate.panReuploadReason ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-900">Why we are asking</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">{candidate.panReuploadReason}</p>
          </div>
        </div>
      ) : null}
      <PanReuploadForm token={token} candidateId={candidate.id} askGstin={!candidate.gstin} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="mb-8 inline-flex flex-col">
          <span className="text-xl font-extrabold tracking-tight text-navy-900">{siteConfig.company.name}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">
            {siteConfig.company.descriptor}
          </span>
        </Link>
        {children}
        <p className="mt-8 text-center text-xs text-navy-400">
          Questions? Write to{" "}
          <a href={`mailto:${siteConfig.contact.recruitmentEmail}`} className="text-brand-700 underline">
            {siteConfig.contact.recruitmentEmail}
          </a>
        </p>
      </div>
    </main>
  );
}

function Notice({ title, body, tone = "navy" }: { title: string; body: string; tone?: "navy" | "green" }) {
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
