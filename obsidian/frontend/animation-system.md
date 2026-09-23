---
tags: [frontend, animation, stable, do-not-modify]
updated: 2026-07-17
---

# Animation System

The core of this starter. **Every motion is spring-based** via `@react-spring/web`.
CSS keyframes and `framer-motion` are **banned**. ADR: [[decisions-log]] ADR-0002.

> [!note] One narrow CSS exception (ADR-0014)
> CSS `transition-*` is allowed for **simple, discrete state changes only** —
> hover/focus colour, opacity, border, underline, small decorative nudges — with
> token-backed timing (`duration-[var(--duration-fast)] ease-entrance`). Anything
> scroll-driven, revealing, layout-affecting, staggered, or interruptible is a
> spring. `@keyframes` stay banned. Rules and examples: [[design-system#Motion: springs first, CSS for trivial state]].

> [!warning] #do-not-modify
> `src/components/animation/springs/` and `src/hooks/animation/` are the animation
> engine. Treat them as a vendored library — **consume them, don't edit them
> without explicit sign-off**. One authorized performance refactor has been made;
> see [[decisions-log]] ADR-0009.

## Shared render loop (ticker)

Every per-frame animation hook subscribes to **one** app-wide
`requestAnimationFrame` loop — `src/lib/animation/ticker.ts` (`subscribeToTicker`).
A page with N scroll-driven components runs **one** rAF, not N. The loop is
reference-counted: it starts on the first subscriber and stops when the last one
unmounts, so an idle page costs nothing.

- `useLoop` (and everything built on it — `useLoopInView`, `useResizeLoop`,
  `useSpringTrigger`, `useProgressTrigger`, `<AdaptiveGrid>`) goes through the
  ticker. Each subscriber keeps its own `framerate` throttle.
- Window dimensions (`useWindowWidth` / `useWindowHeight` / `useWindowSize`)
  share **one** debounced `resize` listener via a `useSyncExternalStore` store.

`src/lib/animation/ticker.ts` is **not** `#do-not-modify` — it is the supported
extension point for loop-based animation.

## The components

All live in `src/components/animation/springs/` and accept a `tag` prop so they
render the semantically correct HTML element. Full catalog:
[[components/animation-springs]].

| Component | Trigger | Use for |
|-----------|---------|---------|
| `<Inview>` | element enters viewport | fade/slide-in reveals |
| `<Spring>` | mount / enabled flag | unconditional spring animation |
| `<SpringTrigger>` | scroll progress | parallax, scrub, scroll-toggled motion |
| `<ProgressTrigger>` | scroll progress | raw 0–1 progress callback (no animation) |
| `<Hover>` | mouse enter/leave | hover effects (off on mobile) |
| `<Handle>` | content change | smooth enter/exit on children swap |
| `<AnimatedVarTextTag>` | — | low-level `animated[tag]` primitive |

For **text**, do not use these — use [[text-engine]].

## Choosing the right primitive

| Need | Component |
|------|-----------|
| Element fades/slides in when scrolled into view | `<Inview from={} to={} mode="once">` |
| Element moves continuously with scroll (parallax) | `<SpringTrigger mode="scrub">` |
| Element snaps to a state at a scroll point | `<SpringTrigger mode="toggle">` |
| Mouse hover animation — physical, or animating transforms | `<Hover from={} to={}>` |
| Hover/focus **colour, opacity or border** change only | plain CSS `transition-*` (ADR-0014) — no component |
| Just a 0–1 scroll progress value | `<ProgressTrigger onChange={}>` |
| Heading / copy reveal | `<TextEngine>` → [[text-engine]] |

## Common props

| Prop | Meaning |
|------|---------|
| `tag` | HTML element to render (`section`, `h1`, `div`…) — use the semantic one |
| `from` / `to` | spring start / end states — animatable CSS values only |
| `config` | `@react-spring/web` `SpringConfig` (`tension`, `friction`, …) |
| `mode` | trigger behaviour — varies per component (see below) |
| `delayIn` / `delayOut` | ms delay before enter / exit |
| `disableOnMobile` | respect the global mobile-disable config |
| `className` / `innerClassName` | Tailwind classes (kept separate from spring `style`) |

> Never pass Tailwind class names into `from`/`to`. Spring values are numbers or
> unit strings; classes go on `className`.

## Modes

- **`<Inview>` / `<Spring>`:** `"once"` (play once, stay), `"always"` (reverse on
  leave), `"forward"` (only on downward scroll).
- **`<SpringTrigger>`:** `"scrub"` (interpolate with scroll), `"toggle"` (snap at
  trigger point).

## Trigger positions (`start` / `end`)

Scroll components use a GSAP-style `TriggerPos` string:
`"<element-edge> <viewport-edge>"`, e.g. `"top bottom"`, `"center center"`,
`"bottom top-=100"`. Full grammar in [[text-engine]] (shared format).

## Global config

`src/lib/springs/config.ts`:

```ts
export const springsConfig = {
  mobileWidth: 768,
  disableOnMobile: {
    hover: true,        // always — no hover on mobile
    inview: false,
    spring: false,
    springtrigger: false,
  },
};
```

`isMobileDisabled(value, viewportWidth?)` checks the viewport against `mobileWidth`.
Pass a React-tracked width (e.g. from `useWindowWidth()`) as the second argument so
the check re-evaluates on resize; it falls back to `window.innerWidth` when omitted.
Components opt in per-instance via `disableOnMobile`. **Never disable animation
globally** — toggle per component when an animation hurts mobile UX.

## Underlying hooks

The components are built on `src/hooks/animation/` — also `#do-not-modify`. See
[[hooks]] for the catalog.

## When a reveal fires (`lib/animation/reveal.ts`)

Every below-the-fold reveal — `Inview` in `mode="once"` and every
`ScrambleText revealInView` — goes through `observeReveal`, never through a bare
`IntersectionObserver`. It runs **two observers and fires on whichever comes
first**:

| observer | catches |
|---|---|
| `rootMargin: "0px 0px -64px 0px"` | the ordinary case — something scrolling up into view, held back so the animation is not over before the element is readable |
| `threshold: 1` | anything already *fully* on screen, which has no business still being hidden |

> [!warning] The hold-back alone strands bottom-anchored content
> A negative bottom margin means an element that comes to rest **closer to the
> viewport's bottom edge than the margin is deep never intersects at all** — so
> it never reveals, and the text is simply missing from the page. This project
> hit it three times before the second observer existed: the details row 05
> (162 against a 160 threshold), the details CTA (86 against 96), and the
> footer's entire bottom row (40px clearance against the 64px band), which read
> as "the footer lost some text".
>
> It cannot be tuned away: a margin small enough to clear every bottom anchor is
> too small to hold anything back. The second observer is the fix, and it makes
> the failure structurally impossible rather than merely unlikely.

Symptom to recognise: content that is present in the DOM, has correct
coordinates, and is stuck at `opacity: 0` — measure its distance to the document
bottom before suspecting the spring.

## Related

[[text-engine]] · [[components/animation-springs]] · [[data-flow]] · [[new-page]]
