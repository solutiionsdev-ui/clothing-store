/**
 * The brand name and how the text logo sets it.
 *
 * Kept apart from `siteConfig` (which re-exports these) because the logo is
 * drawn in client components, and `site.ts` pulls in the validated env and zod
 * with it.
 */

/** The project name, used for metadata, the manifest and the footer. */
export const brandName = "Fashion Store";

/**
 * The name as `BrandMark` sets it — one line for the header, footer and
 * icons, two for the hero backdrop and the preloader. A text placeholder
 * until real logo artwork exists.
 */
export const brandWordmark = {
  inline: ["FASHION STORE"],
  stacked: ["FASHION", "STORE"],
} as const;
