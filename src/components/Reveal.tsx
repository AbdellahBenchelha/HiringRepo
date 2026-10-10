import type { CSSProperties, ReactNode } from "react";

/**
 * Subtle on-scroll reveal, done in CSS (see `.reveal` in globals.css): the
 * content fades up as it scrolls into view.
 *
 * No script, so nothing waits for JavaScript and nothing is invisible while it
 * loads. Browsers without scroll-driven animations show the content as it is,
 * and prefers-reduced-motion turns the movement off.
 *
 * `delay` (milliseconds, for staggering a row of cards) starts the fade a
 * little later in the scroll rather than later in time.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const style = delay ? ({ "--reveal-shift": `${Math.round(delay / 10)}%` } as CSSProperties) : undefined;
  return (
    <div className={`reveal ${className}`} style={style}>
      {children}
    </div>
  );
}
