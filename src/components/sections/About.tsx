import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/Reveal";
import { Icon, type IconName } from "@/components/Icon";

const valueIcons: IconName[] = [
  "star",
  "users",
  "chat",
  "handshake",
  "trendingUp",
  "shield",
];

const brandFacts: { icon: IconName; label: string }[] = [
  { icon: "globe", label: "International markets" },
  { icon: "chat", label: "Omnichannel support" },
  { icon: "graduation", label: "Paid, ongoing training" },
  { icon: "shield", label: "Trusted & secure" },
];

export function About() {
  const { company } = siteConfig;

  return (
    <section id="about" className="section overflow-hidden bg-white">
      <div className="container-page">
        {/* Brand intro — editorial split */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <span className="pill uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              About Us
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem]">
              A customer-experience company built on{" "}
              <span className="text-gradient">great people</span>
            </h2>
            <div className="mt-6 space-y-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
              <p>{company.description}</p>
              <p>{company.descriptionExtended}</p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: "users", label: "People-first culture" },
                { icon: "world", label: "Global, multilingual teams" },
                { icon: "ladder", label: "Real paths to grow" },
                { icon: "headset", label: "Five support channels" },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon name={item.icon as IconName} className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-navy-800">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Branded visual panel */}
          <Reveal className="relative">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-brand-900 p-8 text-white shadow-card sm:p-10">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_80%_80%_at_70%_0%,black,transparent)]" />
                <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
                <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-brand-600/20 blur-3xl" />
              </div>

              <div className="relative">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white shadow-glow">
                  {company.logoInitials}
                </span>
                <h3 className="mt-6 text-2xl font-bold tracking-tight text-white">{company.name}</h3>
                <p className="mt-2 max-w-sm text-navy-200">{company.tagline}</p>

                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                  {brandFacts.map((fact) => (
                    <div key={fact.label} className="flex items-center gap-2.5">
                      <Icon name={fact.icon} className="h-5 w-5 shrink-0 text-brand-300" />
                      <span className="text-sm text-navy-100">{fact.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating mission card */}
            <div className="absolute -bottom-6 -left-4 hidden max-w-[17rem] rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:block">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <Icon name="sparkles" className="h-5 w-5" />
              </span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand-600">
                Our mission
              </p>
              <p className="mt-1 text-sm leading-relaxed text-navy-700">
                Help brands build stronger customer relationships — powered by
                people who care.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Our Values */}
        <div className="mt-24 lg:mt-28">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              The values behind everything we do
            </h3>
            <p className="mt-3 text-pretty text-navy-600">
              Principles that guide how we treat our customers, our clients, and
              each other.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {company.values.map((value, i) => (
              <Reveal key={value.title} delay={(i % 3) * 80}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-navy-100 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
                  {/* Top accent bar on hover */}
                  <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-brand-500 to-brand-600 transition-transform duration-300 group-hover:scale-x-100" />
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition duration-200 group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-brand-600 group-hover:text-white group-hover:shadow-glow">
                      <Icon name={valueIcons[i % valueIcons.length]} className="h-6 w-6" />
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-navy-100 transition group-hover:text-brand-200">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h4 className="mt-5 text-lg font-semibold text-navy-900">{value.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    {value.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
