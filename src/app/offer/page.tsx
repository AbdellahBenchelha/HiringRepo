import type { Metadata } from "next";
import Link from "next/link";
import { readOfferToken, OFFER_LINK_TTL_DAYS } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { formatRate } from "@/lib/offer";
import { siteConfig } from "@/config/site";
import { Icon } from "@/components/Icon";
import { OfferAcceptForm } from "@/components/offer/OfferAcceptForm";

/**
 * Where a candidate accepts their offer.
 *
 * Reaching this page records nothing. Mail scanners and link previews fetch
 * every URL in an email, so anything that acted on a GET would be triggered by
 * Outlook rather than by a person — offers would show as accepted that nobody
 * had read. Only submitting the form writes anything.
 *
 * Every way of arriving here wrongly gets a page that explains itself. A
 * candidate holding an expired or superseded link is someone we want to hear
 * from, not someone who should meet a blank screen.
 */

export const metadata: Metadata = {
  title: "Your offer",
  robots: { index: false, follow: false },
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function OfferPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = one(params.t);
  const declineFirst = one(params.a) === "decline";

  const read = readOfferToken(token);
  if (!read.ok) {
    return read.reason === "expired" ? (
      <Shell>
        <Notice
          title="This link has expired"
          body={`Offer links stay valid for ${OFFER_LINK_TTL_DAYS} days. Contact our recruitment team and we will send you a fresh one straight away.`}
        />
      </Shell>
    ) : (
      <Shell>
        <Notice
          title="This link is not valid"
          body="Please open the link exactly as it appears in your offer email — some mail apps cut long links in half. If it still does not work, contact our recruitment team."
        />
      </Shell>
    );
  }

  const candidate = await getCandidate(read.link.id);
  if (!candidate || !candidate.offerSentAt || !candidate.offer) {
    return (
      <Shell>
        <Notice
          title="We could not find your offer"
          body="This link does not match an offer on our records. Please contact our recruitment team and we will sort it out."
        />
      </Shell>
    );
  }

  // A re-sent offer changes offerSentAt, so an older email cannot be used to
  // accept terms that have since been replaced.
  if (candidate.offerSentAt !== read.link.offerSentAt) {
    return (
      <Shell>
        <Notice
          title="Your offer has been updated"
          body="This link belongs to an earlier version of your offer. Please use the link in the most recent email we sent you."
        />
      </Shell>
    );
  }

  if (candidate.offerAcceptedAt) {
    return (
      <Shell>
        <Notice
          tone="green"
          title="You have already accepted this offer"
          body="Thank you — we have everything we need. Our recruitment team will be in touch with your written agreement. If you need to change any detail you gave us, just reply to your offer email."
        />
      </Shell>
    );
  }

  if (candidate.offerDeclinedAt) {
    return (
      <Shell>
        <Notice
          title="This offer has been declined"
          body="Our records show this offer was declined. If that was not you, or you have changed your mind, please contact our recruitment team."
        />
      </Shell>
    );
  }

  const offer = candidate.offer;
  const terms: [string, string][] = [
    ["Position", offer.position],
    ["Pay", formatRate(offer)],
    ["Engagement", offer.engagement],
  ];
  if (offer.hoursPerWeek) terms.push(["Hours", `${offer.hoursPerWeek} per week`]);
  if (offer.startDate) {
    terms.push([
      "Start date",
      new Date(`${offer.startDate}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      }),
    ]);
  }
  if (offer.probation) terms.push(["Probation", offer.probation]);

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">Your offer</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">
          Congratulations{candidate.firstName ? `, ${candidate.firstName}` : ""}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-600">
          We are delighted to offer you the position of{" "}
          <strong className="text-navy-900">{offer.position}</strong> at {siteConfig.company.name}.
          Please review the terms below, confirm your details, and accept.
        </p>
      </header>

      {/* The terms in view while they accept, so acceptance means something. */}
      <div className="card mb-6 p-6">
        <h2 className="text-lg font-bold text-navy-900">Terms of the offer</h2>
        <dl className="mt-4 divide-y divide-navy-100">
          {terms.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <dt className="text-sm text-navy-500">{label}</dt>
              <dd className="text-sm font-bold text-navy-900">{value}</dd>
            </div>
          ))}
        </dl>
        {offer.note ? (
          <p className="mt-4 rounded-xl bg-cream-100 p-4 text-sm leading-relaxed text-navy-700">
            {offer.note}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-navy-400">
          This is an offer of engagement, not a contract — your written agreement follows once you
          accept.
        </p>
      </div>

      <OfferAcceptForm
        token={token ?? ""}
        email={candidate.email}
        declineFirst={declineFirst}
        initial={{
          firstName: candidate.firstName ?? "",
          lastName: candidate.lastName ?? "",
          dob: candidate.dob ?? "",
          phone: candidate.phone ?? "",
          country: candidate.country ?? "",
          city: candidate.city ?? "",
          address: candidate.address ?? "",
        }}
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
          <a href={`mailto:${siteConfig.contact.recruitmentEmail}`} className="text-brand-700 underline">
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
          tone === "green" ? "bg-green-100 text-green-700" : "bg-navy-100 text-navy-600"
        }`}
      >
        <Icon name={tone === "green" ? "checkCircle" : "shield"} className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-navy-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">{body}</p>
    </div>
  );
}
