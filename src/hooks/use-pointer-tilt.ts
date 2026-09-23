"use client";

/**
 * Pointer-driven tilt: a flat box that answers the cursor as though it were a
 * plate with a little depth behind it.
 *
 * 📖 Docs: obsidian/frontend/hooks.md
 *
 * **Why this is a hook and not one of the spring components.** Everything in
 * `src/components/animation/springs/` animates between two *states* — a `from`
 * and a `to`, switched by hover, view or progress. This is not a state: the
 * angle is a continuous function of where the cursor is inside the box, the
 * same way the product's turntable reads the pointer's place in its section
 * (`hero-scene.tsx`). There is no `to` to hand those components. So the spring
 * is `@react-spring/web`'s own, driven imperatively — hard rule #1 is about the
 * library and the physics, and both hold; only the component wrapper cannot.
 *
 * **The parallax is the projection's, not arithmetic.** The surface carries
 * `transform-style: preserve-3d` and the floating layer a `translateZ`, so the
 * layer's offset against the card falls straight out of the perspective
 * transform as the card turns — which is what makes it read as a layer standing
 * off the card rather than as a second thing sliding about on it. The small
 * pointer-driven translate on top of that carries the effect on the axis the
 * tilt cannot: it keeps moving while the card is still nearly flat on.
 *
 * **Nothing here re-renders.** The values live in the spring and reach the DOM
 * through `animated` elements, so a cursor crossing the row costs no React
 * work at all — which matters, because there are four of these side by side.
 */

import { useCallback, useMemo, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { to, useSpring } from "@react-spring/web";

export interface PointerTiltOptions {
  /** Rotation at the far corner, degrees on each axis. */
  tilt?: number;
  /** Perspective distance, rem. Smaller is a wider lens and a stronger effect. */
  lens?: number;
  /** How far the floating layer stands off the surface, rem. */
  depth?: number;
  /** Extra travel given to the floating layer at the far edge, rem. */
  drift?: number;
}

/**
 * Spring for both axes.
 *
 * Slower than a hover fade on purpose: the cursor is a noisy input and the box
 * is large, so anything tighter tracks the hand's own jitter. No overshoot —
 * a card that wobbles after the cursor stops reads as loose, not as heavy.
 */
const CONFIG = { tension: 170, friction: 26, mass: 1 } as const;

const DEFAULTS = { tilt: 6.5, lens: 60, depth: 2.5, drift: 0.55 };

export interface PointerTilt {
  /** Spread onto the element that tilts — it is also what is measured. */
  bind: {
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerLeave: () => void;
  };
  /** Style for the element that holds the tilted one — it owns the lens. */
  stage: CSSProperties;
  /** Style for the element that tilts. Needs an `animated` element. */
  surface: CSSProperties;
  /** Style for the layer floating above it. Needs an `animated` element. */
  layer: CSSProperties;
}

export const usePointerTilt = (
  options: PointerTiltOptions = {},
): PointerTilt => {
  const { tilt, lens, depth, drift } = { ...DEFAULTS, ...options };
  /**
   * Read once, on the first move that would use it.
   *
   * A pointer that reports itself as a mouse is the only one this is for:
   * touch has no hover, and tilting a card under the finger already covering
   * it is motion nobody sees. `prefers-reduced-motion` opts out entirely.
   */
  const reduced = useRef<boolean | null>(null);
  const [spring, api] = useSpring(() => ({ nx: 0, ny: 0, config: CONFIG }));

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      if (reduced.current === null) {
        reduced.current = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
      }
      if (reduced.current) return;

      const box = event.currentTarget.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // −1 at the left/top edge, +1 at the right/bottom. Clamped because a
      // child may overhang the box the angle is measured against.
      const clamp = (value: number) => Math.min(1, Math.max(-1, value));
      api.start({
        nx: clamp(((event.clientX - box.left) / box.width) * 2 - 1),
        ny: clamp(((event.clientY - box.top) / box.height) * 2 - 1),
      });
    },
    [api],
  );

  const onPointerLeave = useCallback(() => {
    api.start({ nx: 0, ny: 0 });
  }, [api]);

  return useMemo(
    () => ({
      bind: { onPointerMove, onPointerLeave },
      stage: { perspective: `${lens}rem` },
      surface: {
        transformStyle: "preserve-3d",
        // The corner under the cursor goes *away*, so the card leans towards
        // the hand. Reversed, it reads as the card dodging the cursor.
        transform: to(
          [spring.nx, spring.ny],
          (nx, ny) => `rotateX(${-ny * tilt}deg) rotateY(${nx * tilt}deg)`,
        ),
      } as unknown as CSSProperties,
      layer: {
        // The Z is constant, so the layer stands off the card at rest too and
        // does not appear to detach the moment the cursor arrives.
        transform: to(
          [spring.nx, spring.ny],
          (nx, ny) =>
            `translate3d(${nx * drift}rem, ${ny * drift * 0.7}rem, ${depth}rem)`,
        ),
      } as unknown as CSSProperties,
    }),
    [onPointerMove, onPointerLeave, spring.nx, spring.ny, tilt, lens, depth, drift],
  );
};
