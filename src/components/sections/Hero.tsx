import { siteConfig } from "@/config/site";
import { heroTrustIndicators } from "@/config/content";
import { Icon } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";
import Link from "next/link";

export function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-navy-50 via-white to-white"
    >
      {/* Decorative background accents */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-navy-100/60 blur-3xl" />
      </div>

      <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            We are hiring · {siteConfig.company.tagline}
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
            Start Your Career in <span className="text-brand-600">Customer Support</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy-600">
            Join a professional, people-focused team helping international businesses deliver
            exceptional customer experiences. We are looking for motivated, friendly, and
            multilingual candidates who are ready to grow.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ApplyButton label="Apply Now" className="sm:px-8" />
            <Link href="/#open-positions" className="btn-secondary sm:px-8">
              View Open Positions
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-3 sm:max-w-lg">
            {heroTrustIndicators.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-navy-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <Icon name="check" className="h-4 w-4" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative "support team" composition (no external image required) */}
        <div className="relative animate-fade-in lg:justify-self-end">
          <div className="relative mx-auto w-full max-w-md">
            <div
              role="img"
              aria-label="A diverse customer-support team collaborating in a modern office"
              className="rounded-2xl bg-gradient-to-br from-navy-700 to-brand-700 p-6 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Icon name="headset" className="h-6 w-6" />
                  <span className="font-semibold">Support Hub</span>
                </div>
                <span className="rounded-full bg-green-400/20 px-2.5 py-1 text-xs font-medium text-green-200">
                  ● Online
                </span>
              </div>

              <div className="mt-5 flex -space-x-2">
                {["AR", "DM", "SL", "KT", "+"].map((a) => (
                  <span
                    key={a}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-navy-700 bg-white/90 text-xs font-semibold text-navy-700"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl bg-white/95 p-3">
                  <p className="text-xs font-medium text-navy-500">Live chat · resolved</p>
                  <p className="mt-1 text-sm text-navy-800">“Thank you, that solved my issue!” 🙌</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: "CSAT", v: "98%" },
                    { k: "Langs", v: "15+" },
                    { k: "Replies", v: "< 2m" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl bg-white/10 p-3 text-center">
                      <p className="text-lg font-bold text-white">{s.v}</p>
                      <p className="text-[11px] text-white/70">{s.k}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden rounded-xl bg-white p-3 shadow-card ring-1 ring-navy-100 sm:block">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <Icon name="trendingUp" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-navy-500">Career growth</p>
                  <p className="text-sm font-semibold text-navy-900">Promote from within</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
