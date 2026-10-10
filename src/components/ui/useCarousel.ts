"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A horizontally scrolling track you can drag, swipe, step with buttons or
 * move with the arrow keys.
 *
 * Touch and trackpads use the browser's own scrolling (with snap points set
 * on the track), which is smoother than anything done in script. The mouse
 * gets drag-to-scroll on top, and a drag never turns into a click on a card
 * underneath it.
 */
export function useCarousel({
  total,
  initial,
  batch = 12,
}: {
  /** How many items the track holds in all. */
  total?: number;
  /**
   * How many to draw at first. The rest are added in batches of `batch` as
   * the visitor scrolls towards the end, so a long list costs nothing until
   * somebody actually moves through it. Omit to draw everything.
   */
  initial?: number;
  batch?: number;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const all = total ?? Infinity;
  const [count, setCount] = useState(() => Math.min(initial ?? all, all));
  const countRef = useRef(count);
  countRef.current = count;
  /** A step pressed at the very end, carried out once the next batch is drawn. */
  const pendingStep = useRef<1 | -1 | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, left: 0 });

  /** `grow`: also draw the next batch when the visitor is close to the end. */
  const update = useCallback(
    (grow = false) => {
      const el = ref.current;
      if (!el) return;
      const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);
      const more = countRef.current < all;
      // A screen and a half ahead, so a swipe never lands on empty space.
      if (grow && more && remaining < el.clientWidth * 1.5) {
        setCount((c) => Math.min(all, c + batch));
      }
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(!more && remaining <= 4);
    },
    [all, batch],
  );

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const onScroll = () => update(true);
    const onResize = () => update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [update]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = ref.current;
      if (!el) return;
      const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);
      // Already at the end of what is drawn: draw more, then move.
      if (dir === 1 && remaining <= 4 && countRef.current < all) {
        pendingStep.current = dir;
        setCount((c) => Math.min(all, c + batch));
        return;
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
    },
    [all, batch],
  );

  // Newly drawn items change the track's width without a scroll event.
  useEffect(() => {
    update();
    if (pendingStep.current) {
      const dir = pendingStep.current;
      pendingStep.current = null;
      step(dir);
    }
  }, [count, update, step]);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const el = ref.current;
      if (!el) return;
      dragging.current = true;
      moved.current = false;
      start.current = { x: e.clientX, left: el.scrollLeft };
      setGrabbing(true);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const el = ref.current;
      if (!el) return;
      const dx = e.clientX - start.current.x;
      if (Math.abs(dx) > 4) moved.current = true;
      el.scrollLeft = start.current.left - dx;
    },
    onPointerUp: () => {
      dragging.current = false;
      setGrabbing(false);
    },
    onPointerLeave: () => {
      dragging.current = false;
      setGrabbing(false);
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
      }
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    },
  };

  return { ref, atStart, atEnd, grabbing, step, handlers, count };
}
