---
tags: [frontend, design-system, stable]
updated: 2026-08-27
---

# Design System — Tailwind v4

Styling uses **Tailwind CSS v4**, configured entirely in CSS. There is **no
`tailwind.config.js`**. ADR: [[decisions-log]] ADR-0004.

## Where config lives

`src/app/globals.css` is the single config file. Extra CSS layers can be split
into `src/style/index.css` and imported.

The import is scoped: `@import "tailwindcss" source("../")` limits class
detection to `src/`. Without it Tailwind v4 auto-scans the whole repo, so class
*patterns* written in documentation — `duration-[var(--duration-*)]` in the vault
and in `.claude/` — are parsed as real candidates and emit CSS build warnings.
Documentation is not a source of utilities.

## Token naming convention

> [!important] This convention is **strict and portable by design**
> It is intended to be identical in every project built from this starter, so an
> agent or developer moving between them can predict a token's name without
> reading the file. Deviating in one project defeats the point. ADR: [[decisions-log]] ADR-0015.

Tokens are organised in **three tiers**. Each tier may only reference the tier
below it, and **no tier may be skipped** — semantic tokens are what make a
re-theme or a rebrand a one-line change instead of a find-and-replace.

| Tier | Grammar | Lives in | Example | Usable in markup? |
|------|---------|----------|---------|-------------------|
| **1 — Primitive** | `--raw-<category>-<name>[-<shade>]` | `:root` | `--raw-color-neutral-950` | ❌ never |
| **2 — Semantic** | `--<role>[-<variant>][-<state>]` | `:root` | `--background`, `--action-primary-hover` | ❌ only via its Tier-2 binding |
| **3 — Component** | `--<tw-namespace>-<component>[-<property>]` | `@theme inline` | `--radius-button` | ✅ `rounded-button` |

Plus the **theme binding**, which is what actually creates the utilities:

```css
@theme inline {
  --color-background: var(--background);   /* --<tw-namespace>-<role>: var(--<role>) */
}
```

### The rules

1. **Only Tier 1 contains literals.** A hex, px, or ms value anywhere else is a bug.
2. **Tier 2 names describe purpose, never appearance.** `--action-primary`, not
   `--blue`. `--surface-raised`, not `--grey-light`. If renaming the colour would
   force renaming the token, the name is wrong.
3. **Tier 2 is the themeable layer.** Dark mode and any runtime theming override
   Tier 2 tokens — never Tier 1, never a `@theme` entry.
4. **Every `@theme inline` entry is exactly `--<namespace>-<role>: var(--<role>)`.**
   No literals, no `calc()`, no skipping to `var(--raw-*)`.
5. **kebab-case, singular, unabbreviated.** `--raw-color-neutral-950`, not
   `--raw-clr-neutrals-950`. State goes last: `--action-primary-hover`.
6. **Tier 3 is rare.** Per ADR-0012 a repeated pattern is a React component, not a
   token set. Reach for a component token only when the same value must be shared
   across components that cannot import each other.

### Why Tier 2 is separate from `@theme`

`@theme inline` **inlines** each `var()` into the generated utility. That is what
makes overriding the Tier 2 token in a `prefers-color-scheme` block cascade into
every `bg-background` on the page. Binding a literal — or a `var(--raw-*)` —
directly in `@theme` freezes the value at build time and silently breaks theming.
The indirection is load-bearing, not ceremony.

### Namespaces that generate utilities

A token only becomes a utility if its prefix is a Tailwind namespace. Verified
against `tailwindcss` v4.3.3 (the installed version):

| Namespace | Generated utilities |
|-----------|--------------------|
| `--color-*` | `bg-*`, `text-*`, `border-*`, … |
| `--spacing-*` | `p-*`, `m-*`, `gap-*`, … |
| `--radius-*` | `rounded-*` |
| `--leading-*` | `leading-*` |
| `--tracking-*` | `tracking-*` |
| `--text-*` | `text-*` (size) |
| `--font-*` | `font-*` |
| `--ease-*` | `ease-*` |
| `--shadow-*` / `--blur-*` / `--animate-*` | `shadow-*` / `blur-*` / `animate-*` |
| `--breakpoint-*` / `--container-*` | `sm:` … / `max-w-*` |

> [!warning] There is **no `--duration-*` namespace** in Tailwind v4
> `--duration-fast` in `@theme` generates nothing and is not even emitted — a
> `duration-fast` class silently does nothing. Durations therefore stay **Tier 2
> only** and are consumed as `duration-[var(--duration-fast)]`. (Guides that list
> `--duration-*` alongside `--ease-*` are wrong for v4; `--ease-*` *is* real.)

If a value's prefix is not in that table, it is not a utility — either pick the
right namespace or use it via `var()` in an arbitrary value.

> [!important] The token rule
> **Never** hardcode hex values, pixel spacing, or named colours in `className` or
> inline styles. If a value doesn't exist as a token, **add it to `globals.css`
> first** — as a Tier 1 primitive plus the Tier 2 semantic token that names its
> purpose — with a comment noting where it came from (e.g. a Figma frame).

## CSS layers

Every custom style goes inside a layer — never outside one:

```css
@layer base {        /* element resets & defaults: h1, p, a … */ }
@layer components {  /* pseudo-elements & 3rd-party overrides only — see below */ }
@layer utilities {   /* single-purpose helpers: .scrollbar-none … */ }
```

## Where a style goes (ADR-0012)

`globals.css` is **not** a place to park component styles — it holds tokens and
base resets and stays a few hundred lines forever. Follow this order; the first
match wins:

| Situation | Goes where |
|-----------|-----------|
| One-off styling | Tailwind utilities in `className` — nothing in CSS |
| Repeated pattern with markup / structure / props | a **React component** in `components/ui/` |
| Repeated *pure-utility* combo, no structure | a Tailwind v4 `@utility` |
| Pseudo-elements, 3rd-party DOM overrides, complex selectors | `@layer components` — the genuine exceptions |
| A new colour / spacing / radius value | a **token** in `:root` + `@theme` |

> [!important] The default answer to "this looks repeated" is a **React
> component**, not a CSS class. An eyebrow label with a `::before` dot is an
> `<Eyebrow>` component — not a `.label-eyebrow` global class. `@layer
> components` is for what utilities and components genuinely *cannot* express.

There are **no CSS Modules** in this project — utilities + components cover
every case (motion is spring-based, so there are no keyframes to co-locate).

## Current theme state

The starter ships a **minimal** theme on purpose — the convention is the
deliverable, not a palette. It defines:

- **Tier 1:** a small neutral ramp (`--raw-color-white`, `--raw-color-neutral-100/900/950`)
  and two durations (`--raw-duration-fast/normal`).
- **Tier 2:** `--background`, `--foreground`, `--duration-fast`, `--duration-normal`,
  with a dark-mode override via `@media (prefers-color-scheme: dark)`.
- **Bindings:** `--color-background`, `--color-foreground`, `--font-sans`,
  plus `--leading-display` (1.1 — the clip floor for [[text-engine]]) and
  `--ease-entrance`.

There is deliberately **no brand palette**. Add one per project as
`--raw-color-brand-*` primitives plus the semantic roles that name their purpose.

### This project's additions

The hero frame added a `--hero-*` role set — `surface`, `surface-lattice`,
`content`, `rule`, a 12/18/20px type ramp, the 0.9 and 1.1 leadings, and the
−0.02em tracking. These roles are **deliberately not overridden** in the
`prefers-color-scheme` block: the frame is a fixed dark canvas by design.

`@utility hero-lattice` draws the frame's background grid (10px pitch, 2px gap,
`--hero-surface-lattice` cells). Figma exported that node empty, so the pattern
was rebuilt from pixels sampled off the reference render — the geometry lives in
tokens, not in the utility. It is a `@utility` rather than a component because it
is pure background with no structure, and repeating gradients cannot be expressed
as utilities in `className`.

**The page does not use it, and no longer uses `hero-lattice-panel` either.**
The lattice is still drawn exactly once for the whole page, but as **two
elements** rather than one painted box (ADR-0047): `hero-lattice-beam`, a
`position: fixed` layer carrying the three pointer-highlight gradients, then
`hero-lattice-bars`, a `position: absolute` layer carrying the grid, then the
content. The order is the point — the bars cover the light and quantise it into
cells, so the highlight reads as the grid brightening rather than as a lamp
shining across it. Two grids anchored to different things beat against each
other on every scroll (ADR-0036), and a single grid on a *fixed* layer stands
still while the page moves (ADR-0038), so the grid stays anchored to the
document and the light to the viewport — as before.

**Why two elements and not one utility.** `hero-lattice-panel` gets that
anchoring from `background-attachment: fixed`, and a fixed background cannot be
scroll-composited: it repaints the element's whole visible area every frame. On
a card that is a card. On the page shell it was the entire viewport for the
length of the document, and it held every content section at half the display's
refresh rate. **`hero-lattice-panel` is still exactly right for a card** — do
not copy the split onto the panels, and do not put the panel back on the shell.

`hero-lattice` itself is for surfaces the page's own background cannot reach,
such as the preloader.

ADR-0036 also adds `--hero-lattice-offset` (the half-gap bleed) and rounds pitch,
gap and offset to whole pixels behind an `@supports (width: round(1px, 1px))`
guard: use the token for the bleed rather than `calc(gap / -2)`, or the first bar
lands on a half pixel.

## Motion: springs first, CSS for trivial state

Hard rule #1 stands — **all real motion is spring-based** ([[animation-system]]).
There is one narrow exception, added because wiring a spring for a colour fade on
hover costs a client component and a hook for no benefit. ADR: [[decisions-log]] ADR-0014.

**CSS transitions are allowed only for simple, discrete state changes:**

| Allowed (CSS) | Not allowed (use a spring) |
|---------------|---------------------------|
| `hover:` / `focus-visible:` / `active:` colour, `opacity`, `border-color`, underline | anything scroll-driven |
| Small decorative nudges (an arrow shifting a few px on hover) | enter/reveal animations → `<Inview>` |
| | text animation → [[text-engine]] |
| | layout/size changes, orchestrated or staggered sequences |
| | anything that must be interruptible or physical |

Conditions — all three, or it is a spring:

1. **Token-backed timing.** Duration and easing come from tokens — never raw
   values: `transition-colors duration-[var(--duration-fast)] ease-entrance`.
2. **`transition-*` only.** `@keyframes` remain **banned** outright — an
   animation long enough to need keyframes is long enough to deserve a spring.
3. **Utilities only.** The transition lives in `className`, not in a CSS file.

```tsx
<a className="text-foreground/70 transition-colors duration-[var(--duration-fast)]
              ease-entrance hover:text-foreground">
  Contact
</a>
```

If you are reaching past this list, you want `<Hover>` — see
[[components/animation-springs]].

## Typography

Two faces, both loaded in `src/app/layout.tsx` and exposed as CSS variables on
`<body>`:

| Face | Source | Variable | Binding | Used by |
|------|--------|----------|---------|---------|
| **Onest** | `next/font/google` | `--font-onest` | `--font-sans` | Site default |
| **IBM 3270** | `next/font/local` (`src/app/fonts/3270-Regular.otf`) | `--font-3270` | `--font-mono` | The Get Layers hero frame |

IBM 3270 is monospaced at an **0.54em** advance, which two things depend on:

- The decode effect ([[components/ui|`<ScrambleText>`]]) only holds the line
  still because every glyph is the same width — on a proportional face each
  substitution would reflow the text.
- `TextEngine` drops the spaces between words and re-creates them with
  `column-gap`, so copy run through the engine has to pass that advance
  explicitly; its 0.3em default sets the copy tighter than the frame, and
  `"inherit"` resolves to `normal` on a flex container, which is no gap at all.
  See [[text-engine]].

## Styling rules

- Use utilities in JSX `className`; keep class strings short and readable.
- Extract a repeated pattern to a **React component** — not a `@layer
  components` class. See *Where a style goes* above (ADR-0012).
- Mobile-first responsive: `sm:` / `md:` / `lg:` / `xl:` prefixes.
- Dark mode: `dark:` prefix or token overrides in a `prefers-color-scheme` block.
- No inline `style` except for dynamic values (e.g. spring-animated values).
- Motion is spring-based; CSS `transition-*` only for the narrow hover/focus case
  above — never `@keyframes`.

## Related

[[component-conventions]] · [[animation-system]] · [[new-page]]
