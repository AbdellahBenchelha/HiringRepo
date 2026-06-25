/**
 * Brand mark — an original SVG monogram (no external image asset required).
 * A geometric "N" for NexaCare with a warm "care" node, set in a teal squircle.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 shadow-soft ${className}`}
      aria-hidden="true"
    >
      {/* soft top gloss */}
      <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent" />
      <svg viewBox="0 0 40 40" fill="none" className="relative h-3/5 w-3/5">
        <path
          d="M13 28 V12 L27 28 V12"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27" cy="12" r="2.7" fill="#ff7a52" />
      </svg>
    </span>
  );
}
