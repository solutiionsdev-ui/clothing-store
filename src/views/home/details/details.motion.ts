/**
 * Shared motion constants for the details section.
 */

/**
 * Decode cascade, in milliseconds after the piece scrolls into view.
 *
 * The hero's cascade runs from mount because it is already on screen; this one
 * cannot — a mount-triggered decode down here finishes long before the reader
 * arrives. Each piece starts its own timer when it enters the viewport, so the
 * numbers below are offsets within a group, not a page-wide timeline.
 *
 * Kept in one file for the same reason as `hero.motion.ts`: a cascade read from
 * four separate components drifts the moment anyone tunes one number.
 */
export const DETAILS_REVEAL = {
  heading: 0,
  lede: 120,
  cta: 200,

  /** First row's delay; `featureStep` staggers the four below it. */
  feature: 80,
  featureStep: 90,
} as const;
