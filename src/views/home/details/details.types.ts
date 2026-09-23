/**
 * Content contract for the details section.
 *
 * Every string here is copied character-for-character from the Figma frame
 * (file WINXFW2nTM7zYwd5dGgm1T, node 1748:1102) — see DESIGN-MAP.md.
 *
 * These shapes intentionally repeat the hero's rather than importing them: a
 * section owns its own contract, so neither can break the other by widening a
 * field. They are four lines each; the coupling would cost more than the
 * duplication.
 */

export interface DetailsImage {
  src: string;
  /** Empty string marks the image decorative (see html-semantics.md). */
  alt: string;
  width: number;
  height: number;
}

export interface DetailsLink {
  label: string;
  href: string;
}

/** One numbered row in the specification list. */
export interface DetailsFeature {
  /** The frame's own two-digit numeral. Decorative — the `ol` carries order. */
  index: string;
  icon: DetailsImage;
  title: string;
  body: string;
}

export interface DetailsContent {
  /** The section's `h2`. */
  heading: string;
  lede: string;
  cta: DetailsLink;
  features: DetailsFeature[];
}
