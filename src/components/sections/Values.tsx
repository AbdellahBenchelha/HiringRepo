import { siteConfig } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { Arc, DotGrid, SectionLabel } from "@/components/ui/marketing";

/** In the order of siteConfig.company.values. */
const valueIcons: IconName[] = ["usersGroup", "heartLine", "chatDots", "usersGroup", "chartBar", "shieldCheck"];

/**
 * "The values behind everything we do" — its own section, as in the approved
 * design: the heading on one line on a wide screen, and roomy cards with the
 * number above a large soft-amber icon. Three across on a wide screen, two on
 * a tablet, one on a phone.
 */
export function Values() {
  const { values } = siteConfig.company;

  return (
    <section
      id="values"
      aria-labelledby="values-title"
      className="section-pad relative isolate overflow-hidden bg-gradient-to-br from-cream-50 via-cream-100 to-[#FBF3E6]"
    >
      {/* A large soft peach shape top right, a fine arc through it, dots bottom left */}
      <span
        aria-hidden="true"
        className="absolute -right-40 -top-56 -z-10 h-[38rem] w-[38rem] rounded-full bg-gradient-to-bl from-brand-100 via-[#FFF3DD] to-brand-50/0"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-40 -left-32 -z-10 h-[26rem] w-[26rem] rounded-full bg-gradient-to-tr from-brand-100/50 to-transparent"
      />
      <Arc className="-right-72 -top-80 -z-10 hidden h-[44rem] w-[44rem] md:block" opacity={0.35} />
      <DotGrid className="bottom-8 left-6 hidden md:block" cols={11} rows={4} />

      <div className="container-page relative">
        <div className="max-w-5xl">
          <SectionLabel>Our Values</SectionLabel>
          <h2 id="values-title" className="h-section mt-5 text-balance lg:!text-[3.25rem]">
            The values behind everything we do
          </h2>
          <p className="mt-4 text-pretty text-[clamp(1.0625rem,0.98rem+0.45vw,1.3125rem)] leading-relaxed text-navy-500">
            Principles that guide how we treat our customers, our clients, and each other.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {values.map((value, i) => (
            <li key={value.title}>
              <Reveal delay={(i % 3) * 80} className="h-full">
                <ValueCard
                  number={i + 1}
                  icon={valueIcons[i % valueIcons.length]}
                  title={value.title}
                  description={value.description}
                />
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ValueCard({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <article className="group h-full rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(15,16,53,0.04),0_18px_44px_-24px_rgba(15,16,53,0.16)] ring-1 ring-cream-300/40 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(15,16,53,0.05),0_28px_56px_-26px_rgba(15,16,53,0.24)] sm:p-7">
      <span aria-hidden="true" className="font-display text-base font-extrabold text-brand-600">
        {String(number).padStart(2, "0")}
      </span>
      <div className="mt-4 flex items-start gap-5">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF4E2] to-[#FFEFD6] text-brand-500 shadow-[inset_0_0_0_1px_rgba(245,166,35,0.08)] transition duration-300 group-hover:from-brand-400 group-hover:to-brand-500 group-hover:text-white"
        >
          <Icon name={icon} className="h-10 w-10" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="font-display text-lg font-extrabold leading-snug tracking-[-0.015em] text-navy-900 sm:text-[1.25rem]">
            {title}
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-navy-500 sm:text-base">{description}</p>
        </div>
      </div>
    </article>
  );
}
