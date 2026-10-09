import { siteConfig } from "@/config/site";
import { images } from "@/config/images";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { Reveal } from "@/components/Reveal";
import {
  Accent,
  Arc,
  DotGrid,
  Glow,
  ResponsiveImage,
  SectionLabel,
} from "@/components/ui/marketing";

/** Each feature gets its own tint, as in the approved design. */
const features: { icon: IconName; label: string; tile: string }[] = [
  { icon: "users", label: "People-first culture", tile: "bg-brand-50 text-brand-500" },
  { icon: "world", label: "Global, multilingual teams", tile: "bg-indigo-50 text-indigo-500" },
  { icon: "chartBar", label: "Real paths to grow", tile: "bg-emerald-50 text-emerald-500" },
  { icon: "headset", label: "Five support channels", tile: "bg-rose-50 text-rose-500" },
];

export function About() {
  const { company } = siteConfig;

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="section-pad relative overflow-hidden bg-gradient-to-b from-[#FBF6EC] to-cream-100"
    >
      <Glow className="-right-40 top-10 h-[36rem] w-[36rem]" />
      <Arc className="-right-64 -top-40 hidden h-[34rem] w-[34rem] lg:block" opacity={0.4} />

      <div className="container-page relative grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
        {/* Copy */}
        <div>
          <SectionLabel>About Us</SectionLabel>
          <h2 id="about-title" className="h-section mt-4 text-balance">
            A customer-experience company built on <Accent>great people</Accent>
          </h2>
          <p className="mt-5 text-pretty font-display text-[clamp(1.0625rem,0.98rem+0.45vw,1.3125rem)] font-semibold leading-snug text-navy-600">
            We help international brands build stronger relationships with their customers — and
            we help our people build rewarding careers.
          </p>
          <div className="mt-5 space-y-4 text-pretty text-[15px] leading-relaxed text-navy-600">
            <p>{company.description}</p>
            <p>{company.descriptionExtended}</p>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((item) => (
              <li key={item.label} className="card-soft card-hover flex items-center gap-3.5 p-3.5">
                <span
                  aria-hidden="true"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.tile}`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-navy-900">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Team photo, with the brand card resting on its lower edge */}
        <Reveal className="relative pb-12 sm:pb-10">
          <DotGrid className="-bottom-2 -right-2 hidden sm:block" cols={8} rows={5} tone="navy" />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] shadow-lift-lg ring-1 ring-white/60 lg:aspect-[1.45]">
            <ResponsiveImage
              image={images.aboutTeam}
              sizes="(min-width: 1024px) 560px, 92vw"
              className="object-center"
            />
          </div>
          <div className="absolute inset-x-4 bottom-0 flex items-center gap-4 rounded-2xl bg-white/95 p-4 shadow-lift-lg ring-1 ring-cream-300/70 backdrop-blur sm:left-auto sm:right-6 sm:max-w-sm sm:p-5 lg:-right-4">
            <span aria-hidden="true" className="icon-tile h-14 w-14 rounded-2xl">
              <Logo className="h-8 w-8" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-extrabold tracking-[-0.02em] text-navy-900">
                {company.name}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-navy-600">
                {company.tagline}
              </span>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
