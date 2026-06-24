import { siteConfig } from "@/config/site";

/** Brand mark — an SVG monogram so no external image asset is required. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-navy-700 text-sm font-bold text-white shadow-soft ${className}`}
      aria-hidden="true"
    >
      {siteConfig.company.logoInitials}
    </span>
  );
}
