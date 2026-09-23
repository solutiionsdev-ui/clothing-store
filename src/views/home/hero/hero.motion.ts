/**
 * Shared motion constants for the hero section.
 */

/**
 * Decode cascade, in milliseconds after mount.
 *
 * The frame boots up rather than arriving all at once: the nav resolves first,
 * then the edge markers, the lede, the CTA and finally the corner cards. Each
 * value is the delay for the *first* line of its group; `*Step` staggers the
 * lines within it.
 *
 * These are deliberately kept in one place — a cascade read from six separate
 * files drifts the moment anyone tunes one number.
 */
export const HERO_REVEAL = {
  navStep: 60,
  cart: 240,

  marker: 140,
  markerStep: 80,

  title: 260,
  titleStep: 110,

  cta: 420,

  badgeStart: 480,
  badgeEnd: 540,
  badgeStep: 60,
} as const;
