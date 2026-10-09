import { benefits, clients, type Benefit } from "@/config/content";
import { siteConfig } from "@/config/site";
import { images } from "@/config/images";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import {
  Accent,
  DotGrid,
  PEACH_BG,
  PeachBackdrop,
  PrimaryButton,
  ResponsiveImage,
  SectionLabel,
} from "@/components/ui/marketing";

/**
 * The six benefits on the home page, in the order of the approved design, each
 * with the icon that design gives it. The full list stays in config/content.
 */
const SHOWN: { title: string; icon: IconName }[] = [
  { title: "Fully Remote Work", icon: "home" },
  { title: "Flexible Schedules", icon: "calendar" },
  { title: "Supportive Management", icon: "usersGroup" },
  { title: "Career Development", icon: "chartBar" },
  { title: "Competitive Compensation", icon: "gift" },
  { title: "Paid Professional Training", icon: "graduation" },
];

/** Company figures, read from the same places the rest of the site reads them. */
function figure(label: string): string {
  return siteConfig.stats.find((s) => s.label === label)?.value ?? "";
}

export function WhyJoinUs() {
  const shown = SHOWN.map((s) => ({ ...s, benefit: benefits.find((b) => b.title === s.title) })).filter(
    (s): s is { title: string; icon: IconName; benefit: Benefit } => !!s.benefit,
  );
  const figures = [
    { value: `${clients.length}+`, label: "International brands" },
    { value: figure("Markets served"), label: "Markets served" },
    { value: figure("Team members"), label: "Team members" },
  ].filter((f) => f.value);

  return (
    <section
      id="why-join-us"
      aria-labelledby="why-title"
      className={`section-pad relative isolate overflow-hidden ${PEACH_BG}`}
    >
      <PeachBackdrop flip />
      <div className="container-page relative">
        <div className="grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-14 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,0.56fr)_minmax(0,1.5fr)] xl:gap-8">
          {/* Copy */}
          <div>
            <SectionLabel>Why Join Us</SectionLabel>
            <h2 id="why-title" className="h-section mt-5 text-balance xl:!text-[2.5rem]">
              Benefits that support your <Accent>career and wellbeing</Accent>
            </h2>
            <p className="mt-5 text-pretty text-[15px] leading-relaxed text-navy-500 sm:text-base">
              We invest in our people with training, growth opportunities, and a supportive, modern
              working environment.
            </p>
            <PrimaryButton href="/#open-positions" className="mt-8 w-full !min-h-[52px] sm:w-auto sm:px-8">
              View open roles
            </PrimaryButton>

            <dl className="mt-10 grid grid-cols-3">
              {figures.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex flex-col-reverse justify-end ${
                    i > 0 ? "border-l border-brand-200 pl-4 sm:pl-6" : "pr-2"
                  } ${i < figures.length - 1 ? "pr-2 sm:pr-4" : ""}`}
                >
                  <dt className="mt-1.5 text-xs text-navy-500 sm:text-sm">{f.label}</dt>
                  <dd className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.03em] text-navy-900 sm:text-[2rem]">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Portrait, with its warm shape and two floating cards */}
          <Reveal className="relative mx-auto w-full max-w-[17rem] py-10 sm:max-w-[18rem] xl:max-w-[15.5rem]">
            <span
              aria-hidden="true"
              className="absolute -inset-x-12 -inset-y-2 rounded-[52%_48%_44%_56%/46%_54%_46%_54%] bg-gradient-to-br from-[#FFD38F] via-[#FFE2B5] to-[#FFF1DC]"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 100 200"
              fill="none"
              className="absolute -right-10 top-1/4 h-1/2 w-10"
            >
              <path d="M10 5c50 40 55 150 0 190" stroke="#F5A623" strokeOpacity="0.6" strokeWidth="2" />
            </svg>
            <DotGrid className="-left-14 bottom-24 hidden sm:block" cols={3} rows={4} />

            <div className="relative aspect-[276/340] overflow-hidden rounded-[1.75rem] shadow-lift-lg">
              <ResponsiveImage image={images.whyJoin} sizes="(min-width: 640px) 288px, 70vw" />
            </div>

            <MiniCard
              icon="usersGroup"
              title="Fully remote"
              text="Work from wherever you're based"
              className="-left-3 top-4 sm:-left-10 lg:-left-14 xl:-left-6"
            />
            <MiniCard
              icon="chartBar"
              title="Internal promotions"
              text="We promote from within"
              className="-right-3 bottom-4 sm:-right-6 lg:-right-10 xl:-right-5"
            />
          </Reveal>

          {/* The six benefits */}
          <ul className="grid gap-4 sm:grid-cols-2 md:col-span-2 lg:grid-cols-3 xl:col-span-1 xl:grid-cols-2 xl:gap-4">
            {shown.map(({ title, icon, benefit }, i) => (
              <li key={title}>
                <Reveal delay={(i % 2) * 70} className="h-full">
                  <FeatureCard icon={icon} title={benefit.title} description={benefit.description} />
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
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
    <article className="group flex h-full gap-3.5 rounded-2xl bg-white p-[1.125rem] shadow-[0_1px_3px_rgba(15,16,53,0.04),0_16px_40px_-24px_rgba(15,16,53,0.18)] ring-1 ring-cream-300/50 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(15,16,53,0.05),0_26px_52px_-26px_rgba(15,16,53,0.26)]">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFF1DC] to-[#FFE8C7] text-brand-500 transition duration-300 group-hover:from-brand-400 group-hover:to-brand-500 group-hover:text-white"
      >
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className="font-display text-base font-extrabold leading-snug tracking-[-0.01em] text-navy-900">
          {title}
        </h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-navy-500">{description}</p>
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
      className={`absolute z-10 flex max-w-[14.5rem] items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-lift-lg ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF1DC] text-brand-500"
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold text-navy-900">{title}</span>
        <span className="mt-0.5 block text-xs text-navy-500">{text}</span>
      </span>
    </div>
  );
}
