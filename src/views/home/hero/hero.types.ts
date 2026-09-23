/**
 * Content contract for the hero section.
 *
 * Every string here is copied character-for-character from the Figma frame
 * (file WINXFW2nTM7zYwd5dGgm1T, node 902:304) — see DESIGN-MAP.md.
 */

export interface HeroImage {
  src: string;
  /** Empty string marks the image decorative (see html-semantics.md). */
  alt: string;
  width: number;
  height: number;
}

export interface HeroLink {
  label: string;
  href: string;
}

export interface HeroNavItem extends HeroLink {
  /**
   * The entries behind the caret the frame draws next to "COLLECTIONS".
   *
   * The frame shows the glyph and nothing behind it; the panel was added on the
   * client's call and lists what the collections screen actually holds, so the
   * two cannot drift into describing different ranges.
   */
  submenu?: HeroLink[];
}

/** A bracketed statement pinned to the left or right edge of the frame. */
export interface HeroMarkerContent {
  /** One entry per rendered line — the frame breaks these by hand. */
  lines: string[];
}

/** A bordered card in the bottom corners of the frame. */
export interface HeroBadgeContent {
  icon: HeroImage;
  /** Sits under the icon; only the left card has one. */
  caption?: string;
  lines: string[];
}

/** A 3D product model. */
export interface HeroModel {
  /** Path to the `.glb`. */
  src: string;
  /** Describes the product — a canvas has no `alt`. */
  label: string;
}

export interface HeroContent {
  logo: HeroImage;
  nav: HeroNavItem[];
  cart: HeroLink;
  markerStart: HeroMarkerContent;
  markerEnd: HeroMarkerContent;
  /** The `h1`, one entry per rendered line. */
  title: string[];
  cta: HeroLink;
  badgeStart: HeroBadgeContent;
  badgeEnd: HeroBadgeContent;
  /** The product, rendered live from a glTF model. */
  subject: HeroModel;
  /** The brand wordmark, sitting far back behind the product. */
  backdrop: HeroImage;
}
