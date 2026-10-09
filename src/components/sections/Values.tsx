import { siteConfig } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { DotGrid, Glow, SectionHeading } from "@/components/ui/marketing";

/** In the order of siteConfig.company.values. */
const valueIcons: IconName[] = ["user", "heart", "chat", "users", "chartBar", "shield"];

/**
 * "The values behind everything we do" — its own section now, as in the
 * approved design. Three across on a wide screen, two on a tablet, one on a
 * phone.
 */
export function Values() {
  const { values } = siteConfig.company;

  return (
    <section
      id="values"
      aria-labelledby="values-title"
      className="section-pad relative overflow-hidden bg-gradient-to-b from-cream-100 to-[#FBF6EC]"
    >
      <Glow className="-right-48 -top-32 h-[32rem] w-[32rem]" />
      <DotGrid className="bottom-8 left-6 hidden lg:block" cols={10} rows={4} />

      <div className="container-page relative">
        <SectionHeading
          id="values-title"
          label="Our Values"
          title="The values behind everything we do"
          intro="Principles that guide how we treat our customers, our clients, and each other."
        />

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:grid-cols-3">
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
    <article className="card-soft card-hover group h-full p-5 sm:p-6">
      <span aria-hidden="true" className="font-display text-sm font-extrabold text-brand-600">
        {String(number).padStart(2, "0")}
      </span>
      <div className="mt-3 flex gap-4">
        <span
          aria-hidden="true"
          className="icon-tile h-14 w-14 rounded-2xl transition duration-300 group-hover:bg-brand-500 group-hover:text-white"
        >
          <Icon name={icon} className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h3 className="h-card">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{description}</p>
        </div>
      </div>
    </article>
  );
}
