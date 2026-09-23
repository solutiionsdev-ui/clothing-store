"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";

/**
 * How long the curtain will wait for its gates before lifting anyway.
 *
 * A preloader that can outlive what it is waiting for is worse than none: a
 * model that fails to decode, a font that never resolves, an offline image —
 * any of them would leave the page behind a wall for good. This is the promise
 * that cannot happen.
 */
const PATIENCE_MS = 8000;

/** Minimum time on screen, so a warm cache does not flash the curtain. */
const FLOOR_MS = 700;

/** How fast the readout chases the real figure, per 60Hz frame. */
const COUNT_LERP = 0.08;

const CORNERS = [
  "top-10 left-10 border-t border-l",
  "top-10 right-10 border-t border-r",
  "bottom-10 left-10 border-b border-l",
  "bottom-10 right-10 border-b border-r",
];

/**
 * The loading curtain.
 *
 * **Gated on real readiness, not on a timer.** It waits for the fonts to
 * resolve, for `window.load`, and for the hero's WebGL scene to report that its
 * model is compiled — the three things that decide whether the first screen is
 * actually there. A duration would be a promise about the network that nothing
 * can keep; this way a warm cache leaves almost immediately and a cold one is
 * told the truth. `PATIENCE_MS` is the backstop.
 *
 * The readout chases the real figure rather than showing it, so the count reads
 * as something filling rather than as three jumps between the gates.
 *
 * Rendered on the server so there is no flash of the page before it, and
 * removed from the flow entirely once it has gone — a `<noscript>` rule hides
 * it where scripts never run, which is the one case that could strand a reader
 * behind it.
 */
export const Preloader = () => {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const started = performance.now();
    let target = 0;
    let shown = 0;
    let finished = false;

    const gates = ["fonts", "load", "scene"];
    const met = new Set<string>();
    const settle = (gate: string) => {
      if (finished) return;
      met.add(gate);
      target = met.size / gates.length;
      if (met.size === gates.length) finish();
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      target = 1;
      const wait = Math.max(0, FLOOR_MS - (performance.now() - started));
      window.setTimeout(() => setDone(true), wait);
    };

    document.fonts?.ready.then(() => settle("fonts")).catch(() => settle("fonts"));

    if (document.readyState === "complete") settle("load");
    else window.addEventListener("load", () => settle("load"), { once: true });

    window.addEventListener("hero-scene-ready", () => settle("scene"), {
      once: true,
    });

    const patience = window.setTimeout(finish, PATIENCE_MS);

    const unsubscribe = subscribeToTicker(() => {
      // Creep towards the next gate rather than sitting still between them, but
      // never past it — the number should never have to go backwards.
      const ceiling = finished ? 1 : Math.min(0.97, target + 0.12);
      shown += (ceiling - shown) * COUNT_LERP;
      setProgress(shown);
    }, () => 0);

    return () => {
      window.clearTimeout(patience);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(timer);
  }, [done]);

  if (gone) return null;

  const percent = Math.round(Math.min(1, progress) * 100);

  return (
    <div
      aria-hidden
      data-preloader
      className={`hero-lattice fixed inset-0 z-100 grid place-items-center font-mono transition-opacity duration-500 ease-entrance motion-reduce:transition-none ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* The frame closes on the page — the same gesture the buttons use when
          the pointer finds them, at the scale of the whole viewport. */}
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={`absolute size-10 border-hero-content transition-all duration-700 ease-entrance motion-reduce:transition-none ${corner} ${
            done ? "scale-150 opacity-0" : "scale-100 opacity-100"
          }`}
        />
      ))}

      {/* Wider, with a larger mark and a readable count, below the frame. The
          curtain is the first thing the page shows, and at the frame's own
          sizes it sat as a small island in the middle of a tablet screen with
          a 12px line under it. */}
      <div className="flex w-64 flex-col items-center gap-6 max-lg:w-80 max-lg:gap-8">
        <Image
          src="/assets/ui/logo-mark.png"
          alt=""
          width={300}
          height={120}
          priority
          className={`h-12 w-auto object-contain max-lg:h-16 transition-transform duration-700 ease-entrance motion-reduce:transition-none ${
            done ? "scale-105" : "scale-100"
          }`}
        />

        {/* The rule fills. One transform on one element, so the browser has a
            compositor job rather than a layout one on every frame. */}
        <div className="h-px w-full bg-hero-rule max-lg:h-0.5">
          <div
            className="h-full origin-left bg-hero-content"
            style={{ transform: `scaleX(${Math.min(1, progress)})` }}
          />
        </div>

        {/* Muted rather than faint below the frame: at 25% white the readout was
            there without being legible, which is the one thing a loading count
            has to be. */}
        <p className="text-hero-caption leading-hero-display tracking-hero-caption text-hero-content-faint tabular-nums max-lg:text-hero-body max-lg:text-hero-content-muted">
          LOADING {String(percent).padStart(3, "0")}
        </p>
      </div>
    </div>
  );
};
