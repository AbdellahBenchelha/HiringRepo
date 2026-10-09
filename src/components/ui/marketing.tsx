import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import type { SiteImage } from "@/config/images";

/**
 * The building blocks of the redesigned public pages.
 *
 * Every section on the home page is assembled from these, so a change to how
 * a label, a heading or a button looks is made once. Server components: none
 * of them needs the browser.
 */

type Tone = "light" | "dark";

/** The small rounded label above a heading, with its amber dot. */
export function SectionLabel({ children, tone = "light" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${
        tone === "dark"
          ? "bg-white/[0.06] text-white ring-1 ring-inset ring-white/15"
          : "bg-white text-navy-700 shadow-soft ring-1 ring-inset ring-brand-100"
      }`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      {children}
    </span>
  );
}

/**
 * The amber words in a heading.
 *
 * Darker amber on light backgrounds: the bright brand amber is under 3:1 on
 * cream, which fails even for large text. On navy the bright one is used.
 */
export function Accent({ children, tone = "light" }: { children: ReactNode; tone?: Tone }) {
  return <span className={tone === "dark" ? "text-brand-400" : "text-brand-700"}>{children}</span>;
}

export function SectionHeading({
  label,
  title,
  intro,
  align = "left",
  tone = "light",
  id,
  className = "",
}: {
  label?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  tone?: Tone;
  /** Lets the section say which heading names it (aria-labelledby). */
  id?: string;
  className?: string;
}) {
  const centred = align === "center";
  return (
    <div className={`${centred ? "mx-auto max-w-3xl text-center" : "max-w-2xl"} ${className}`}>
      {label ? <SectionLabel tone={tone}>{label}</SectionLabel> : null}
      <h2
        id={id}
        className={`h-section text-balance ${label ? "mt-4" : ""} ${tone === "dark" ? "!text-white" : ""}`}
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={`lead mt-4 text-pretty ${centred ? "mx-auto max-w-2xl" : ""} ${
            tone === "dark" ? "!text-navy-200" : ""
          }`}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}

/** Amber call to action. The arrow slides a little on hover. */
export function PrimaryButton({
  href,
  children,
  arrow = true,
  className = "",
}: {
  href: string;
  children: ReactNode;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`btn-brand group ${className}`}>
      {children}
      {arrow ? (
        <Icon
          name="arrowRight"
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
        />
      ) : null}
    </Link>
  );
}

/** Outlined companion to the amber button. */
export function SecondaryButton({
  href,
  children,
  tone = "light",
  className = "",
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Link href={href} className={`${tone === "dark" ? "btn-line-light" : "btn-line"} ${className}`}>
      {children}
    </Link>
  );
}

export function IconTile({
  icon,
  className = "h-12 w-12",
  iconClassName = "h-6 w-6",
}: {
  icon: IconName;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span aria-hidden="true" className={`icon-tile ${className}`}>
      <Icon name={icon} className={iconClassName} />
    </span>
  );
}

/**
 * A photo from the approved character sheet.
 *
 * Both sizes are offered and the browser picks by the width it will draw at,
 * so a phone does not fetch the large file and a sharp screen gets it. Below
 * the fold it loads lazily; the hero passes `priority`.
 */
export function ResponsiveImage({
  image,
  sizes,
  priority = false,
  className = "",
}: {
  image: SiteImage;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP with its own srcset
    <img
      src={image.src}
      srcSet={`${image.src} ${image.width}w, ${image.src2x} ${image.width * 2}w`}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Decoration. All of it is aria-hidden and none of it takes clicks.          */
/* -------------------------------------------------------------------------- */

/** A small block of amber dots, as in the corners of the approved design. */
export function DotGrid({
  className = "",
  cols = 5,
  rows = 4,
  tone = "amber",
}: {
  className?: string;
  cols?: number;
  rows?: number;
  tone?: "amber" | "navy" | "white";
}) {
  const colour =
    tone === "amber" ? "rgba(245,166,35,0.55)" : tone === "white" ? "rgba(255,255,255,0.18)" : "rgba(15,16,53,0.12)";
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute block ${className}`}
      style={{
        width: cols * 14,
        height: rows * 14,
        backgroundImage: `radial-gradient(circle, ${colour} 1.6px, transparent 1.8px)`,
        backgroundSize: "14px 14px",
      }}
    />
  );
}

/** A soft warm glow behind a section's content. */
export function Glow({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute block rounded-full bg-[radial-gradient(closest-side,rgba(251,203,77,0.35),rgba(253,224,138,0.12)_55%,transparent)] ${className}`}
    />
  );
}

/** A thin amber arc, drawn across a corner. */
export function Arc({ className = "", opacity = 0.5 }: { className?: string; opacity?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      fill="none"
      className={`pointer-events-none absolute ${className}`}
    >
      <circle cx="200" cy="200" r="198" stroke="#F5A623" strokeOpacity={opacity} strokeWidth="1.5" />
    </svg>
  );
}
