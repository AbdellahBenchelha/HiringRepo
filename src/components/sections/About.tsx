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

const glanceFacts: { icon: IconName; label: string }[] = [
  { icon: "headset", label: "Five support channels" },
  { icon: "world", label: "Global, multilingual teams" },
  { icon: "graduation", label: "Paid, ongoing training" },
  { icon: "users", label: "People-first culture" },
];

export function About() {
  const { company } = siteConfig;

  return (
    <section id="about" className="section bg-white">
      <div className="container-page">
        {/* Intro — airy editorial split */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-brand-500" />
              <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                About Us
              </span>
            </div>
            <h2 className="mt-6 max-w-xl text-balance text-3xl font-bold leading-[1.12] tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
              A customer-experience company built on great people
            </h2>
            <div className="mt-7 max-w-xl space-y-5 text-pretty text-lg font-light leading-relaxed text-navy-600">
              <p>{company.description}</p>
              <p>{company.descriptionExtended}</p>
            </div>
          </div>

          {/* Light "at a glance" card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-navy-100 bg-navy-50/40 p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-navy-500">
                At a glance
              </p>
              <ul className="mt-5 divide-y divide-navy-100">
                {glanceFacts.map((fact) => (
                  <li
                    key={fact.label}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft ring-1 ring-inset ring-navy-100">
                      <Icon name={fact.icon} className="h-5 w-5" />
                    </span>
                    <span className="text-[0.95rem] font-medium text-navy-800">
                      {fact.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Values — minimal grid */}
        <div className="mt-20 border-t border-navy-100 pt-16 lg:mt-24">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              The values behind everything we do
            </h3>
            <p className="mt-3 text-pretty text-lg font-light text-navy-600">
              Principles that guide how we treat our customers, our clients, and
              each other.
            </p>
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {company.values.map((value, i) => (
              <Reveal key={value.title} delay={(i % 3) * 70}>
                <div className="group max-w-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition duration-200 group-hover:bg-brand-600 group-hover:text-white">
                    <Icon name={valueIcons[i % valueIcons.length]} className="h-6 w-6" />
                  </span>
                  <h4 className="mt-5 text-lg font-semibold text-navy-900">
                    {value.title}
                  </h4>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-navy-600">
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
