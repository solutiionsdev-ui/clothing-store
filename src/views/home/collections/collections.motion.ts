/**
 * Shared motion constants for the collections section.
 *
 * Same reasoning as `details.motion.ts`: this sits below the fold, so every
 * decode is triggered by the piece entering the viewport rather than by mount,
 * and these numbers are offsets within a group, not a page-wide timeline.
 */
export const COLLECTIONS_REVEAL = {
  heading: 0,
  lede: 120,

  /** First card's delay; `cardStep` staggers the three after it. */
  card: 80,
  cardStep: 90,

  cta: 460,
} as const;
