/**
 * Content contract for the FAQ section.
 *
 * Every string here is copied character-for-character from the Figma frame
 * (file WINXFW2nTM7zYwd5dGgm1T, node 1748:1158) — see DESIGN-MAP.md.
 */

export interface FaqImage {
  src: string;
  /** Empty string marks the image decorative (see html-semantics.md). */
  alt: string;
  width: number;
  height: number;
}

export interface FaqEntry {
  /** The frame's own two-digit numeral. Decorative — the `dl` carries order. */
  index: string;
  question: string;
  answer: string;
  /**
   * Width of the question's own text box, frame units. Defaults to 175.
   *
   * It is what forces the frame's line break, and the frame does not use one
   * value: row 02 is set to 195 so "WHAT MATERIALS ARE / USED IN THE JACKETS?"
   * lands on two lines, where 175 would push it to three. Widening the others
   * to 195 breaks them differently, so this is per row.
   */
  questionWidth?: number;
}

/** A 3D product model. */
export interface FaqModel {
  /** Path to the `.glb`. */
  src: string;
  /** Describes the product — a canvas has no `alt`. */
  label: string;
}

export interface FaqContent {
  /** The section's `h2`. */
  heading: string;
  /** The same product the hero screen carries, pinned where the frame's
      photograph sat. */
  subject: FaqModel;
  entries: FaqEntry[];
}
