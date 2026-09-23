/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. Update the placeholder values per project.
 */
import { publicEnv } from "@/env";

export const siteConfig = {
  /**
   * The brand as the site itself spells it — the footer's copyright line and
   * the wordmark under the logo both read ARTEFAKT. "Get Layers" is the Figma
   * file, not the marque.
   */
  name: "ARTEFAKT",
  /**
   * Drawn from the site's own copy: the collections standfirst says what the
   * range is, the technology screen says what it is for.
   */
  description:
    "Technical jackets for changing weather, movement and everyday use. Engineered to endure — weather-resistant shells, thermal insulation and an oversized fit.",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url: publicEnv.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Default Open Graph / Twitter share image (path under `public/`). */
  ogImage: "/open-graph.png",
  /**
   * **Not set on purpose.** Inventing a handle risks pointing the card's
   * attribution at a stranger's account; fill this in with the real one.
   */
  twitterHandle: undefined as string | undefined,
  author: "ARTEFAKT",
  /** Browser theme-color (address bar / PWA). */
  themeColor: "#000000",
} as const;
