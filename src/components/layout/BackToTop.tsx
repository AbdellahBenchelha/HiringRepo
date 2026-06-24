"use client";

import { Icon } from "@/components/Icon";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="inline-flex items-center gap-1.5 text-navy-300 transition hover:text-white"
    >
      <Icon name="arrowRight" className="h-3.5 w-3.5 -rotate-90" />
      Back to Top
    </button>
  );
}
