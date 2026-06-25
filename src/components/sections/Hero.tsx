import { jobs } from "@/config/jobs";
import { ApplyButton } from "@/components/apply/ApplyButton";
import { Icon } from "@/components/Icon";
import { siteConfig } from "@/config/site";
import Link from "next/link";

export function Hero() {
  const previewRoles = jobs.slice(0, 3);

  return (
    <section
      id="home"
      className="relative overflow-hidden border-b border-navy-100 bg-white"
    >
      {/* Layered background: dotted grid + soft color blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -left-24 top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-[24rem] w-[24rem] rounded-full bg-navy-200/40 blur-3xl" />
        <div className="absolute left-1/3 top-[18rem] h-[18rem] w-[18rem] rounded-full bg-accent-200/30 blur-3xl" />
      </div>

      <div className="container-page relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        {/* Copy */}
        <div className="animate-fade-up text-center lg:text-left">
          <span className="pill">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            We&apos;re hiring · {jobs.length} open roles
          </span>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
            Grow a career in{" "}
            <span className="text-gradient">customer experience</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-navy-600 lg:mx-0">
            Join a people-first team helping international brands deliver
            exceptional support — fully remote, with paid training and real room
            to grow.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <ApplyButton label="Apply Now" className="w-full sm:w-auto sm:px-8" />
            <Link
              href="/#open-positions"
              className="btn-secondary w-full sm:w-auto sm:px-8"
            >
              Browse open roles
            </Link>
          </div>

          {/* Trust strip */}
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-navy-600 lg:justify-start">
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

        {/* Product-style preview panel */}
        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="rounded-3xl border border-navy-100 bg-white/80 p-3 shadow-card backdrop-blur">
            {/* Panel header */}
            <div className="flex items-center justify-between rounded-2xl bg-navy-900 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
                  <Icon name="headset" className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Open positions</p>
                  <p className="text-xs text-navy-300">
                    {siteConfig.company.shortName} careers
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-200">
                Live
              </span>
            </div>

            {/* Role rows */}
            <ul className="mt-3 space-y-2.5">
              {previewRoles.map((job) => (
                <li key={job.slug}>
                  <Link
                    href={`/jobs/${job.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white px-4 py-3.5 transition hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon name="chat" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy-900">
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
              className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-navy-50 px-4 py-3 text-sm font-semibold text-navy-700 transition hover:bg-brand-50 hover:text-brand-700"
            >
              View all {jobs.length} roles
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          {/* Floating rating chip */}
          <div className="absolute -bottom-5 right-2 z-10 hidden animate-float items-center gap-2 rounded-2xl border border-navy-100 bg-white/90 px-4 py-3 shadow-card backdrop-blur [animation-delay:1.5s] sm:flex">
            <span className="flex gap-0.5 text-accent-400" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" className="h-4 w-4" />
              ))}
            </span>
            <p className="text-xs font-semibold text-navy-700">
              Loved by our team
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
