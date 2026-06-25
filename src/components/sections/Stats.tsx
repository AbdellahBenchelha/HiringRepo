import { siteConfig } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Company statistics — professional bento layout.
 * ⚠️ The numbers come from siteConfig.stats and are PLACEHOLDERS — review and
 * verify each figure before publishing.
 *
 * Icons are matched to the stats by order; the fallback keeps the section
 * working even if a stat is added or reordered in siteConfig.
 */
const statIcons: IconName[] = ["chat", "globe", "users", "world", "graduation"];

export function Stats() {
  const [featured, ...rest] = siteConfig.stats;

  return (
    <section className="section bg-navy-50/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="pill uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            By the numbers
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl">
            Trusted by international businesses
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
            A global team delivering measurable results across markets, languages,
            and channels.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Featured headline stat */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-navy-900 p-8 text-white shadow-card sm:col-span-2 lg:row-span-2">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
              <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-brand-600/20 blur-3xl" />
              <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,black,transparent)]" />
            </div>
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-400/30">
                <Icon name={statIcons[0]} className="h-6 w-6" />
              </span>
            </div>
            <div className="relative mt-10">
              <p className="bg-gradient-to-br from-white to-brand-200 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl">
                {featured.value}
              </p>
              <p className="mt-3 max-w-xs text-base font-medium text-navy-200">
                {featured.label}
              </p>
            </div>
          </div>

          {/* Supporting stats */}
          {rest.map((stat, i) => (
            <div
              key={stat.label}
              className="group flex flex-col justify-between rounded-3xl border border-navy-100 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition duration-200 group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-brand-600 group-hover:text-white group-hover:shadow-glow">
                <Icon name={statIcons[i + 1] ?? "sparkles"} className="h-5 w-5" />
              </span>
              <div className="mt-6">
                <p className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-sm leading-snug text-navy-500">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
