import { siteConfig } from "@/config/site";

/**
 * What the roles offer.
 *
 * This replaced a row of invented company statistics — team size, interaction
 * counts, markets served — that were layout placeholders and had reached the
 * live site. Everything shown now is verifiable, and it speaks to what a
 * candidate is actually deciding about.
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
          What working here looks like
        </p>
        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 text-center lg:grid-cols-4">
          {siteConfig.highlights.map((item) => (
            <div key={item.label}>
              <dt className="sr-only">{item.label}</dt>
              <dd className="bg-gradient-to-b from-white to-brand-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                {item.value}
              </dd>
              <p className="mt-2 text-sm leading-snug text-navy-300">{item.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
