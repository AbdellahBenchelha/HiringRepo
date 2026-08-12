import { jobs } from "@/config/jobs";
import { ApplyButton } from "@/components/apply/ApplyButton";
import { Icon } from "@/components/Icon";
import { siteConfig } from "@/config/site";
import Link from "next/link";

export function Hero() {
  const previewRoles = jobs.slice(0, 3);

  return (
    <section id="home" className="relative bg-cream-100">
      <div className="container-page py-10 sm:py-14 lg:py-16">
        {/* Split hero card: dark copy panel + live roles panel. */}
        <div className="animate-fade-up overflow-hidden rounded-3xl shadow-card lg:grid lg:grid-cols-2">
          {/* ---- Left: dark panel ---- */}
          <div className="flex flex-col justify-center bg-navy-900 px-6 py-14 text-center sm:px-10 lg:px-14 lg:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-300">
              We&apos;re hiring · {jobs.length} open roles
            </p>

            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
              Grow a career in{" "}
              <span className="text-brand-400">customer experience</span>
            </h1>

            <p className="mx-auto mt-5 max-w-md text-pretty leading-relaxed text-navy-200">
              Join a people-first team helping international brands deliver
              exceptional support — fully remote, with paid training and real
              room to grow.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ApplyButton label="Apply Now" className="w-full sm:w-auto sm:px-8" />
              <Link
                href="/#open-positions"
                className="btn-outline-white w-full sm:w-auto sm:px-8"
              >
                Browse open roles
              </Link>
            </div>
          </div>

          {/* ---- Right: live roles panel ---- */}
          <div className="flex flex-col justify-center bg-white px-6 py-12 sm:px-10 lg:px-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-navy-900">
                  <Icon name="headset" className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-navy-900">Open positions</p>
                  <p className="text-xs text-navy-500">
                    {siteConfig.company.shortName} careers
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                Live
              </span>
            </div>

            <ul className="mt-6 space-y-3">
              {previewRoles.map((job) => (
                <li key={job.slug}>
                  <Link
                    href={`/jobs/${job.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-cream-300 bg-cream-100 px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                        <Icon name="chat" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-navy-900">
                          {job.title}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-navy-500">
                          <Icon name="globe" className="h-3.5 w-3.5" />
                          Remote
                        </span>
                      </span>
                    </span>
                    <Icon
                      name="arrowRight"
                      className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/#open-positions"
              className="btn-secondary mt-6 w-full"
            >
              View all {jobs.length} roles
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ---- Trust strip beneath the card ---- */}
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-navy-600">
          {[
            { icon: "globe", label: "100% remote" },
            { icon: "graduation", label: "Paid training" },
            { icon: "trendingUp", label: "Promote from within" },
          ].map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <Icon
                name={item.icon as "globe"}
                className="h-4 w-4 text-brand-600"
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
