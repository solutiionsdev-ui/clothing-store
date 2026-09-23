/**
 * @fileoverview Build-time brand images — the favicon, the Apple touch icon
 * and the Open Graph card — drawn from `siteConfig` with `next/og`.
 *
 * Text placeholders until real logo artwork exists: replace the `icon.tsx`,
 * `apple-icon.tsx` and `opengraph-image.tsx` files in `src/app/` with static
 * images of the same names and these stop being used.
 */

import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

/** The site's ink on its theme colour — the page's own white on black. */
const FOREGROUND = "#ffffff";

/** "Your Online Store" → "YOS" — the only form of the name a favicon can hold. */
const monogram = siteConfig.name
  .split(/\s+/)
  .map((word) => word.charAt(0))
  .join("")
  .toUpperCase();

/** A square icon carrying the monogram, sized to fill most of the tile. */
export function renderBrandIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: siteConfig.themeColor,
          color: FOREGROUND,
          fontSize: size * 0.38,
          fontWeight: 700,
          letterSpacing: size * -0.01,
        }}
      >
        {monogram}
      </div>
    ),
    { width: size, height: size },
  );
}

/** The 1200×630 share card: the stacked name over the site description. */
export function renderBrandCard(width: number, height: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          padding: 80,
          background: siteConfig.themeColor,
          color: FOREGROUND,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 110,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: 6,
          }}
        >
          {siteConfig.wordmark.stacked.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 900,
            fontSize: 26,
            lineHeight: 1.4,
            letterSpacing: 2,
            opacity: 0.7,
          }}
        >
          {siteConfig.description.toUpperCase()}
        </div>
      </div>
    ),
    { width, height },
  );
}
