import Link from "next/link";
import { jobs } from "@/config/jobs";
import { images } from "@/config/images";
import { Icon, type IconName } from "@/components/Icon";
import {
  Accent,
  Arc,
  DotGrid,
  Glow,
  PrimaryButton,
  ResponsiveImage,
  SecondaryButton,
} from "@/components/ui/marketing";

const highlights: { icon: IconName; label: string }[] = [
  { icon: "home", label: "100% remote" },
  { icon: "graduation", label: "Paid training" },
  { icon: "chartBar", label: "Promote from within" },
];

export function Hero() {
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-cream-100"
    >
      <Glow className="-right-40 -top-40 h-[34rem] w-[34rem] sm:h-[44rem] sm:w-[44rem]" />
      <Glow className="-bottom-56 -left-48 h-[28rem] w-[28rem] opacity-60" />

      <div className="container-page relative grid items-center gap-12 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:grid-cols-[1.08fr_1fr] lg:gap-10 lg:pb-24 lg:pt-16 xl:gap-16">
        {/* Copy */}
        <div className="animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-800 sm:text-[13px]">
            We&apos;re hiring · {jobs.length} open roles
          </p>
          <h1 id="hero-title" className="h-display mt-5 text-balance">
            Grow a career in <Accent>customer experience</Accent>
          </h1>
          <p className="lead mt-6 max-w-xl text-pretty">
            Join a people-first team helping international brands deliver exceptional support —
            fully remote, with paid training and real room to grow.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton href="/apply" className="w-full sm:w-auto sm:px-8">
              Apply Now
            </PrimaryButton>
            <SecondaryButton href="/#open-positions" className="w-full sm:w-auto sm:px-8">
              Browse open roles
            </SecondaryButton>
          </div>

          <ul className="mt-10 grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-4">
            {highlights.map((item) => (
              <li
                key={item.label}
                className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100/70 text-brand-600"
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <span className="text-[13px] font-bold leading-tight text-navy-900 sm:text-sm">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Photo, with the cards that float around it */}
        <div className="relative mx-auto w-full max-w-[26rem] animate-fade-in sm:max-w-[28rem] lg:mr-0 lg:max-w-[30rem]">
          {/* The warm shape behind the photo */}
          <span
            aria-hidden="true"
            className="absolute -right-6 -top-8 h-[88%] w-[92%] rounded-[44%_56%_48%_52%/52%_44%_56%_48%] bg-gradient-to-br from-brand-200/70 to-brand-100/40 sm:-right-10"
          />
          <Arc className="-right-24 top-10 hidden h-[26rem] w-[26rem] sm:block" opacity={0.45} />
          <DotGrid className="-bottom-8 -right-4 hidden sm:block" cols={7} rows={5} tone="navy" />

          <div className="relative aspect-[490/543] overflow-hidden rounded-[1.75rem] shadow-lift-lg ring-1 ring-white/60">
            <ResponsiveImage
              image={images.hero}
              priority
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 448px, 88vw"
            />
          </div>

          {/* Real figures only: the number of live roles and the remote promise. */}
          <FloatingCard
            href="/#open-positions"
            icon="users"
            title={String(jobs.length)}
            text="Open roles"
            className="-left-3 top-[10%] sm:-left-16"
          />
          <FloatingCard
            icon="laptop"
            title="100%"
            text="Remote"
            className="-left-24 top-[32%] hidden xl:flex"
          />
          <FloatingCard
            href="/apply"
            icon="megaphone"
            title="We're hiring"
            text="Apply in minutes"
            className="-right-3 bottom-[12%] sm:-right-10 lg:bottom-[22%] xl:-right-16"
            wide
          />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({
  href,
  icon,
  title,
  text,
  className = "",
  wide = false,
}: {
  href?: string;
  icon: IconName;
  title: string;
  text: string;
  className?: string;
  wide?: boolean;
}) {
  const body = (
    <>
      <span aria-hidden="true" className="icon-tile h-10 w-10 sm:h-11 sm:w-11">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span
          className={`block font-display font-extrabold tracking-[-0.02em] text-navy-900 ${
            wide ? "text-[15px] sm:text-base" : "text-lg sm:text-xl"
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-navy-500">{text}</span>
      </span>
      {href ? <Icon name="chevronRight" className="ml-1 h-4 w-4 shrink-0 text-navy-300" /> : null}
    </>
  );
  const base = `absolute z-10 flex items-center gap-3 rounded-2xl bg-white/95 px-3.5 py-3 shadow-lift-lg ring-1 ring-cream-300/70 backdrop-blur ${className}`;
  return href ? (
    <Link
      href={href}
      className={`${base} transition duration-300 hover:-translate-y-1 hover:ring-brand-200`}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
