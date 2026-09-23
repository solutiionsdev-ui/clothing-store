---
tags: [frontend, stable]
updated: 2026-09-23
---

# Catalog — Utilities

Pure helper functions in `src/utils/` (no side effects, unless noted).

## `is-bot.ts`

`isBot(): Promise<boolean>` — **server-only**. Reads the `user-agent` header,
returns `true` for crawlers/audit tools. Used to skip heavy animation for bots.
See [[seo-metadata]].

## `scroll-to.ts`

`scrollTo(id?, immediate?)` — programmatic scroll to an element id (string) or a
numeric position. Integrates with the Lenis [[smooth-scroll|scroll store]];
temporarily disables scroll state during the animation. Has `//if lenis` guards so
the Lenis dependency can be stripped if smooth scroll is removed.

## `math.ts`

| Export | Purpose |
|--------|---------|
| `SpringValues` | `Record<string, string \| number>` — the shape `from`/`to` take on every spring component |
| `transformRange(value, min, max, newMin, newMax)` | remap a value between ranges (clamped) |
| `lerp(start, end, t)` | linear interpolation |
| `debounce(fn, delay)` | debounce helper — **currently unused**; `useWindowSize` has its own inline timer |
| `interpolate(from, to, progress)` | interpolate a whole `SpringValues` bag, preserving CSS units and transform functions (`"10px"`, `"45deg"`, `"translate(10px)"`) |

`interpolate` is the scrub engine's workhorse — [[hooks|useSpringTrigger]] calls it
every frame in `mode="scrub"`. It is the one util inside the animation hot path, so
changes here are felt everywhere.

> [!note] Typed in the 2026-08-18 pass
> These signatures used `any` (a hard rule #7 violation, caught by
> `.claude/scripts/verify.sh` on its first run). `interpolate` now takes and
> returns `SpringValues`, which is exactly what its only caller already declared;
> `extractNumber` takes `unknown` and narrows by `typeof`; `debounce`'s generic
> constraint uses `(...args: never[]) => void`, the strict-safe idiom for
> "any function". No runtime behaviour changed.

## `lvh.ts`

CSS-string builders for viewport-height units with fallbacks
(`vh` → `lvh` → `calc(var(--vh) …)`): `heightLvh`, `minHeightLvh`, `marginTopLvh`,
`marginBottomLvh`. Solves mobile-browser viewport-height inconsistencies.

## `animation/coords.ts`

Element-coordinate helpers — `getElementCoords`, `getScrollCoordsFromElement` —
used internally by the scroll/animation system. Marked `@ts-nocheck`. `#do-not-modify`

## `seo/generate-page-metadata.ts`

`generateMetadata(props?)` — shared page-`Metadata` builder. `generateViewport()`
— the `Viewport` export (carries `themeColor`). See [[seo-metadata]].

## `seo/structured-data.ts`

`getSiteStructuredData()` — builds the `Organization` + `WebSite` JSON-LD graph
rendered by the root layout. See [[seo-metadata]].

## `seo/brand-image.tsx`

`renderBrandIcon(size)` — a square monogram icon; `renderBrandCard(width,
height)` — the share card (stacked name over the description). Both return a
`next/og` `ImageResponse` drawn from `siteConfig`, and back the
`icon.tsx`, `apple-icon.tsx` and `opengraph-image.tsx` file conventions in
`src/app/`. Placeholders until real artwork exists. See [[seo-metadata]] and
[[decisions-log]] ADR-0048.

> [!note] Brand name
> The name and how the text logo sets it live in `src/lib/brand.ts`
> (`brandName`, `brandWordmark`), re-exported by `siteConfig`. Kept apart so
> client components (`BrandMark`) can read it without pulling in the validated
> env and zod.

## Adding a util

Keep utilities **pure** and side-effect-free (server-only ones like `isBot` are the
exception — note it clearly). Group by domain under `utils/<domain>/`.

## Related

[[hooks]] · [[seo-metadata]] · [[smooth-scroll]]
