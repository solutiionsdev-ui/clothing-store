/**
 * Content contract for the collections section.
 *
 * Every string here is copied character-for-character from the Figma frame
 * (file WINXFW2nTM7zYwd5dGgm1T, node 1748:1152) — see DESIGN-MAP.md.
 */

export interface CollectionsImage {
  src: string;
  /** Empty string marks the image decorative (see html-semantics.md). */
  alt: string;
  width: number;
  height: number;
  /**
   * Offset from the card's centre, in frame units.
   *
   * Each product was nudged by hand in the frame so the garments line up with
   * each other rather than with their own bounding boxes — the photographs are
   * cropped differently. Carried as content because it belongs to the picture,
   * not to the card.
   */
  nudgeX?: number;
  nudgeY?: number;
}

export interface CollectionsProduct {
  /** The frame's own two-digit numeral. Decorative — the `ol` carries order. */
  index: string;
  /** The card's `h3`. */
  name: string;
  /**
   * Not in the frame — added on the client's call, with the SHOP NOW state.
   * **These figures are placeholders** and need real ones.
   */
  price: string;
  /**
   * The garment from each angle, in the order the swatches select them.
   *
   * The frame draws **four** swatches (`swatches` below) because the control
   * switches between four views of the jacket. Only one photograph per product
   * has been supplied so far, so the remaining swatches fall back to it — the
   * control is real, the pictures are missing.
   */
  views: CollectionsImage[];
  /** How many swatches the frame draws. */
  swatches: number;
  /** Which swatch the frame shows selected. */
  defaultView: number;
  /** Two short attributes, drawn as outlined chips. */
  tags: string[];
  /** Where SHOP NOW goes. No product routes exist yet. */
  href: string;
}

export interface CollectionsLink {
  label: string;
  href: string;
}

export interface CollectionsContent {
  /** The section's `h2`. */
  heading: string;
  lede: string;
  products: CollectionsProduct[];
  cta: CollectionsLink;
}
