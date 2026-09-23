"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";

import type { HeroImage } from "./hero.types";

/**
 * Which idle the glyph gets. Both marks are single white paths, so nothing
 * inside them can be animated separately — the motion has to suit the whole
 * shape.
 */
export type HeroBadgeMotion = "globe" | "reticle";

export interface HeroBadgeIconProps {
  icon: HeroImage;
  motion: HeroBadgeMotion;
}

/** Seconds per full turn-and-back of the globe. */
const GLOBE_PERIOD_S = 3.4;
/** How far it swings either side of face-on. */
const GLOBE_SWING_DEG = 58;
/**
 * Perspective depth, px. Small relative to the 37px glyph on purpose — it is
 * what makes the near edge grow as the far edge shrinks, which is the difference
 * between reading as a turn and reading as a squash.
 */
const GLOBE_PERSPECTIVE = 110;

/** Seconds between one ping and the next. */
const RETICLE_PING_S = 2.4;
/** Fractions of that period spent rising and falling. */
const RETICLE_ATTACK = 0.1;
const RETICLE_RELEASE = 0.32;
/** How far the reticle opens at the peak of a ping. */
const RETICLE_GAIN = 0.16;

const TAU = Math.PI * 2;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The corner marks, given an idle.
 *
 * Driven from the shared ticker with a sine, the same way the product's idle
 * drift is. CSS keyframe animation is banned outright by hard rule #1, and these
 * loop forever, so a `transition` cannot express them either.
 *
 * The globe **turns about its vertical axis** — a real `rotateY` under a short
 * perspective, not a flat `scaleX`. Both narrow the glyph, but only perspective
 * grows the near edge while the far edge shrinks, and that asymmetry is the
 * whole difference between reading as a turn and reading as a squash. It swings
 * either side of face-on instead of going all the way round, because past 90° a
 * flat glyph mirrors and a sphere must never read as inside-out.
 *
 * The reticle **does not rotate** — a sight is aimed, not swept. It pings:
 * sharp rise, slower fall, then rest for most of the period.
 *
 * Only `transform` is written, and only while the mark is on screen.
 */
export const HeroBadgeIcon = ({ icon, motion }: HeroBadgeIconProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;

    let unsubscribe: (() => void) | null = null;
    let start = 0;

    const tick = (time: number) => {
      if (!start) start = time;
      const seconds = (time - start) / 1000;

      if (motion === "globe") {
        // Swings either side of face-on rather than turning all the way round:
        // past 90° a flat glyph mirrors, and a globe never reads as inside-out.
        const angle =
          Math.sin((seconds / GLOBE_PERIOD_S) * TAU) * GLOBE_SWING_DEG;
        element.style.transform = `perspective(${GLOBE_PERSPECTIVE}px) rotateY(${angle.toFixed(2)}deg)`;
        return;
      }

      // A sight pings; it does not scan. Sharp rise, slower fall, then rest for
      // most of the period — a steady throb would just flicker in the corner.
      const phase = (seconds % RETICLE_PING_S) / RETICLE_PING_S;
      let envelope = 0;
      if (phase < RETICLE_ATTACK) {
        envelope = phase / RETICLE_ATTACK;
      } else if (phase < RETICLE_ATTACK + RETICLE_RELEASE) {
        envelope = 1 - (phase - RETICLE_ATTACK) / RETICLE_RELEASE;
      }
      const eased = envelope * envelope * (3 - 2 * envelope);
      element.style.transform = `scale(${(1 + eased * RETICLE_GAIN).toFixed(4)})`;
      element.style.opacity = (0.78 + 0.22 * eased).toFixed(3);
    };

    // Idle motion on something off screen is pure waste — see
    // `optimize-3d-scene` §4.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !unsubscribe) {
        start = 0;
        unsubscribe = subscribeToTicker(tick, () => 0);
      } else if (!entry.isIntersecting && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });
    observer.observe(element);

    return () => {
      unsubscribe?.();
      observer.disconnect();
    };
  }, [motion]);

  return (
    <span
      ref={ref}
      className="block will-change-transform"
      style={{ transformOrigin: "50% 50%" }}
    >
      {/* **Sized in rem, not left at its intrinsic pixels.** `width`/`height`
          here are the frame's own units, and with no CSS size `next/image`
          renders them as literal pixels — so these two marks stayed 23px while
          everything around them scaled with the root font-size. That is
          invisible at 1440, where the frame's scale is exactly 1 and 23 units
          happen to be 23px, and wrong at every other width: measured at 1280 the
          card had shrunk to 89% and the reticle had not, which pushed it off the
          centre of its cell. They were the only two images on the page that did
          not scale. */}
      <Image
        src={icon.src}
        alt={icon.alt}
        width={icon.width}
        height={icon.height}
        priority
        aria-hidden={icon.alt === "" ? true : undefined}
        style={{
          width: `${icon.width / 16}rem`,
          height: `${icon.height / 16}rem`,
        }}
      />
    </span>
  );
};
