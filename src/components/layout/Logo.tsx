/**
 * Brand mark — an original SVG glyph (no external image asset required).
 *
 * The concept is WorkRoute's own: an ascending route that climbs from a
 * starting point to a destination node, drawn as a bare two-tone amber mark
 * so it reads equally well on the cream header and the indigo footer.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
        {/* Lower approach — lighter amber, reads as the path already travelled. */}
        <path
          d="M6 29.5 L14 21.5"
          stroke="#fbcb4d"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Main ascent — the saturated brand amber. */}
        <path
          d="M14 21.5 L20 27.5 L29.5 16"
          stroke="#f5a623"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Destination node, set clear of the path so it reads as a marker. */}
        <circle cx="34.5" cy="9.8" r="3.4" fill="#f5a623" />
      </svg>
    </span>
  );
}
