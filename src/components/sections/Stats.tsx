import { siteConfig } from "@/config/site";

/**
 * Company statistics.
 * ⚠️ The numbers come from siteConfig.stats and are PLACEHOLDERS — review and
 * verify each figure before publishing.
 */
export function Stats() {
  return (
    <section className="relative overflow-hidden bg-navy-900 py-16 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-[-8rem] h-[20rem] w-[20rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-[-8rem] h-[20rem] w-[20rem] rounded-full bg-brand-600/15 blur-3xl" />
      </div>
      <div className="container-page relative">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-300">
          Trusted by international businesses
        </p>
        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 text-center sm:grid-cols-3 lg:grid-cols-5">
          {siteConfig.stats.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd className="bg-gradient-to-b from-white to-brand-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                {stat.value}
              </dd>
              <p className="mt-2 text-sm leading-snug text-navy-300">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
