"use client";

import { useEffect } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";

/**
 * Position smoothing, per 60Hz frame, corrected for real frame time below.
 *
 * The pair is the spec's: a tight follow for the core and a slack one for the
 * trail, so the field reads as something being dragged rather than teleported.
 */
const LERP = 0.12;
const LAG_LERP = 0.045;

/** Per-frame lerp → the same easing at any frame rate. */
const frameLerp = (perFrame: number, deltaMs: number) =>
  1 - Math.pow(1 - perFrame, deltaMs / (1000 / 60));

/**
 * Publishes the pointer, in viewport pixels, as custom properties on the root.
 *
 * **One writer for the whole page.** The lattice glow is CSS — a masked radial
 * that every surface draws from the same two coordinates — so the page
 * background and the opaque panels sitting on top of it light up in step
 * without any per-element geometry. That only works if exactly one thing owns
 * the values; the scene's own pointer used to publish them, which tied the
 * effect to the two screens a canvas happened to cover.
 *
 * A second, slacker pair trails behind for the glow's tail.
 *
 * Runs on the shared ticker, and only while the pointer has been seen: no
 * pointer, no writes, and a touch device never starts.
 */
export const PointerField = () => {
  useEffect(() => {
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let rawX = -9999;
    let rawY = -9999;
    let x = -9999;
    let y = -9999;
    let lagX = -9999;
    let lagY = -9999;
    let seen = false;
    let last = 0;

    const onMove = (event: PointerEvent) => {
      rawX = event.clientX;
      rawY = event.clientY;
      if (seen) return;
      // Land on the first reading rather than easing in from off-screen.
      seen = true;
      x = lagX = rawX;
      y = lagY = rawY;
    };

    // No leave handler on purpose. Sending the coordinates off-screen when the
    // cursor leaves means the glow *slides* away rather than stopping, and any
    // spurious `pointerleave` — they happen — snaps it back on the next move.
    // Leaving it where the cursor last was is quieter and cannot flicker.
    window.addEventListener("pointermove", onMove, { passive: true });

    const unsubscribe = subscribeToTicker((time) => {
      const delta = last ? Math.min(50, time - last) : 16;
      last = time;
      if (!seen && x < -9000) return;

      const k = frameLerp(LERP, delta);
      const kLag = frameLerp(LAG_LERP, delta);
      x += (rawX - x) * k;
      y += (rawY - y) * k;
      lagX += (rawX - lagX) * kLag;
      lagY += (rawY - lagY) * kLag;

      root.style.setProperty("--hero-pointer-x", `${x}px`);
      root.style.setProperty("--hero-pointer-y", `${y}px`);
      root.style.setProperty("--hero-pointer-lag-x", `${lagX}px`);
      root.style.setProperty("--hero-pointer-lag-y", `${lagY}px`);
    }, () => 0);

    return () => {
      unsubscribe();
      window.removeEventListener("pointermove", onMove);
      root.style.removeProperty("--hero-pointer-x");
      root.style.removeProperty("--hero-pointer-y");
      root.style.removeProperty("--hero-pointer-lag-x");
      root.style.removeProperty("--hero-pointer-lag-y");
    };
  }, []);

  return null;
};
