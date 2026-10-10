import { siteConfig } from "@/config/site";

/**
 * "Trusted by international businesses" — the five company figures.
 *
 * ⚠️ The numbers come from siteConfig.stats and are marked there as
 * PLACEHOLDERS — review and verify each figure before relying on it.
 *
 * A full-width navy band, edge to edge with no frame around it. Five across
 * with dividers on a wide screen; on a phone two columns, the fifth figure
 * taking the full width so the grid never ends on an orphan.
 */
export function Stats() {
  return (
    <section
      aria-labelledby="stats-title"
      className="relative isolate overflow-hidden bg-navy-900 py-12 sm:py-16"
    >
      {/* Amber light in two corners, and fine arcs through them */}
      <span
        aria-hidden="true"
        className="absolute -left-24 -top-28 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(245,166,35,0.5),rgba(219,139,10,0.16)_60%,transparent)]"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-32 -right-20 -z-10 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(245,166,35,0.45),rgba(219,139,10,0.14)_60%,transparent)]"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="absolute inset-0 -z-10 h-full w-full"
        fill="none"
      >
        <path d="M-40 250C70 130 190 40 340 -20" stroke="#F5A623" strokeOpacity="0.35" />
        <path d="M1160 260C1240 150 1330 70 1480 30" stroke="#F5A623" strokeOpacity="0.35" />
      </svg>

      <div className="container-page">
        <h2
          id="stats-title"
          className="text-center text-xs font-bold uppercase tracking-[0.2em] text-brand-400 sm:text-[13px]"
        >
          Trusted by international businesses
        </h2>

        <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:flex sm:flex-wrap sm:items-start sm:justify-center sm:gap-x-0 lg:flex-nowrap lg:justify-between">
          {siteConfig.stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col-reverse items-center justify-end text-center sm:basis-1/3 sm:px-3 lg:flex-1 lg:basis-0 lg:px-4 ${
                i === siteConfig.stats.length - 1 ? "col-span-2" : ""
              } ${i > 0 ? "lg:border-l lg:border-white/15" : ""}`}
            >
              <dt className="mx-auto mt-2 max-w-[11rem] text-[13px] leading-snug text-navy-200 sm:text-sm">
                {stat.label}
              </dt>
              <dd className="font-display text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-white sm:text-[2.5rem] xl:text-[2.75rem]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
