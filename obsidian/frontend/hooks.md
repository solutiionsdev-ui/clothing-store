---
tags: [frontend, stable]
updated: 2026-08-27
---

# Catalog — Hooks

Custom hooks in `src/hooks/`, grouped by domain.

## `hooks/animation/` — `#do-not-modify`

The hooks powering the [[animation-system]]. Consume them through the spring
components — don't call them directly unless extending the engine.

| Hook | File | Role |
|------|------|------|
| `useInViewRef` | `use-in-view-ref.ts` | IntersectionObserver ref for viewport detection |
| `useDynamicInView` | `use-dynamic-in-view.ts` | in-view detection with dynamic targets |
| `useLoopInView` | `use-loop-in-view.ts` | in-view tied to a render loop |
| `useProgressTrigger` | `use-progress-trigger.ts` | scroll → 0–1 progress (powers `<SpringTrigger>` / `<ProgressTrigger>`); returns `progress` as a `RefObject<number>` — read `.current` |
| `useSpringTrigger` | `use-spring-trigger.ts` | scroll-driven spring logic |
| `useLoop` | `use-render-loop.ts` | subscribes a callback to the shared rAF ticker (`src/lib/animation/ticker.ts`) |
| `useResizeLoop` | `user-resize-loop.ts` | runs a callback when window width changes (via `useLoop`) |

## `hooks/smooth-scroll/`

| Hook | File | Role |
|------|------|------|
| `useScroll` | `use-scroll.ts` | Zustand store for Lenis + scroll state — see [[smooth-scroll]] |

## `hooks/` (root)

| Hook | File | Role |
|------|------|------|
| `useWindowWidth` / `useWindowHeight` / `useWindowSize` | `use-window-size.ts` | SSR-safe window dimensions — all three share **one** debounced (300 ms) `resize` listener via a `useSyncExternalStore` store |
| `useScrambleText` | `use-scramble-text.ts` | Decode-on-demand text: substitutes characters, then resolves them left to right on the shared ticker. Powers [[components/ui|`<ScrambleText>`]]; content effect, not a spring — ADR-0026 |
| `useAdaptiveGrid` | `use-adaptive-grid.ts` | Scales the root `<html>` font-size up while the viewport exceeds `baseWidth` — powers `<AdaptiveGrid>`, which this project does not mount (ADR-0024); see [[components/common]] |
| `usePointerTilt` | `use-pointer-tilt.ts` | Cursor-position-driven 3D tilt: returns `stage` / `surface` / `layer` styles for a box that leans towards the cursor with a layer standing off its face. `@react-spring/web` directly, because the angle is a continuous function of the pointer rather than a `from`/`to` state — ADR-0039. Mouse only, and silent under `prefers-reduced-motion`; nothing in it re-renders |

> [!note] Shared render loop
> Loop-based hooks (`useLoop`, `useResizeLoop`, `useLoopInView`, the trigger
> hooks) all subscribe to the single app-wide ticker in `src/lib/animation/ticker.ts`
> rather than each starting their own `requestAnimationFrame`. See
> [[animation-system]]. The ticker is **not** `#do-not-modify`.

## Adding a hook

Place it under `hooks/<domain>/`. Data-fetching logic belongs in hooks, not in
presentational components. Use [[templates/hook-note]] to document it here.

## Related

[[animation-system]] · [[smooth-scroll]] · [[utils]]
