"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Full-screen photo inspector for identity checks.
 *
 * A picture scaled to fit the window is not a zoom — the whole point of this
 * screen is reading an expiry date or a document number off a phone snapshot,
 * which needs real magnification and the ability to move around inside the
 * image once magnified.
 *
 * Rotation is here because a photograph of a passport is very often sideways:
 * people hold the phone in portrait and the document in landscape, and no
 * amount of zoom makes text readable at ninety degrees.
 *
 * Switching between the two photographs without leaving the viewer matters as
 * much as the zoom does. The check is a comparison — the face on the document
 * against the face in the selfie — and closing one image to open the other
 * puts the two things being compared on opposite sides of a click.
 */

export interface ZoomImage {
  src: string;
  label: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 10;
const STEP = 1.4;

export function ImageZoom({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ZoomImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  // Pointer id -> last position, so one pointer pans and two pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const current = images[index];

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    setRotation(0);
  }, []);

  // A new photograph starts fresh: carrying the previous one's pan over means
  // opening the second image already scrolled somewhere arbitrary.
  useEffect(() => {
    reset();
    setLoading(true);
  }, [index, reset]);

  /**
   * Zoom about a point, so the pixel under the cursor stays under the cursor.
   *
   * With `translate(t) scale(s)`, a model point m lands at t + s·m. Holding
   * screen point p fixed across a scale change gives t' = p − s'·(p − t)/s.
   * Rotation is applied inside the scale, so it drops out of this entirely.
   */
  const zoomAbout = useCallback(
    (next: number, px: number, py: number) => {
      setScale((s) => {
        const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
        const k = clamped / s;
        setTx((x) => (clamped === MIN_SCALE ? 0 : px - (px - x) * k));
        setTy((y) => (clamped === MIN_SCALE ? 0 : py - (py - y) * k));
        return clamped;
      });
    },
    [],
  );

  /** Pointer position relative to the centre of the frame. */
  function local(e: { clientX: number; clientY: number }) {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) };
  }

  // Wheel has to be bound natively: React's onWheel is passive, so it cannot
  // preventDefault, and the page scrolls behind the viewer instead of zooming.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      setScale((s) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * (e.deltaY < 0 ? STEP : 1 / STEP)));
        const k = next / s;
        setTx((x) => (next === MIN_SCALE ? 0 : p.x - (p.x - x) * k));
        setTy((y) => (next === MIN_SCALE ? 0 : p.y - (p.y - y) * k));
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = { x: 0, y: 0 };
      if (e.key === "Escape") return onClose();
      if (e.key === "+" || e.key === "=") return zoomAbout(scale * STEP, c.x, c.y);
      if (e.key === "-" || e.key === "_") return zoomAbout(scale / STEP, c.x, c.y);
      if (e.key === "0") return reset();
      if (e.key.toLowerCase() === "r") return setRotation((r) => (r + 90) % 360);
      if (e.key === "ArrowLeft" && images.length > 1 && scale === 1) {
        return onIndex((index - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight" && images.length > 1 && scale === 1) {
        return onIndex((index + 1) % images.length);
      }
      // Once magnified the arrows move the image rather than the selection —
      // panning is what you want at that point.
      if (scale > 1) {
        const d = 60;
        if (e.key === "ArrowLeft") setTx((x) => x + d);
        if (e.key === "ArrowRight") setTx((x) => x - d);
        if (e.key === "ArrowUp") setTy((y) => y + d);
        if (e.key === "ArrowDown") setTy((y) => y - d);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, reset, zoomAbout, scale, index, images.length, onIndex]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      zoomAbout((pinchStart.current.scale * dist) / pinchStart.current.dist, mid.x, mid.y);
      return;
    }

    if (pointers.current.size === 1 && scale > 1) {
      setTx((x) => x + (e.clientX - prev.x));
      setTy((y) => y + (e.clientY - prev.y));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  const zoomed = scale > 1;

  return (
    // Opaque, not translucent: anything showing through behind a document
    // competes with the thing being read.
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-navy-900"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.label} — enlarged`}
    >
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <p className="mr-auto text-sm font-semibold text-white">{current.label}</p>

        {images.length > 1 ? (
          <div className="flex items-center overflow-hidden rounded-lg border border-white/20">
            {images.map((img, i) => (
              <button
                key={img.label}
                type="button"
                onClick={() => onIndex(i)}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  i === index ? "bg-white text-navy-900" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {img.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-1 rounded-lg border border-white/20 p-0.5">
          <ToolButton
            label="Zoom out"
            icon="zoomOut"
            onClick={() => zoomAbout(scale / STEP, 0, 0)}
            disabled={scale <= MIN_SCALE}
          />
          <span className="w-14 text-center text-xs font-bold tabular-nums text-white">
            {Math.round(scale * 100)}%
          </span>
          <ToolButton
            label="Zoom in"
            icon="zoomIn"
            onClick={() => zoomAbout(scale * STEP, 0, 0)}
            disabled={scale >= MAX_SCALE}
          />
        </div>

        <ToolButton
          label="Rotate 90°"
          icon="rotate"
          bordered
          onClick={() => setRotation((r) => (r + 90) % 360)}
        />
        <ToolButton
          label="Reset view"
          icon="expand"
          bordered
          onClick={reset}
          disabled={scale === 1 && rotation === 0 && tx === 0 && ty === 0}
        />
        <ToolButton label="Close" icon="close" bordered onClick={onClose} />
      </div>

      {/* Stage */}
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          const p = local(e);
          zoomAbout(zoomed ? 1 : 3, p.x, p.y);
        }}
        className={`relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
      >
        {loading ? (
          <p className="absolute text-sm font-medium text-white/60">Loading photo…</p>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.label}
          draggable={false}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: pointers.current.size ? "none" : "transform 120ms ease-out",
          }}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <p className="shrink-0 px-4 py-2 text-center text-[11px] text-white/50">
        Scroll or pinch to zoom · drag to move · double-click to zoom in ·{" "}
        <kbd className="font-sans">R</kbd> to rotate · <kbd className="font-sans">0</kbd> to reset ·{" "}
        <kbd className="font-sans">Esc</kbd> to close
      </p>
    </div>
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  bordered,
}: {
  label: string;
  icon: "zoomIn" | "zoomOut" | "rotate" | "expand" | "close";
  onClick: () => void;
  disabled?: boolean;
  bordered?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-md p-2 text-white transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent ${
        bordered ? "border border-white/20" : ""
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}
