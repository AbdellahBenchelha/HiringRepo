import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { jobs } from "@/config/jobs";
import { siteConfig } from "@/config/site";
import { recruitmentProcess } from "@/config/content";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { cvRequiredCountries } from "@/lib/cvStore";
import { manualInviteCountries } from "@/lib/manualInviteStore";
import { Icon, type IconName } from "@/components/Icon";
import { Accent, DotGrid, PEACH_BG, PeachBackdrop, SectionLabel } from "@/components/ui/marketing";

export const metadata = buildMetadata({
  title: "Apply",
  description:
    "Apply to WorkRoute. Complete our application form — a CV is optional and all documents are sent securely to our recruitment team.",
  path: "/apply",
});

/**
 * The hero sits above the form, before anyone has said where they are from, so
 * it cannot know whether this particular visitor needs a CV. Once any country
 * requires one, a flat "A CV is optional" is a promise the form then breaks —
 * so it softens rather than lies.
 */
function trustChips(anyCountryNeedsCv: boolean): { icon: IconName; label: string }[] {
  return [
    {
      icon: "checkCircle",
      label: anyCountryNeedsCv ? "A CV is optional in most countries" : "A CV is optional",
    },
    { icon: "clock", label: "Takes about 5 minutes" },
    { icon: "shield", label: "Secure & confidential" },
  ];
}

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ position?: string }>;
}) {
  const requested = (await searchParams)?.position;
  const initialPosition =
    requested && jobs.some((j) => j.title === requested) ? requested : undefined;
  // Read here rather than fetched by the form, so the rule is already known by
  // the time anyone reaches the documents step.
  const [cvRequired, manualInvite] = await Promise.all([
    cvRequiredCountries(),
    manualInviteCountries(),
  ]);

  return (
    <>
      {/* Header */}
      <header className={`relative isolate overflow-hidden border-b border-[#F6E3C8] ${PEACH_BG}`}>
        <PeachBackdrop />
        <DotGrid className="right-10 top-8 hidden lg:block" cols={5} rows={3} />
        <div className="container-page relative pb-14 pt-8 sm:pb-16 sm:pt-10">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-navy-600 transition hover:text-navy-900"
          >
            <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
            Back to home
          </Link>

          <div className="mt-4 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-2xl">
              <SectionLabel>Apply Now</SectionLabel>
              <h1 className="h-display mt-5 text-balance !text-[clamp(2.25rem,1.5rem+3vw,3.75rem)]">
                Submit your <Accent>application</Accent>
              </h1>
              <p className="mt-5 text-pretty text-[clamp(1rem,0.95rem+0.3vw,1.1875rem)] leading-relaxed text-navy-600">
                Tell us about yourself and your experience. Required fields are marked with an
                asterisk (*).
              </p>
            </div>

            {initialPosition ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-lift ring-1 ring-cream-300/60">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFEBCF] to-[#FFE0B2] text-brand-500"
                >
                  <Icon name="briefcaseLine" className="h-5 w-5" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-xs font-semibold text-navy-500">You&apos;re applying for</span>
                  <span className="mt-0.5 block font-display text-base font-extrabold text-navy-900">
                    {initialPosition}
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          <ul className="mt-8 flex flex-wrap gap-2.5">
            {trustChips(cvRequired.length > 0).map((chip) => (
              <li
                key={chip.label}
                className="inline-flex items-center gap-2.5 rounded-full bg-white/85 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-navy-800 shadow-soft ring-1 ring-cream-300/70"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF1DC] text-brand-500"
                >
                  <Icon name={chip.icon} className="h-4 w-4" />
                </span>
                {chip.label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Body */}
      <section className="bg-cream-100 py-12 sm:py-16 lg:py-20">
        <div className="container-page">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
            {/* Form */}
            <div className="min-w-0">
              <div className="rounded-[2rem] bg-white p-5 shadow-[0_2px_6px_rgba(15,16,53,0.04),0_34px_70px_-34px_rgba(15,16,53,0.26)] ring-1 ring-cream-300/50 sm:p-8 lg:p-10">
                {initialPosition ? (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#FFF5E6] to-[#FFEFD8] px-5 py-3.5 ring-1 ring-inset ring-brand-200/70">
                    <p className="text-sm text-navy-700">
                      You&apos;re applying for{" "}
                      <span className="font-bold text-brand-800">{initialPosition}</span>
                    </p>
                    <Link
                      href="/apply"
                      className="text-sm font-bold text-brand-800 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-600"
                    >
                      Change
                    </Link>
                  </div>
                ) : null}
                <ApplicationForm
                  initialPosition={initialPosition}
                  cvRequiredCountries={cvRequired}
                  manualInviteCountries={manualInvite}
                />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-28">
              {/* What happens next */}
              <div className={SIDE_CARD}>
                <h2 className="font-display text-lg font-extrabold tracking-[-0.015em] text-navy-900">
                  What happens next
                </h2>
                <ol className="mt-5">
                  {recruitmentProcess.slice(0, 4).map((step, i, all) => (
                    <li key={step.title} className="flex gap-3.5">
                      <div className="flex flex-col items-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-extrabold text-navy-900 shadow-amber">
                          {i + 1}
                        </span>
                        {i < all.length - 1 ? (
                          <span aria-hidden="true" className="my-1.5 w-0.5 flex-1 rounded-full bg-brand-200" />
                        ) : null}
                      </div>
                      <div className={i < all.length - 1 ? "pb-5" : ""}>
                        <p className="pt-1 text-sm font-bold text-navy-900">{step.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-navy-500">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Privacy reassurance */}
              <div className="rounded-[1.5rem] bg-gradient-to-br from-[#FFF5E6] to-[#FFEBCF] p-6 ring-1 ring-inset ring-brand-200/60">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-500 shadow-soft"
                  >
                    <Icon name="shieldCheck" className="h-5 w-5" />
                  </span>
                  <p className="font-display text-base font-extrabold text-navy-900">Private &amp; secure</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-navy-700">
                  Your details go directly to our recruitment team. See our{" "}
                  <Link
                    href="/applicant-privacy"
                    className="font-bold text-brand-800 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-600"
                  >
                    applicant privacy notice
                  </Link>
                  .
                </p>
              </div>

              {/* Help */}
              <div className="relative isolate overflow-hidden rounded-[1.5rem] bg-navy-900 p-6">
                <span
                  aria-hidden="true"
                  className="absolute -right-12 -top-14 -z-10 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,rgba(245,166,35,0.3),transparent)]"
                />
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-brand-400 ring-1 ring-inset ring-white/10"
                  >
                    <Icon name="headsetLine" className="h-5 w-5" />
                  </span>
                  <p className="font-display text-base font-extrabold text-white">Need help applying?</p>
                </div>
                <p className="mt-3 text-sm text-navy-200">Email us and our team will be glad to assist.</p>
                <a
                  href={`mailto:${siteConfig.contact.recruitmentEmail}`}
                  className="mt-4 flex min-h-[48px] items-center gap-2.5 rounded-xl bg-white/[0.06] px-4 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/[0.1]"
                >
                  <Icon name="mailLine" className="h-4 w-4 text-brand-400" />
                  <span className="[overflow-wrap:anywhere]">{siteConfig.contact.recruitmentEmail}</span>
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

const SIDE_CARD =
  "rounded-[1.5rem] bg-white p-6 shadow-[0_1px_3px_rgba(15,16,53,0.04),0_22px_50px_-30px_rgba(15,16,53,0.22)] ring-1 ring-cream-300/50";
