import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { jobs } from "@/config/jobs";
import { siteConfig } from "@/config/site";
import { recruitmentProcess } from "@/config/content";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { Icon, type IconName } from "@/components/Icon";

export const metadata = buildMetadata({
  title: "Apply",
  description:
    "Apply to WorkRoute. Complete our application form — a CV is optional and all documents are sent securely to our recruitment team.",
  path: "/apply",
});

const trustChips: { icon: IconName; label: string }[] = [
  { icon: "checkCircle", label: "A CV is optional" },
  { icon: "clock", label: "Takes about 5 minutes" },
  { icon: "shield", label: "Secure & confidential" },
];

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ position?: string }>;
}) {
  const requested = (await searchParams)?.position;
  const initialPosition =
    requested && jobs.some((j) => j.title === requested) ? requested : undefined;

  return (
    <>
      {/* Hero header */}
      <header className="relative overflow-hidden border-b border-navy-100 bg-gradient-to-b from-navy-50 to-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_80%_at_30%_0%,black,transparent)]" />
          <div className="absolute -left-20 top-[-6rem] h-72 w-72 rounded-full bg-brand-200/30 blur-3xl" />
        </div>
        <div className="container-page relative py-12 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 transition hover:text-brand-700"
          >
            <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
            Back to home
          </Link>

          <div className="mt-6 max-w-2xl">
            <span className="pill uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Apply Now
            </span>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
              Submit your application
            </h1>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-navy-600">
              Tell us about yourself and your experience. Required fields are
              marked with an asterisk (*).
            </p>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
            {trustChips.map((chip) => (
              <li
                key={chip.label}
                className="inline-flex items-center gap-2 text-sm font-medium text-navy-700"
              >
                <Icon name={chip.icon} className="h-4 w-4 text-brand-600" />
                {chip.label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Body */}
      <section className="section bg-navy-50/60">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-soft sm:p-8 lg:p-10">
                {initialPosition ? (
                  <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-5 py-4">
                    <p className="text-sm text-navy-700">
                      You&apos;re applying for{" "}
                      <span className="font-semibold text-brand-700">{initialPosition}</span>
                    </p>
                    <Link
                      href="/apply"
                      className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                    >
                      Change
                    </Link>
                  </div>
                ) : null}
                <ApplicationForm initialPosition={initialPosition} />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="space-y-6 lg:sticky lg:top-28">
                {/* What happens next */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-soft">
                  <h2 className="text-base font-semibold text-navy-900">What happens next</h2>
                  <ol className="mt-5 space-y-5">
                    {recruitmentProcess.slice(0, 4).map((step, i) => (
                      <li key={step.title} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-xs font-bold text-white shadow-glow">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-navy-900">{step.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-navy-500">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Privacy reassurance */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name="shield" className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-base font-semibold text-navy-900">Private &amp; secure</p>
                  <p className="mt-1 text-sm leading-relaxed text-navy-600">
                    Your details go directly to our recruitment team. See our{" "}
                    <Link
                      href="/applicant-privacy"
                      className="font-medium text-brand-700 underline-offset-2 hover:underline"
                    >
                      applicant privacy notice
                    </Link>
                    .
                  </p>
                </div>

                {/* Help */}
                <div className="rounded-2xl border border-navy-100 bg-navy-50/60 p-6">
                  <p className="text-sm font-semibold text-navy-900">Need help applying?</p>
                  <p className="mt-1 text-sm text-navy-600">
                    Email us and our team will be glad to assist.
                  </p>
                  <a
                    href={`mailto:${siteConfig.contact.recruitmentEmail}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    <Icon name="mail" className="h-4 w-4" />
                    {siteConfig.contact.recruitmentEmail}
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
