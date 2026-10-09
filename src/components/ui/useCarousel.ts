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
export function useCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, left: 0 });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const step = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  }, []);

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

  return { ref, atStart, atEnd, grabbing, step, handlers };
}
