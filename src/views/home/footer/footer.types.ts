/**
 * Content contract for the footer.
 *
 * Every string here is copied character-for-character from the Figma frame
 * (file WINXFW2nTM7zYwd5dGgm1T, node 1748:1161) — see DESIGN-MAP.md.
 */

export interface FooterImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface FooterLink {
  label: string;
  href: string;
}

/** One column of the footer's navigation. A heading may stand on its own. */
export interface FooterColumn {
  heading: FooterLink;
  links?: FooterLink[];
}

export interface FooterNewsletter {
  heading: string;
  placeholder: string;
  consent: string;
}

export interface FooterContent {
  logo: FooterImage;
  columns: FooterColumn[];
  newsletter: FooterNewsletter;
  copyright: string;
  social: FooterLink[];
}
