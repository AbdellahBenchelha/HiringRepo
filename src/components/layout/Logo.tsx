/**
 * Brand mark — an original SVG monogram (no external image asset required).
 * A two-tone geometric "N" for NexaCare: white pillars linked by a single
 * coral "care" stroke, set in a teal squircle.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 shadow-soft ring-1 ring-inset ring-white/15 ${className}`}
      aria-hidden="true"
    >
      {/* soft top gloss for depth */}
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
      <svg viewBox="0 0 40 40" fill="none" className="relative h-[58%] w-[58%]">
        <g strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 28 V12" stroke="#ffffff" />
          <path d="M28 28 V12" stroke="#ffffff" />
          <path d="M12 12 L28 28" stroke="#ff7a52" />
        </g>
      </svg>
    </span>
  );
}
