import { benefits, clients, type Benefit } from "@/config/content";
import { siteConfig } from "@/config/site";
import { images } from "@/config/images";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import {
  Accent,
  DotGrid,
  Glow,
  PrimaryButton,
  ResponsiveImage,
  SecondaryButton,
  SectionLabel,
} from "@/components/ui/marketing";

/**
 * The benefits shown beside the photo, led by the ones the approved design
 * leads with. Every other benefit follows underneath in the same style — none
 * is left out. Three rather than the design's six, because these descriptions
 * are longer than its placeholders and six would squeeze them into tall, thin
 * cards.
 */
const LEAD_BENEFITS = ["Fully Remote Work", "Flexible Schedules", "Competitive Compensation"];

/** Clearer at this size than the icons the content file names. */
const ICON_OVERRIDES: Record<string, IconName> = {
  handshake: "heart",
  ladder: "chartBar",
  sparkles: "laptop",
};

/** Three of the company figures, taken from the same places the rest of the site reads them. */
function figure(label: string): string {
  return siteConfig.stats.find((s) => s.label === label)?.value ?? "";
}

export function WhyJoinUs() {
  const lead = LEAD_BENEFITS.map((t) => benefits.find((b) => b.title === t)).filter(
    (b): b is Benefit => !!b,
  );
  const rest = benefits.filter((b) => !LEAD_BENEFITS.includes(b.title));
  const figures = [
    { value: `${clients.length}+`, label: "International brands" },
    { value: figure("Markets served"), label: "Markets served" },
    { value: figure("Team members"), label: "Team members" },
  ].filter((f) => f.value);

  return (
    <section
      id="why-join-us"
      aria-labelledby="why-title"
      className="section-pad relative overflow-hidden bg-[#F7F5EF]"
    >
      <Glow className="-left-40 top-20 h-[30rem] w-[30rem] opacity-80" />

      <div className="container-page relative">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,0.66fr)_minmax(0,1.12fr)] xl:gap-10">
          {/* Copy */}
          <div>
            <SectionLabel>Why Join Us</SectionLabel>
            <h2 id="why-title" className="h-section mt-4 text-balance xl:!text-[2.5rem]">
              Benefits that support your <Accent>career and wellbeing</Accent>
            </h2>
            <p className="lead mt-4 text-pretty">
              We invest in our people with training, growth opportunities, and a supportive, modern
              working environment.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="/apply" className="w-full sm:w-auto">
                Apply Now
              </PrimaryButton>
              <SecondaryButton href="/#open-positions" className="w-full sm:w-auto">
                View open roles
              </SecondaryButton>
            </div>

            <dl className="mt-9 grid grid-cols-3 divide-x divide-cream-400/70">
              {figures.map((f) => (
                <div key={f.label} className="flex flex-col-reverse justify-end px-3 first:pl-0">
                  <dt className="mt-1 text-xs font-medium text-navy-500 sm:text-[13px]">{f.label}</dt>
                  <dd className="font-display text-[1.625rem] font-extrabold leading-none tracking-[-0.03em] text-navy-900 sm:text-[1.875rem]">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Photo, with two cards that float on it */}
          <Reveal className="relative mx-auto w-full max-w-[19rem] sm:max-w-[20rem]">
            <span
              aria-hidden="true"
              className="absolute -inset-x-8 -inset-y-6 rounded-[46%_54%_42%_58%/50%_42%_58%_50%] bg-gradient-to-br from-brand-100 to-brand-50"
            />
            <DotGrid className="-left-10 bottom-16" cols={4} rows={4} />
            <div className="relative aspect-[276/340] overflow-hidden rounded-[1.75rem] shadow-lift-lg ring-1 ring-white/70">
              <ResponsiveImage image={images.whyJoin} sizes="(min-width: 640px) 320px, 76vw" />
            </div>
            <MiniCard
              icon="globe"
              title="Fully remote"
              text="Work from wherever you're based"
              className="-left-5 top-8 sm:-left-14"
            />
            <MiniCard
              icon="chartBar"
              title="Internal promotions"
              text="We promote from within"
              className="-right-5 bottom-8 sm:-right-10 xl:-right-6"
            />
          </Reveal>

          {/* The lead benefits, beside the photo — on a wide screen only. On
              anything narrower they join the grid below, so no row is left
              with a single card in it. */}
          <BenefitGrid items={lead} className="hidden gap-4 xl:grid xl:grid-cols-1" />
        </div>

        {/* The rest, in the same style */}
        <div className="mt-10 lg:mt-12">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-600">
            <Icon name="checkCircle" className="h-4 w-4 text-brand-600" />
            {benefits.length} reasons to build your career here
          </p>
          <BenefitGrid
            items={rest}
            narrowOnly={lead}
            className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          />
        </div>
      </div>
    </section>
  );
}

function BenefitGrid({
  items,
  narrowOnly = [],
  className,
}: {
  items: Benefit[];
  /** Shown first, and only below the wide layout that puts them beside the photo. */
  narrowOnly?: Benefit[];
  className: string;
}) {
  const all = [...narrowOnly.map((b) => ({ b, narrow: true })), ...items.map((b) => ({ b, narrow: false }))];
  return (
    <ul className={className}>
      {all.map(({ b: benefit, narrow }, i) => (
        <li key={benefit.title} className={narrow ? "xl:hidden" : ""}>
          <Reveal delay={(i % 3) * 60} className="h-full">
            <FeatureCard
              icon={ICON_OVERRIDES[benefit.icon] ?? (benefit.icon as IconName)}
              title={benefit.title}
              description={benefit.description}
            />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <article className="card-soft card-hover group flex h-full gap-4 p-4 sm:p-5">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 transition duration-300 group-hover:bg-brand-500 group-hover:text-white"
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h3 className="h-card !text-base">{title}</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-navy-600">{description}</p>
      </div>
    </article>
  );
}

function MiniCard({
  icon,
  title,
  text,
  className,
}: {
  icon: IconName;
  title: string;
  text: string;
  className: string;
}) {
  return (
    <div
      className={`absolute z-10 flex max-w-[15rem] items-center gap-3 rounded-2xl bg-white/95 px-3.5 py-3 shadow-lift-lg ring-1 ring-cream-300/70 backdrop-blur ${className}`}
    >
      <span aria-hidden="true" className="icon-tile h-10 w-10">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold text-navy-900">{title}</span>
        <span className="mt-0.5 block text-xs text-navy-500">{text}</span>
      </span>
    </div>
  );
}
