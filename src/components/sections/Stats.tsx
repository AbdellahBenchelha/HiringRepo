import { siteConfig } from "@/config/site";

/**
 * Company statistics.
 * ⚠️ The numbers come from siteConfig.stats and are PLACEHOLDERS — review and
 * verify each figure before publishing.
 */
export function Stats() {
  return (
    <section className="bg-brand-700 py-14 text-white">
      <div className="container-page">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-brand-100">
          Trusted by international businesses
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-8 text-center sm:grid-cols-3 lg:grid-cols-5">
          {siteConfig.stats.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-3xl font-bold sm:text-4xl">{stat.value}</dd>
              <p className="mt-1 text-sm text-brand-100">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
