---
tags: [frontend, components, stable]
updated: 2026-08-20
---

# Catalog — UI Primitives

Files in `src/components/ui/` — design-system primitives: stateless, no provider
dependencies, reusable across features. Placement rules: [[component-conventions]].

## `<ScrambleText>` — `scramble-text.tsx`

A label that decodes from random glyphs — on mount, on hover and on focus. It
carries every piece of copy in the hero ([[figma-to-code]] — the frame itself is
static; the reveal is the motion this starter is for).

`maxSteps` is what keeps a mixed group coherent: the tick rate never changes, so
a 4-character nav item and a 38-character lede share one texture and differ only
in how long they run (~160ms vs ~760ms). Without it the lede would grind through
38 steps and read as a different effect.

```tsx
<Link href={item.href} className="…">
  <ScrambleText>{item.label}</ScrambleText>
</Link>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | — | The real label. Must be a plain string. |
| `className` | `string` | — | Lands on the wrapping `span`. |
| `stepMs` | `number` | `40` | Milliseconds per step. |
| `maxSteps` | `number` | `22` | Step ceiling; a longer label resolves several characters per step. |
| `characters` | `string` | `SCRAMBLE_CHARACTERS` | Glyph pool — uppercase, digits and symbols. |
| `revealDelay` | `number` | — | Decode once on mount, this many ms in. Omit for hover/focus only. |

Backed by [[hooks|`useScrambleText`]], which runs on the shared rAF ticker rather
than its own interval — so a whole cascade of labels still costs one loop.

**The cascade** is staggered from one table, `HERO_REVEAL` in
`src/views/home/hero/hero.motion.ts`: nav → edge markers → lede → CTA → corner
cards. Keep new delays there; a cascade read from six separate files drifts the
moment anyone tunes one number.

> [!tip] Pair it with a spring, don't replace one
> A block that decodes on arrival should still be faded in by `<Spring>`. The
> spring is the motion; the decode is the content. It also hides the one frame
> where the resolved label would otherwise be visible before its own decode
> starts — the component mounts showing the real text, because a random first
> paint would not match the server's.

> [!important] Three things this component is responsible for
> - **The accessible name never churns.** The scrambled glyphs are `aria-hidden`
>   and the real label sits in a visually-hidden copy, so assistive tech reads
>   `ABOUT`, never `AXIGY`. Don't "simplify" that away.
> - **`prefers-reduced-motion` is honoured in the hook**, not by react-spring's
>   `skipAnimation` — this effect never touches a spring, so `<ReducedMotion>`
>   cannot switch it off.
> - **It assumes a monospaced face.** The character count is constant, so nothing
>   reflows; on a proportional face every step would shift the line.

Why this is not `spring-text-engine`: the engine springs a *property* of each
letter, and this effect changes no property — it swaps the characters. See
[[decisions-log]] ADR-0026.

## Related

[[components/common]] · [[components/animation-springs]] · [[component-conventions]] · [[hooks]]
