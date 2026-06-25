import type { ReactElement, SVGProps } from "react";

/**
 * Original, abstract logo marks for the placeholder client brands.
 * These are generic geometric shapes (not real trademarks) so the client
 * wall looks like a real logo lockup. Swap for actual <img> logos when
 * you have them.
 */
type MarkProps = SVGProps<SVGSVGElement>;

const marks: ((p: MarkProps) => ReactElement)[] = [
  // 0 — ring
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="4.5" />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
    </svg>
  ),
  // 1 — overlapping circles
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <circle cx="12.5" cy="16" r="8.5" fill="currentColor" opacity="0.5" />
      <circle cx="19.5" cy="16" r="8.5" fill="currentColor" />
    </svg>
  ),
  // 2 — rounded square with notch
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <rect x="5" y="5" width="22" height="22" rx="7.5" fill="currentColor" />
      <circle cx="21.5" cy="21.5" r="4" fill="#fff" />
    </svg>
  ),
  // 3 — triangle ring
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <path d="M16 4 30 28 2 28Z" fill="currentColor" />
      <path d="M16 14.5 22.5 25 9.5 25Z" fill="#fff" />
    </svg>
  ),
  // 4 — hexagon ring
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <path d="M16 3 27 9.5 27 22.5 16 29 5 22.5 5 9.5Z" fill="currentColor" />
      <path d="M16 10.5 21.2 13.5 21.2 19.5 16 22.5 10.8 19.5 10.8 13.5Z" fill="#fff" />
    </svg>
  ),
  // 5 — waves
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <path d="M4 13 q3 -6 6 0 t6 0 t6 0 t6 0" />
        <path d="M4 21 q3 -6 6 0 t6 0 t6 0 t6 0" />
      </g>
    </svg>
  ),
  // 6 — bolt
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <path d="M18 3 7 17.5h6.2l-2.2 11.5 13-16.5h-7Z" fill="currentColor" />
    </svg>
  ),
  // 7 — orbit
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        transform="rotate(-28 16 16)"
      />
      <circle cx="16" cy="16" r="5" fill="currentColor" />
    </svg>
  ),
  // 8 — stacked layers
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <path d="M16 4 28 10.5 16 17 4 10.5Z" fill="currentColor" />
      <path d="M4 15 16 21.5 28 15 28 18.5 16 25 4 18.5Z" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  // 9 — spark
  (p) => (
    <svg viewBox="0 0 32 32" {...p}>
      <path
        d="M16 3C17.2 11 21 14.8 29 16 21 17.2 17.2 21 16 29 14.8 21 11 17.2 3 16 11 14.8 14.8 11 16 3Z"
        fill="currentColor"
      />
    </svg>
  ),
];

const palette = [
  "#0d9488",
  "#4f46e5",
  "#ea580c",
  "#0284c7",
  "#7c3aed",
  "#d97706",
  "#059669",
  "#db2777",
  "#dc2626",
  "#0891b2",
];

export function CompanyLogo({
  name,
  index,
  className = "",
}: {
  name: string;
  index: number;
  className?: string;
}) {
  const Mark = marks[index % marks.length];
  const color = palette[(index * 7) % palette.length];

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Mark
        className="h-9 w-9 shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ color }}
        aria-hidden="true"
      />
      <span className="text-lg font-bold tracking-tight text-navy-900">{name}</span>
    </span>
  );
}
