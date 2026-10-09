"use client";

import { Icon } from "@/components/Icon";

/**
 * Previous and next, as in the approved design: a white circle and an amber
 * one. 44px, so they are a fair touch target on a phone too.
 */
export function CarouselButtons({
  onPrev,
  onNext,
  atStart,
  atEnd,
  controls,
  label,
  tone = "light",
}: {
  onPrev: () => void;
  onNext: () => void;
  atStart: boolean;
  atEnd: boolean;
  /** The id of the track these move. */
  controls: string;
  /** What is being moved through, for the button names: "clients", "reviews". */
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={atStart}
        aria-controls={controls}
        aria-label={`Previous ${label}`}
        className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lift transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${
          tone === "dark"
            ? "bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20"
            : "bg-white text-navy-900 ring-1 ring-inset ring-cream-300 hover:ring-brand-300"
        }`}
      >
        <Icon name="arrowRight" className="h-5 w-5 rotate-180" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        aria-controls={controls}
        aria-label={`Next ${label}`}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-navy-900 shadow-amber transition duration-200 hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        <Icon name="arrowRight" className="h-5 w-5" />
      </button>
    </div>
  );
}
