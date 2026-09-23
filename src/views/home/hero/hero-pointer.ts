"use client";

/**
 * The hero's single source of pointer truth.
 *
 * One `pointermove` listener on the section writes raw coordinates; one
 * subscription to the shared ticker smooths them and hands the same numbers to
 * every consumer. Per-layer listeners and per-layer loops are what make a
 * highlight and a product drift out of phase, so there is deliberately no way
 * to ask this module for its own loop.
 *
 * State is a **mutable object read in place** — consumers sample it inside the
 * render loop, so allocating a fresh snapshot per frame would be pure GC churn.
 *
 * 📖 Docs: obsidian/frontend/hooks.md
 */

import { subscribeToTicker } from "@/lib/animation/ticker";

export type HeroPointerMode = "idle" | "hover" | "dragging";

export interface HeroPointerState {
  /**
   * Unsmoothed position, px from the frame's top-left.
   *
   * The rotation reads this rather than the smoothed pair. Smoothing the input
   * and then feeding it to a spring is two filters in series: the pointer's own
   * 0.12 lerp is 95% settled after 391ms, and the spring's travel starts only
   * once that has run. The product answered the hand about half a second late
   * and it read as the model being sluggish rather than as easing. The spring
   * is the smoothing; this is the signal.
   */
  rawX: number;
  rawY: number;
  /** Smoothed position, px from the frame's top-left. Drives the lattice. */
  x: number;
  y: number;
  /**
   * A slower copy of the same position. The grid mixes towards this by cell
   * distance, which is what reads as a wave spreading out from the cursor.
   */
  lagX: number;
  lagY: number;
  /** Presence, 0–1. Multiplies the whole interactive layer. */
  intensity: number;
  mode: HeroPointerMode;
  /** Section size in px, refreshed on resize. */
  width: number;
  height: number;
  /**
   * False until the pointer has actually moved. Ungated, an untouched page
   * resolves to the section's centre and every effect fires at load — see
   * `optimize-3d-scene` §11.
   */
  engaged: boolean;
  /**
   * Horizontal drag travel since the previous frame, px — taken from the **raw**
   * position, not the smoothed one, so a turn tracks the hand 1:1.
   */
  dragDeltaX: number;
  /**
   * Horizontal velocity at the moment of release, px/frame, averaged over the
   * last 100ms. Non-zero for exactly one frame — the scene reads it and it is
   * cleared.
   */
  flingX: number;
}

/**
 * Position smoothing, expressed per 60Hz frame and then corrected for the real
 * frame time below. Uncorrected it converges twice as fast on a 120Hz display,
 * and everything downstream inherits that — the same hand movement reads calm on
 * one screen and twitchy on another.
 *
 * The spec's value; consumers must not re-smooth.
 */
const LERP = 0.12;
/** The lagged copy trails far enough behind to separate the wave front. */
const LAG_LERP = 0.045;
/** The frame the constants above are quoted against. */
const REFERENCE_FRAME_MS = 1000 / 60;

/** Convert a per-60Hz-frame lerp into this frame's equivalent. */
const frameLerp = (perFrame: number, deltaMs: number): number =>
  1 - Math.pow(1 - perFrame, deltaMs / REFERENCE_FRAME_MS);

const INTENSITY_IN_MS = 250;
const INTENSITY_OUT_MS = 400;

/** Window the release velocity is averaged over. */
const FLING_WINDOW_MS = 100;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export interface HeroPointer {
  state: HeroPointerState;
  /** Wire the drag gesture to the product's hit area. */
  attachDragTarget: (target: HTMLElement) => () => void;
  /** The element coordinates are measured against — consumers need its rect. */
  frame: HTMLElement;
  destroy: () => void;
}

/**
 * @param events  The element the listeners hang off — it has to be able to
 *                receive pointer events, so it is the whole travel region.
 * @param frame   The element coordinates are measured against, defaulting to
 *                the same one. These are deliberately separable: the region is
 *                two screens tall and scrolls, while the canvas is pinned to the
 *                viewport, and a position measured against the region goes stale
 *                the moment the page scrolls without the cursor moving — the
 *                highlight would slide away on its own. Measuring against the
 *                pinned canvas is scroll-independent.
 */
export const createHeroPointer = (
  events: HTMLElement,
  frame: HTMLElement = events,
): HeroPointer => {
  const state: HeroPointerState = {
    rawX: 0,
    rawY: 0,
    x: 0,
    y: 0,
    lagX: 0,
    lagY: 0,
    intensity: 0,
    mode: "idle",
    width: frame.clientWidth,
    height: frame.clientHeight,
    engaged: false,
    dragDeltaX: 0,
    flingX: 0,
  };

  let rawX = 0;
  let rawY = 0;
  /** Where the raw position stood when this frame began. */
  let previousRawX = 0;
  /** Progress through the current intensity ramp, ms. */
  let intensityElapsed = 0;
  let intensityFrom = 0;
  let intensityTo = 0;
  let lastTime = 0;

  // Ring of recent raw samples, for the release velocity.
  const samples: { time: number; x: number }[] = [];

  const rampIntensity = (to: number) => {
    intensityFrom = state.intensity;
    intensityTo = to;
    intensityElapsed = 0;
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = frame.getBoundingClientRect();
    rawX = event.clientX - rect.left;
    rawY = event.clientY - rect.top;

    if (!state.engaged) {
      // Land the smoothed value on the first real reading rather than easing
      // in from the corner.
      state.x = state.lagX = rawX;
      state.y = state.lagY = rawY;
      previousRawX = rawX;
      state.engaged = true;
    }

    samples.push({ time: event.timeStamp, x: rawX });
    while (
      samples.length > 1 &&
      event.timeStamp - samples[0].time > FLING_WINDOW_MS
    ) {
      samples.shift();
    }
  };

  const onPointerEnter = () => {
    if (state.mode === "idle") state.mode = "hover";
    rampIntensity(1);
  };

  const onPointerLeave = () => {
    if (state.mode !== "dragging") state.mode = "idle";
    rampIntensity(0);
  };

  events.addEventListener("pointermove", onPointerMove, { passive: true });
  events.addEventListener("pointerenter", onPointerEnter, { passive: true });
  events.addEventListener("pointerleave", onPointerLeave, { passive: true });

  const measure = () => {
    state.width = frame.clientWidth;
    state.height = frame.clientHeight;
  };
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(frame);

  // The loop only runs while the section is on screen (`optimize-3d-scene` §4).
  let unsubscribe: (() => void) | null = null;

  /**
   * The smoothed position, republished in **viewport** pixels as CSS custom
   * properties.
   *
   * The bordered panels on the second screen are opaque — they carry the
   * frame's own lattice fill — so the WebGL layer behind them cannot light their
   * cells up, and without this they would sit in a moving field as dead
   * islands. Publishing viewport coordinates lets every panel draw the same
   * highlight from a `background-attachment: fixed` layer with no per-panel
   * arithmetic, so they stay in phase with each other and with the page.
   *
   * Written once per frame, from the loop that is already running, and only
   * while the pointer is engaged.
   */
  const root = document.documentElement;
  const publish = () => {
    const rect = frame.getBoundingClientRect();
    root.style.setProperty("--hero-pointer-x", `${rect.left + state.x}px`);
    root.style.setProperty("--hero-pointer-y", `${rect.top + state.y}px`);
  };

  const tick = (time: number) => {
    const delta = lastTime ? Math.min(50, time - lastTime) : 16;
    lastTime = time;

    if (intensityTo !== state.intensity) {
      intensityElapsed += delta;
      const duration = intensityTo > intensityFrom ? INTENSITY_IN_MS : INTENSITY_OUT_MS;
      const progress = Math.min(1, intensityElapsed / duration);
      state.intensity =
        intensityFrom + (intensityTo - intensityFrom) * easeOutCubic(progress);
      if (progress === 1) state.intensity = intensityTo;
    }

    state.rawX = rawX;
    state.rawY = rawY;

    const k = frameLerp(LERP, delta);
    const kLag = frameLerp(LAG_LERP, delta);
    state.x += (rawX - state.x) * k;
    state.y += (rawY - state.y) * k;
    state.lagX += (rawX - state.lagX) * kLag;
    state.lagY += (rawY - state.lagY) * kLag;

    // The turn integrates **raw** travel. Integrating the smoothed position
    // loses rotation on a quick flick: the smoothed value is still catching up
    // when the button comes back up, and whatever it had not covered yet is
    // simply dropped. Smoothing stays where it belongs — the lattice and the
    // tilt, which want easing, not the gesture, which wants to track the hand.
    state.dragDeltaX = state.mode === "dragging" ? rawX - previousRawX : 0;
    previousRawX = rawX;

    publish();
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !unsubscribe) {
        lastTime = 0;
        unsubscribe = subscribeToTicker(tick, () => 0);
      } else if (!entry.isIntersecting && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
    { rootMargin: "10%" },
  );
  observer.observe(events);

  const attachDragTarget = (target: HTMLElement) => {
    const onDown = (event: PointerEvent) => {
      // Drag is the **touch** path only: a fine pointer rotates on hover, and
      // letting it drag as well would stack an accumulating turn on top of an
      // absolute one. Even here the gesture stays undecided until `onMove` sees
      // which axis it commits to, so a vertical swipe still scrolls the page.
      if (event.pointerType !== "touch") return;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragPointerId = event.pointerId;
      samples.length = 0;
    };

    const onMove = (event: PointerEvent) => {
      if (dragPointerId !== event.pointerId) return;
      if (state.mode !== "dragging") {
        const dx = Math.abs(event.clientX - dragStartX);
        const dy = Math.abs(event.clientY - dragStartY);
        // Undecided until the gesture commits to an axis; a vertical swipe is
        // the page's, or the section stops scrolling on a phone.
        if (dx < 8 && dy < 8) return;
        if (dy > dx) {
          dragPointerId = null;
          return;
        }
        state.mode = "dragging";
        target.setPointerCapture(event.pointerId);
      }
    };

    const endDrag = (event: PointerEvent) => {
      if (dragPointerId !== event.pointerId) return;
      dragPointerId = null;
      if (state.mode !== "dragging") return;

      const first = samples[0];
      const last = samples[samples.length - 1];
      if (first && last && last.time > first.time) {
        // px per frame at 60fps, which is the unit the scene integrates in.
        state.flingX = ((last.x - first.x) / (last.time - first.time)) * 16.7;
      }
      state.mode = state.intensity > 0 ? "hover" : "idle";
    };

    let dragStartX = 0;
    let dragStartY = 0;
    let dragPointerId: number | null = null;

    target.addEventListener("pointerdown", onDown, { passive: true });
    target.addEventListener("pointermove", onMove, { passive: true });
    target.addEventListener("pointerup", endDrag, { passive: true });
    target.addEventListener("pointercancel", endDrag, { passive: true });

    return () => {
      target.removeEventListener("pointerdown", onDown);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", endDrag);
      target.removeEventListener("pointercancel", endDrag);
    };
  };

  return {
    state,
    attachDragTarget,
    frame,
    destroy: () => {
      unsubscribe?.();
      observer.disconnect();
      resizeObserver.disconnect();
      events.removeEventListener("pointermove", onPointerMove);
      events.removeEventListener("pointerenter", onPointerEnter);
      events.removeEventListener("pointerleave", onPointerLeave);
      root.style.removeProperty("--hero-pointer-x");
      root.style.removeProperty("--hero-pointer-y");
    },
  };
};

/**
 * Shared instances, one per section.
 *
 * The lattice, the product and the wordmark all read the same pointer, and the
 * spec's whole point is that they read it from the *same* place — separate
 * listeners drift out of phase. Consumers acquire rather than construct, so
 * "one listener, one loop" holds however many of them there turn out to be.
 */
const instances = new WeakMap<
  HTMLElement,
  { pointer: HeroPointer; count: number }
>();

/**
 * Resolve the one pair every consumer must share, from anywhere inside it.
 *
 * Callers used to pass their own element, and once the canvas moved out of the
 * hero and up to the page the two consumers were naming *different* elements —
 * the scene the travel region, the wordmark its section — so the WeakMap handed
 * them separate instances and the module's whole "one listener, one loop"
 * guarantee quietly lapsed. Resolving both ends here instead of trusting the
 * caller makes that impossible, and makes it independent of mount order: the
 * scene is a lazy client chunk and lands *after* the wordmark, so whichever
 * arrives first must still name the same pair.
 */
const resolvePair = (from: HTMLElement) => {
  const region = from.closest<HTMLElement>("[data-product-region]") ?? from;
  const frame =
    region.querySelector<HTMLElement>("[data-pointer-frame]") ?? region;
  return { region, frame };
};

export const acquireHeroPointer = (
  from: HTMLElement,
): { pointer: HeroPointer; release: () => void } => {
  const { region: events, frame } = resolvePair(from);
  const section = events;
  let entry = instances.get(section);
  if (!entry) {
    entry = { pointer: createHeroPointer(events, frame), count: 0 };
    instances.set(section, entry);
  }
  entry.count += 1;

  let released = false;
  return {
    pointer: entry.pointer,
    release: () => {
      if (released) return;
      released = true;
      const current = instances.get(section);
      if (!current) return;
      current.count -= 1;
      if (current.count > 0) return;
      current.pointer.destroy();
      instances.delete(section);
    },
  };
};
