// 📖 Docs: obsidian/frontend/components/common.md

/**
 * Adaptive scaling grid configuration.
 *
 * The grid keeps a rem-based design proportional across viewports by scaling
 * the root (`<html>`) font-size. Each breakpoint maps a viewport `maxWidth` to
 * the design `baseWidth` it was laid out at — at `baseWidth` the root
 * font-size equals `FONT_BASE` and rem values match the design 1:1.
 *
 * - Scaling DOWN (viewport at or below `GRID_BASE_WIDTH`, and no further than
 *   1024, under which nothing is scaled) is driven by the `vw` rule in
 *   `src/app/globals.css`.
 * - Scaling UP (viewport above `GRID_BASE_WIDTH`) is driven at runtime by the
 *   `AdaptiveGrid` component / `useAdaptiveGrid` hook.
 *
 * Changing these values means updating the `html` media queries in
 * `globals.css` to match — the formula is:
 *   font-size: min(FONT_BASE * 100 / baseWidth  (vw),
 *                  FONT_BASE * 100 / baseHeight (lvh))
 *
 * **Both axes, not the width alone.** The frame has a height as well as a
 * width — 800 units against 1440 — and a width-only scale draws it taller than
 * any window wider than 1.8:1, cropping the bottom of every screen. The design
 * base height is not listed here because there is one frame and one height;
 * add it alongside `baseWidth` if a second frame ever appears. ADR-0035.
 */

/** Root font-size (px) the design is measured against. */
export const FONT_BASE = 16;

export interface GridBreakpoint {
  /** Media-query `max-width` threshold (px). */
  maxWidth: number;
  /** Design base width (px) the range was laid out at. */
  baseWidth: number;
}

/**
 * Breakpoints, largest first.
 *
 * **One entry, because the page has one scaled regime.** At and above 1024 the
 * layout reproduces the 1440 frame, so the root font-size is that frame's scale
 * factor and the range is unbounded upwards — 1440 is the only desktop frame
 * this project has, so the design keeps filling wider viewports rather than
 * being pinned and letterboxed. Add a 1920 entry (and the matching media query)
 * once a 1920 frame exists. ADR-0024.
 *
 * **Below 1024 nothing is scaled.** There is no frame under 1024 to reproduce —
 * that range is an adaptation in ordinary responsive flow at a plain 16px root.
 * It used to carry 1024 and 360 bands, which put the root font-size at 28.4px
 * at a 640 viewport and 10.0px at 641; see the note in `globals.css`.
 */
export const GRID_BREAKPOINTS: readonly GridBreakpoint[] = [
  { maxWidth: 1440, baseWidth: 1440 },
];
/**
 * Largest breakpoint width. Scaling above it is handled by the unbounded CSS
 * rule, so `AdaptiveGrid` is not mounted in this project — see ADR-0024.
 */
export const GRID_BASE_WIDTH = Math.max(
  ...GRID_BREAKPOINTS.map((bp) => bp.maxWidth),
);
