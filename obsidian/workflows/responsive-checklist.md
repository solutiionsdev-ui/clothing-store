---
tags: [workflow, responsive, qa]
updated: 2026-08-21
---

# Responsive checklist

What to look at, why that width and not another, and what has already been
verified by measurement so it does not need looking at again.

Related: [[decisions-log#ADR-0032]] (two scaling regimes),
[[decisions-log#ADR-0034]] (the frame is for landscape), [[design-system]].

---

## The only four boundaries that exist

`lg:` is used 246 times, `sm:` 35, `md:` 5, `xl:` never. So there are four
places where anything changes, and everything between them is a continuous
scale — nothing to test in the gaps.

| boundary | what changes | check as |
|---|---|---|
| **1024 + landscape** | **The regime.** Flow below, the 1440 frame at and above. Not a size step — two different designs. | **1023×800 and 1024×768 as a pair** |
| **640** | Headline 40→50, lede / body / marker steps, collections 1→2 columns, product box 4/5→4/3 | 639 and 640 |
| **768** | Footer columns 2→4. Nothing else. | 767 and 768 |
| **1440** | The frame at 1:1. Wider than this it scales up, unbounded. | 1440, then 1920 or 2560 |

## The rules that caused most of the bugs

**0. The frame is 1.8:1 and most screens are not.** The leftover height goes
either into the margins or into the space between blocks — never neither. Decide
per screen by what it is anchored to: a screen with nothing anchored to the top
can fill the viewport, a screen carrying a top-and-bottom pair needs a fixed
800-unit box and a section cut to match. Measure the result as *share of a
screen*, not in pixels, or you cannot compare two widths at all.

**1. The composition is 800 frame units tall; the screen is not.** Each frame
screen holds an explicit centred 800-unit box. Position frame children against
*that*, never against the section — against the section, all the leftover height
falls below them and the composition splits in half.

**2. Anything sized in pixels inside the frame is a bug waiting for a width that
is not 1440.** The frame's scale is exactly 1 there, so px and frame units
coincide and mistakes hide. Check by measuring an element at two widths: the
ratio must equal the root font-size ratio.

**A frame screen is 800 frame units tall, never the viewport's height.** They are
only the same on a 1.8:1 screen. Anywhere else, anything anchored to the frame's
top and anything anchored to the section's bottom drift apart by the difference.

If a composition looks right at 1440×800 and wrong anywhere else, check this
first — it has been the cause three times.

## Height matters as much as width

Sections take the larger of `h-lvh` and 800 *frame units*, and those two scale
differently — the units track the root font-size, the viewport height does not.
**This is what caused the clipped-jacket bug**: a clearance computed at 1440×800
had vanished by 1920×900.

So never check a width at one height. The shapes that actually differ:

- **portrait tablet** — 1024×1366. Since ADR-0034 this takes the flow layout.
- **short laptop** — 1440×800, 1366×768.
- **tall window** — 1440×1600, which also takes flow.
- **wide and short** — 2560×1080.

## Already verified by measurement — do not redo

| what | where | result |
|---|---|---|
| layout, type, overflow | 360, 390, 430, 639, 640, 768, 820, 1023, 1024, 1200, 1440, 1920, 2560 | no sideways scroll, nothing off-screen, no clipped text |
| product seams | twelve sizes, 1280×720 → 2560×1440 | all soft, 0–9% residual at the edge |
| touch — targets, taps, gestures | 360, 390, 430, 768, 820, 1024, with real touch emulation | 30 of 31 controls ≥30×30 |
| console, exceptions, network, DevTools issues | 360 → 2560 | clean but for the known `/privacy-policy` 404 |
| the 1440 frame against its recorded coordinates | every change | exact |

## What a script cannot judge — this is your list

1. **Both sides of 1024**, side by side. The machine says neither overflows;
   only you can say whether the two designs feel like the same site.
2. **A real phone in the hand.** Fill-rate and motion smoothness do not show up
   in a profiler. Look at the hero's turn and the technology walk.
3. **A real tablet, rotated both ways** — it now changes regime on rotation.
4. **The technology walk's pace.** `LAYER_STEP` is 0.4; the floor before cards
   start skipping under a trackpad flick is about 0.35.
5. **1024×768 in frame mode** — the smallest type on the site (body 12.8px).
   Readable, or too tight?

## Traps that have already cost time here

- `mobile: true` in device emulation does **not** change the `hover` / `pointer`
  media features. An audit that only resizes is measuring a desktop.
- `getBoundingClientRect` cannot see a `::before`, so it under-reports any
  control carrying `tap-area`. Probe the hit area instead.
- `scrollWidth` on a control with `tap-area` is inflated by the expander, not by
  text being cut. Measure text with a `Range`.
- A clearance computed at one viewport is not a clearance. Measure across shapes.
