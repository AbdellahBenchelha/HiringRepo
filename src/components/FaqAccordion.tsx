"use client";

import { useRef, useState } from "react";
import type { FaqItem } from "@/config/content";
import { Icon } from "@/components/Icon";

/**
 * The FAQ accordion.
 *
 * Each question is a real button with aria-expanded and aria-controls, and
 * its answer a labelled region. Up and Down move between questions, Home and
 * End jump to the first and last — the keyboard pattern an accordion is
 * expected to have. The answer opens by animating its row height, which the
 * reduced-motion rule in globals.css turns off for anyone who asks.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const last = items.length - 1;
    const target =
      e.key === "ArrowDown"
        ? (i + 1) % items.length
        : e.key === "ArrowUp"
          ? (i - 1 + items.length) % items.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (target === null) return;
    e.preventDefault();
    buttons.current[target]?.focus();
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;
        return (
          <div
            key={i}
            className={`overflow-hidden rounded-2xl transition duration-300 ${
              isOpen
                ? "bg-gradient-to-br from-brand-50 to-white shadow-lift ring-1 ring-brand-200"
                : "bg-white shadow-soft ring-1 ring-cream-300/80 hover:ring-brand-200"
            }`}
          >
            <h3>
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="flex min-h-[56px] w-full items-center gap-3.5 px-4 py-3.5 text-left sm:px-5"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-300 ${
                    isOpen ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500"
                  }`}
                >
                  <Icon name="question" className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 text-[15px] font-bold leading-snug text-navy-900">
                  {item.question}
                </span>
                <Icon
                  name="chevronDown"
                  className={`h-5 w-5 shrink-0 text-navy-400 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-brand-600" : ""
                  }`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pl-[3.875rem] pr-6 text-sm leading-relaxed text-navy-600 sm:pl-[4.125rem]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
