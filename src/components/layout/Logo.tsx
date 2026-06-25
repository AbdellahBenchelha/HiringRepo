/**
 * Brand mark — an original SVG icon (no external image asset required).
 * A navigation "route" for WorkRoute: a path travelling from an origin node
 * to a coral destination marker, set in a teal squircle.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 shadow-soft ring-1 ring-inset ring-white/15 ${className}`}
      aria-hidden="true"
    >
      {/* soft top gloss for depth */}
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
      <svg viewBox="0 0 40 40" fill="none" className="relative h-[60%] w-[60%]">
        {/* route path from origin to destination */}
        <path d="M13 27 C13 19 27 21 27 13" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
        {/* origin node */}
        <circle cx="13" cy="27" r="3" fill="#ffffff" />
        {/* destination marker */}
        <circle cx="27" cy="13" r="3.7" fill="#ff7a52" stroke="#ffffff" strokeWidth="1.4" />
      </svg>
    </span>
  );
}
