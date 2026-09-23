---
tags: [meta, changelog]
updated: 2026-08-28
---

# Changelog

Chronological log of notable changes to **this project**. Newest first.
Human-curated — not a mirror of `git log`.

Log a change here when it would surprise someone returning in six months: a new
dependency, a new route or section, a convention bent, a bug whose cause is worth
remembering. Routine commits do not need an entry.

For *why* the conventions are what they are, see [[decisions-log]].

---

## 2026-08-28 (performance, 2) — The page's lattice is two layers; the whole page was at half rate

Reported as "the collections cards lag". The cards are not the cause: the page
shell painted its pointer highlight with `background-attachment: fixed`, which
cannot be scroll-composited and so repainted the whole viewport every frame, all
the way down the document. It held **every** content section at exactly half the
display's refresh rate. See [[decisions-log]] ADR-0047.

**Changed**
- `src/views/home/index.tsx` — the shell wears `hero-lattice-shell` (colour
  only) and carries two `aria-hidden` layers: `hero-lattice-beam` before
  `hero-lattice-bars`, both before the content. **That order is the paint order
  now** — the bars must cover the light.
- `globals.css` — new `hero-lattice-shell` / `hero-lattice-beam` /
  `hero-lattice-bars`. `hero-lattice-panel` is untouched and still what a card
  wears; ADR-0038 still governs those.
- The beam is `display: none` under `(hover: none) and (pointer: coarse)`, the
  query `PointerField` itself bails on.

**Measured** — 9s sweep of the page, production build, 4× CPU throttle:
frames delivered **678 → 755**; details median frame **16.1 → 8.6ms**;
collections **15.9 → 9.4ms**. Pixel-identical at collections (max channel
delta 3); the residual elsewhere is the hero and FAQ 3D scenes at a different
turntable phase, which a repeated same-build capture reproduces.

**Watch out**
- **No static direct child of the shell.** Both layers are positioned at
  `z-index: auto`, so they paint above any non-positioned sibling regardless of
  tree order, and content would end up under the grid.
- The card tilt was the reported suspect and is innocent — forcing `perspective`
  and `preserve-3d` off, or hiding the three inactive photographs per card,
  changes nothing outside run-to-run noise. There is no `will-change` on them.
- 16.7ms is not a passing grade on a 120Hz panel. ADR-0038 measured this exact
  cost, read it as 60fps, and accepted it.

---

## 2026-08-28 (performance) — The reel is a canvas over stills; the video is gone

Three ADRs tuned the video scrub to provably optimal seeking and it still
juddered, because a decoder can only present whole pictures and the scroll does
not land on picture boundaries. Blending two pre-decoded stills does. The
picture now changes on **99.5% of display frames against 51.5%** — frame timing
is identical either way, which is the point. See [[decisions-log]] ADR-0046.

**Changed**
- `technology-reel.tsx` — a `<canvas>` blending two `ImageBitmap`s per frame,
  not a `<video>` whose `currentTime` is written. `SOURCE_FPS` and `CLIP_TAIL`
  are gone; the frame grid and the tail trim are properties of the asset now.
- New: `public/assets/technology/stack-frames/` — **61 × 768px** (`hi`) and
  **41 × 512px** (`lo`), keyed WebP with a real alpha channel. 2.77MB and
  1.18MB, against the clip's 5.44MB.
- New: `.claude/scripts/video/frames.mjs` — builds both tiers. This machine has
  `ffmpeg` now; the two Swift tools stay for the mp4 itself.
- The SVG `feColorMatrix` key is baked into the frames at export. The filter
  remains for the poster only, and the two are the same numbers in two places.
- `TechnologyReel` is now just `TechnologyImage`: `src` is the poster, and the
  frames are addressed by index rather than named in content.
- `technology-stack.mp4` is no longer fetched by anything. It stays in the repo
  because `frames.mjs` reads it.

**Watch out**
- **Resident memory is the constraint, not download.** A decoded `ImageBitmap`
  costs `side² × 4` whatever it weighed on the wire — the desktop set is 137MB.
  121 frames at 1024px would be 507MB and would kill a tab.
- The tier is picked by **viewport width, not DPR**: a phone at DPR 3 wants more
  backing store than the desktop box and has far less room for it.
- The blend must be additive on a cleared canvas
  (`globalCompositeOperation = "lighter"`). Plain `source-over` at `globalAlpha`
  is not a cross-dissolve — the old position never leaves and the motion smears.

---

## 2026-08-27 (performance, 3) — The reel is 48 fps now; the judder was the frame count

The remaining "sometimes smooth, sometimes jerky" was 3:2 pulldown judder, not a
bug. See [[decisions-log]] ADR-0045.

**Changed**
- `public/assets/technology/technology-stack.mp4` — **242 frames at 48 fps**,
  every second one a 50/50 blend of its neighbours. 1280², all-intra, 9 Mbps,
  3.61MB → **5.44MB**.
- `SOURCE_FPS` 24 → 48 in `technology-reel.tsx`. **These two must move together.**
- New: `.claude/scripts/video/` — the two AVFoundation tools that make the clip,
  plus how to verify one. There is no `ffmpeg` or Homebrew on this machine.

**Measured** — presented frames via `requestVideoFrameCallback`, production build
- picture updates: 21 → **42/s** (slow scroll), 35 → **60/s** (ordinary), so at
  ordinary and fast speeds a new picture lands on *every* display frame
- irregular hold at 3000ms traversal: 59% → **1%**; at 2000ms: 29% → **0%**
- full page unchanged: max frame 17.7ms, zero long tasks

**Worth remembering**
- **The scrub code was already optimal before this** — every distinct picture
  presented, in order, no repeats, no backward steps. If the reel ever looks
  jerky again, count the clip's frames before touching the ticker.
- **Why it was intermittent:** above ~1000 px/s of scroll the same code is
  perfect, because every display frame gets a new picture. The bad zone is
  ordinary reading speed.
- Blended frames measure 13% softer than real ones. That is the trade that was
  bought, and it reads as motion blur.

---

## 2026-08-27 (performance, 2) — The reel's judder was the follower, not the decoder

The re-encode in the previous entry fixed the *freeze*; the sequence still read
as jerky. It was two bugs in the ticker and one constant that the re-encode had
made obsolete. See [[decisions-log]] ADR-0044.

**Changed** — `src/views/home/technology/technology-reel.tsx`
- The playhead now integrates **above** the `video.seeking` guard. It was below
  it, so the follower only stepped on the 22% of frames the decoder was idle for.
- Seeks are quantised to the clip's frame grid (`SOURCE_FPS = 24`). The old
  `SEEK_EPSILON = 1/60` was finer than a source frame (`1/24`), so most requests
  were decodes that could not change a pixel.
- `SEEK_FOLLOW` 0.18 → 0.45, rebased against the real frame delta so a 120Hz
  panel tracks like a 60Hz one.

**Measured** (production, real wheel through Lenis, M1 @ 1440×900)
- video in `seeking` state: **78% → 21%** of frames
- longest run with an unchanged picture: **11 → 3** frames (median 1, p95 2)
- full-page traversal: 60.6fps, max frame **17.7ms**, zero frames over 25ms

**Worth remembering**
- **The SVG key filter is not the bottleneck.** Measured three ways — filter on,
  `filter: none`, video hidden — frame timings were identical. Don't spend
  another afternoon on it.
- **The decoder is not the bottleneck either**, now that it is all-intra: it
  sustains 115 seeks/s and a traversal asks for ~42. If the reel ever judders
  again, suspect the follower and the frame grid before the asset.

---

## 2026-08-27 (performance) — The scroll freeze was the reel's keyframes

Followed [[optimize-3d-scene]]. Baseline and after both measured on a
**production build** (§0), M1 / 8 cores, 1440×900, walking the whole page.

**The freeze was not the WebGL scene.** Steady state was already 60fps at every
scroll position, in dev and production alike — the tiering, DPR ceilings,
in-view render gate and shared ticker were all doing their job. Two things were
not.

**Changed**
- `public/assets/technology/technology-stack.mp4` re-encoded **all-intra H.264**,
  1280×1280. Was HEVC, 1440×1440, 19.8 Mbps, **one keyframe for 121 frames** — so
  every scrub seek decoded the clip from frame 0. See [[decisions-log]] ADR-0042.
  - scrub seek **96ms avg / 175ms worst → 8.4ms avg / 10.8ms worst**
  - file **11.93MB → 3.61MB**
  - and it now plays in Firefox and Chrome-on-Windows, which HEVC did not
- `src/components/common/near-viewport.tsx` mounts through
  `requestIdleCallback` instead of inside the `IntersectionObserver` callback.
  The FAQ renderer's ~100ms construction was landing in a scroll frame. See
  [[decisions-log]] ADR-0043.
  - worst frame over a full traversal **117–149ms → 48ms**; p99 18.8ms;
    **no frame over 50ms** where there were two

**Worth remembering**
- **Verify a scrubbed clip by parsing its container, not by watching it.** No
  `stss` box = every frame a keyframe. An `stss` with a small count is the freeze
  coming back, and it looks fine on a fast desktop until you scrub.
- `hero-wordmark-dark.png` (2.5MB) is referenced **only in a comment** in
  `hero-stage.tsx` — no code loads it. Dead weight in the repo; it costs visitors
  nothing because it is never requested.
- `src/utils/is-bot.ts` exists but **nothing calls it** — §1 of
  [[optimize-3d-scene]] (never ship three.js to a crawler) is unimplemented.
  Wiring it means `headers()`, which turns `/` from `○` static into `ƒ` dynamic.
  That is a trade-off for a person to make, not a tuning pass; the skill's
  alternative is a middleware rewrite to a `/poster` route.
- `.claude/scripts/verify.sh` reports one **false** `explicit any` FAIL: the
  regex matches "**any**where" in a prose comment at `src/lib/text/tie.ts:17`.
  Pre-existing, unrelated to any code change.

---

## 2026-08-27 (final) — Two trims on the release ramp and the FAQ approach

**λ is not only the ramp, it is the drop.** The release lag's time constant is
also the largest distance a pinned element can fall behind, and at a third of a
viewport that was too much of both: the product read as sliding out of its own
screen, and the clip — which ends 45 units above its stage's bottom edge with
nothing clipping it — hung a sheet of the stack over the section below. At 0.15
the lag is bounded at 114px on a 760-tall window and the seam is untouched: the
derivative at the release is 1 whatever λ is. Measured after: the clip settles
at 113px, and 0 at the seam itself.

**The FAQ garment turns more and travels less** — 110 units of shift against 28
degrees, where the two started even at 240 and 14 and read as a photograph being
pushed in from the edge. The rotation also feeds the sleeves, which trail
angular velocity: twice as much of it over half the distance.

---

## 2026-08-27 (later still) — The thing that was slamming was the pin, not the animation

**Both "it slams at the end" reports had the same cause, and it was not the
easing.** The product's travel and the clip's scrub had each already been eased
out; what was left was the **stage**. A `position: sticky` element's apparent
velocity is zero while it holds and the page's own the frame after it releases —
a step in velocity, which is exactly what the eye reads as something planting
itself. Both now lag the page as they un-pin, by `λ(1 − e^(−x/λ))` of the
distance scrolled past the release, λ at a third of a viewport. That curve's
derivative at the seam is 1, so they start the release perfectly still and ease
up to the page's speed with nothing left to feel. Verified: at 900px past the
release the clip's offset is 257px against a predicted 257.
[[decisions-log|ADR-0041]], which also records the trap it cost an hour to find
— a transformed element's own rect includes the transform, so measuring there
feeds the ramp back into itself and it stalls a third of the way in.

Two supporting fixes, both measured:

- **The clip's run ends at 4.4s of its 5.04.** 99.1% of its movement is over by
  4.3s, so the last 15% of the travel was showing a still picture before the
  stage released. Its landing and the release ramp now meet.
- **The cursor's authority comes back over 900ms, shaped.** It returned on a
  straight exponential, which starts at full speed — the garment lurched towards
  wherever the cursor was at the exact moment it finished arriving.

**The collection cards lost their fill**, on the client's call, reverting the
opaque lattice added earlier: they are their border and their contents now, and
the page runs behind them. They take the page's pointer highlight through the
hole rather than carrying a second copy of it.

**The FAQ garment's approach is half again as slow.** It was moved later last
pass, which also made it quick — the whole travel in 418px of scroll. The window
now ends 0.3 of a viewport *past* the screen's arrival: 646px for the same
distance, and the garment is still settling while the screen is being read.

---

## 2026-08-27 (last) — A steeper key, leader squares that land, and a product that never stops coming down

**The key was too gentle for the bottom of the stack.** This clip's lowest two
layers are genuinely dark — the lining's median pixel is 0.14 of full brightness
— so at a weight of 2.6 they came out about a third opaque and the page's grid
read straight through them. At 7/−0.04: 51% of the frame fully opaque against
36%, the part-transparent band between collapsing from 15% to 5%, and the fully
clear ground only moving from 41% to 39%. What is still translucent down there
is the limit of a luma key, which cannot tell dark artwork from a dark ground.

**The leader squares were pointing at nothing.** Their coordinates were read off
the still Figma shipped, and the clip that replaced it composes the stack
differently — so five squares sat on empty lattice with lines running to cards
about layers they were nowhere near. Re-measured against the clip's own settled
arrangement, each point checked to sit on the layer its card names, and stated
as **fractions of the drawn artwork** rather than frame coordinates so they hold
at any canvas width. Verified in the running page: all five land within 0.001 of
the measured fraction. The squares are pure white now — at the rule's 25% over
an artwork this busy they read as specks of the render.

**The product never stops coming down.** Its framing travelled on smootherstep,
which has zero velocity at *both* ends: the garment barely moved at first,
hurried through the middle, then stopped dead while the reader was still
scrolling — and with the canvas pinned and the copy moving past it, stopped is
exactly what it looked like. The framing is an ease-out now (`1 − (1−t)^2.2`):
78% of the drop by halfway, still moving through the last tenth at about a
seventh of its average rate. The **turn** keeps smootherstep — the details
screen was composed around a fixed three-quarter angle, and a pose still
rotating when the screen settles reads as a mistake rather than as momentum.

**The FAQ garment arrives later**, holding off until its screen is nearly half
up rather than starting the moment its top edge crosses the fold.

**Scrolling glides further, and on touch too.** Lenis was already smoothing the
wheel at its default 0.1; at 0.075 a notch settles over about 29 frames instead
of 15. `syncTouch` is on, which it was not — the phone had been scrolling
natively while the desktop glided. Both stand down under
`prefers-reduced-motion`.

---

## 2026-08-27 (late) — The clip's black ground is keyed, not blended

**`mix-blend-mode` cannot work inside a pinned stage, and this is worth
remembering.** The scrubbed technology clip shipped with
`mix-blend-difference` a few hours earlier and landed on the page as an opaque
black rectangle with the lattice stopping dead at its edges. The reason is not
the blend mode: a blend composites against the backdrop **within the nearest
ancestor stacking context**, and the section pins its stage with
`position: sticky`, which creates one. Everything the clip could blend with was
outside it. Confirmed by forcing the stage to `position: relative` — the blend
works and the grid reads straight through the artwork — and back to `sticky`,
where the rectangle returns.

`position: sticky` is the trap here. Unlike opacity, transform and filter it
does not look like a compositing property, and every pinned section in this
project has one.

**So the ground is removed rather than blended away.** An SVG `feColorMatrix`
writes the alpha channel from the colour channels, which is a real key: it
survives stacking contexts, ancestors, and the mobile layout where there is no
sticky element at all. Equal channel weights rather than luminance — this
artwork is blue and violet and luminance weights blue at 0.07, so the outer
shell would have keyed out with the ground. The floor is measured, not guessed:
on a frame of the supplied clip the ground is 0 of 765 at the median and 3 at
the 95th percentile, so subtracting 0.05 costs the artwork nothing. At
2.6/−0.05, 61% of the artwork's pixels come out fully opaque against 37% at the
first weight tried. Filter cost: a 1500px scroll held 16.7ms median.

**The clip also starts a viewport earlier.** Progress used to begin when the
stage locked, so the first frame was what the reader saw for the whole of the
screen's arrival — the picture was dead exactly while the eye was on it. It now
starts as the section's top edge crosses the fold and is about 38% through by
the time the stage pins; it still ends where the card walk ends.
[[decisions-log|ADR-0040]] is revised to match.

---

## 2026-08-27 (evening) — New product photography, a scrubbed clip, and a gate that stops stuttering

**The collections photographs are four colourways of one garment.** Supplied by
the client; the frame's four crops are deleted. The pairing with the product
names is arbitrary — those name four jackets nobody has photographed yet — and
the order was drawn rather than sorted: lime, rose, copper, cobalt. The new
files are 1080-square on transparency and framed alike, so the per-photograph
nudges the old crops needed are gone, and the card's picture box is now the
card's own content width, square, `object-contain`. The old box was 237×327 and
`object-cover`, which on a sleeves-out garment cut both cuffs off. The swatch
column moved to `right-4` — its frame x of 301 was only the right margin at the
card's original 331 units, and cards grow with the canvas now.

**The technology stack is a clip the reader scrubs.** Same artwork, driven by
the section's own scroll — the clock the card walk already runs on — and blended
into the page with `mix-blend-difference`. The clip's ground is pure black, so
difference against the lattice reproduces the lattice exactly and the box has no
edge; where the artwork lifts off black, the grid reads through it and inverts.
The still is kept as the poster. Two things had to go for the blend to exist at
all — the `Inview` reveal around the box and the `-translate-x-1/2` that centred
it — because both make an isolated group, in which a blend silently does
nothing. [[decisions-log|ADR-0040]] has the rest of the rule.

**The rotation gate stopped stuttering mid-travel.** Hover is muted while the
page travels so the details screen is always entered at the same angle. The mute
was instantaneous and triggered by *any* change in `journey` — a threshold of
one ten-thousandth, a tenth of a pixel of scroll — and Lenis does not stop dead,
so the tail of every wheel notch re-zeroed the recovery ramp. A reader parked
mid-travel, turning the garment with the cursor, was fighting a value that kept
collapsing and rebuilding underneath the turn. The gate reads scroll *speed*
now, with full mute at 0.02 of the journey per 60Hz step (about 16px a frame),
and moves on exponential ramps: 200ms to take authority, 500ms to hand it back.
Below that speed the reader keeps a proportional share of the turn.

---

## 2026-08-27 (later) — A fluid canvas, a lattice that scrolls, and two new pieces of motion

Five things, all on the client's call after seeing the morning's changes.

**The side margins are gone.** Fitting the frame to the window's height left it
centred at 90rem with a band of bare lattice down each side — 97px at 1920×950,
which reads as the page having grown margins. The canvas is `w-full` now and the
extra width goes into the gaps between the composition's columns. That cost
re-anchoring nine placements to the edge or the centre they actually belong to;
every one of them is the same pixel at 1440 units, so the reference render is
untouched. [[decisions-log|ADR-0037]].

**The lattice moves with the page again.** Yesterday's fix kept the single grid
on a *fixed* layer, which cured the moire and left the pattern standing still
behind a moving page. The whole surface — cells, bars, highlight — now lives on
the page's own root with `hero-lattice-panel`: bars on `scroll`, highlight on
`fixed`, bars first so they still quantise the light into cells. Measured: a
3000px scroll holds 16.7ms median, 16.8ms worst frame. [[decisions-log|ADR-0038]].

**The sleeves stop being whipped by the scroll.** The body used to be *placed*
at whatever pose the scroll asked for, every frame, so the bones — which trail
the body's angular velocity — were being driven by the scroll's velocity
directly. A wheel flick is not a smooth signal:

| deepest strap | before | after |
|---|---|---|
| brisk cursor sweep | 2.2° | 2.2° |
| ordinary scroll | 10.5° | 2.6° |
| wheel flick | 36.6° (the ceiling) | 9.9° |
| worst frame-to-frame change, flick | 1.92° | 0.29° |

Three changes get there: the body now *follows* the scroll's pose on the physics
clock (`JOURNEY_FOLLOW`), so its velocity is bounded and falls smoothly to zero;
the scroll gets a gain of its own (`travelLag` 1.5) instead of sharing the
hover's; and a one-pole filter (`JIGGLE_DRIVE_FOLLOW`) takes the corner off the
drive before the chains chase it. `sleeveLag` went 6 → 7 to pay for the filter.

**The collection cards tilt, and the garment floats above them.** The card leans
towards the corner the cursor is in (±6.5°) and the photographs sit in a layer
2.5rem off its face, so the parallax is the perspective's own doing rather than
a second animation. The panel moved off the `li` — the reveal already writes a
transform there and an element has only one. New hook, `usePointerTilt`, and a
narrowing of hard rule #1 for motion that is a continuous function of the
pointer rather than a state: [[decisions-log|ADR-0039]].

**The FAQ garment arrives rather than being there.** It enters 240 units from
the left with 14° of turn, both deltas on the pose the screen was composed
around and both driven by the section's own scroll progress — so it runs
backwards when the reader does. The turn is what gives the sleeves something to
trail on the way in.

---

## 2026-08-27 — The frame fits the window, the lattice is one grid, and the turn is smaller and slower

**Every screen fits, on any aspect.** The root font-size took the frame's scale
from the viewport *width* only, so on anything wider than the frame's own 1.8:1
the composition was taller than the window and its bottom was cut off. Measured
at 1920×950 — a maximised browser on a 1080p display — the frame stood 1067
units tall in a 950-unit window: the hero's CTA and both badges below the fold,
45 elements across it, and the technology screen missing its closing note and
its last card. The scale is now `min(1.111111vw, 2lvh)`, the smaller of the two
axes' scale factors. Above 1.8:1 the height binds and the frame is centred with
a band of the page's own lattice down each side. [[decisions-log|ADR-0035]].

**Centred is centred now.** The frame canvas was `w-360` — 90rem, which the
width term makes exactly `100vw` — inside a content box that is `100vw` *minus
the scrollbar*. `mx-auto` had no room to work, so the whole frame sat flush left
and overhung the right edge by 15px: the hero's claim, its CTA and the
technology stack all rendered 7.5px right of the axis a reader sees. As
`max-w-360` the canvas is the content width whenever the frame is the wider of
the two. Measured after: h1 centre 952.33 against a viewport centre of 952.50.

**The background lattice is drawn once.** The page and the fixed highlight layer
each painted the grid, anchored to the document and to the viewport
respectively, so the two slid across each other on every scroll and the
background broke into half-cells and swimming bands. The page keeps the cell
colour and the highlight layer owns the grid. Pitch, gap and the half-gap bleed
are also rounded to whole pixels — at 1920 a 0.625rem pitch is 13.33px, and a
fractional repeating gradient antialiases on a three-cell beat that reads as a
ripple through the lattice. [[decisions-log|ADR-0036]].

**A smaller, slower turn with more life in the sleeves**, all three on the
client's call:

| | before | after |
|---|---|---|
| hover sweep (turn / roll / tilt) | ±40° / ±20° / ±5° | **±24° / ±12° / ±3°** |
| rotation spring (k / d) | 0.120 / 0.505 — 100ms to 50%, 350ms to 95% | **0.080 / 0.520 — 150ms / 517ms**, still 0% overshoot |
| bone drive `sleeveLag`, ceiling | 0.63, 22° | **6, 30°** |
| deepest strap, 250ms cursor sweep | 0.5° | **2.1°** |

The gain is the part worth remembering: it multiplies angular *velocity*, so it
only means anything next to the rotation feeding it. The smaller sweep and the
softer spring together cut the peak the bones see to 40% of what it was, and
the sleeves would have gone stiff exactly as the turn got gentler — the trailing
is what reads as mass. A touch drag keeps the old 0.63 on a gain of its own:
`DRAG_DEGREES_PER_PX` turns a 30px/frame swipe into 12° *per step* against the
hover spring's 1.7°, and on the shared gain every chain pinned itself against
the ceiling for the whole swipe and let go at once.

---

## 2026-08-21 — A readability floor under the small type, and the FAQ answers on the question's line

**Type has a floor now, in px.** Above 1024 the page is the 1440 frame scaled by
viewport width, and that scaling applied to type as faithfully as to everything
else — which is right until it isn't. At a 1024 viewport the frame renders at
71%, and 12 frame units became **8.5px**: the badge captions, the consent line
and the tag chips stopped being readable while remaining perfectly proportional.

`max(…, 12px)` on the caption, body, fine and chip roles. The display sizes keep
scaling untouched. At 1440 the floor is exactly the caption's own size, so
nothing there moves — verified against the recorded frame, which is unchanged.

| at 1024×768 | before | after |
|---|---|---|
| badge caption / copy | 8.5px | 12px |
| consent line | 9.2px | 12px |
| tag chips | 10px | 12px |
| nav, dropdown, card titles | 11.4px | 12.8px |
| smallest text anywhere on the page | 8.5px | 12px |

**A floor on the type needs a floor on the boxes.** The first pass floored only
the text, and the boxes kept shrinking with the frame — so at 1024 the copy
overflowed the badge frames, the dropdown panel and the consent line. Every box
that holds floored text now carries the same floor, expressed as its own frame
value in px: `w-[max(16.4375rem,263px)]` and so on. At 1440, where a rem *is* a
px, the floor is a no-op and the frame is untouched; below it the box holds its
1440 size, which is exactly what the floored type needs.

That in turn exposed a third thing: a floored width hung off a fixed *left*
coordinate runs past the screen — the newsletter block ended 42px beyond 1024.
It is anchored to the right margin now, the same fix and the same reason as the
social row beneath it.

Result at 1024 / 1280 / 1440: badges equal at 68 tall, copy inside their frames,
dropdown sized to its longest link, consent on one line, field 245px, and zero
overflow anywhere on the page.

**Both card icons sit on the copy's last baseline**, in details and in
technology: `calc(var(--text-hero-body) * 0.155)`, which tracks the floored size
rather than a fixed rem. Measured −0.9px at 1024 and −1.0px at 1440 in both.

The dropdown's links had **no size of their own** and were inheriting the root,
so they shrank with it; they now carry `text-hero-body` and take the floor.

**The FAQ answer starts on the question's first line.** The frame centres the
answer in its own 112-unit box while the question sits in a `justify-center`
column beside it, so their first lines never met — measured on the first line
itself, the answer began 0.77rem above the question at every width, 1440
included. Top-aligned and padded by the measured difference: the offset is now
+0.3px at 1024, +0.1px at 1280, 0.0px at 1440 and +1.7px at 1920.

> [!note] Measure the line, not the box
> The first attempt corrected the wrong thing: `dd.top − dt.top` measures the two
> *boxes*, which the flex row places identically whatever their contents do, so
> changing the alignment inside them moved nothing the probe could see. The
> answer only appeared when the probe walked to the first text node and took a
> `Range` over it.

Details product 840 → 795 units on the client's call.

---

## 2026-08-21 — The details product reframed to sit the way the FAQ's does

Asked for at 1280×800, but **the framing was never breakpoint-dependent** —
measured against each section's own box the product was already identical at
1024, 1280, 1440 and 1920 (silhouette width 0.617–0.620, centre 0.412–0.416).
So this is a change to the composition itself and it applies at every width,
1440 included. Said plainly rather than pretended otherwise.

At 880 units the garment ran under the spec column. It went to 765, then back up to **840** on the client's call with the shift out to −92 — bigger and further left, still clear of the column. It is now 840 — the FAQ
screen's own height, which is what the comparison was reaching for — with the
drop reduced by half the difference so the top edge stays put, 100 → 42. That is
the fifth trim on the client's call: 1137 → 1050 → 960 → 880 → 765.

**Then dropped to sit at the FAQ's height**, `DETAILS_DROP` 42 → 140, which is
the FAQ's own `offsetY`. Both screens now hold the product at 765 units and at
the same height: measured on the isolated garment at 1440, tops 156 against 155
and bottoms 784 against 784.

They still do not read as identical, and cannot. The FAQ sits the garment far
enough left that it runs off the frame, and **a cropped object reads larger than
the same object whole** — which is what the size difference was. This screen
cannot follow it there: where the FAQ has a two-line heading it has a four-line
lede, and the product would bury it.

The intermediate value 121 came from measuring the response rather than the
arithmetic. Measured
with the canvas differenced out of the frame so only the garment is counted:
this screen's product centred on 0.530 of its section against the FAQ's 0.592.
The arithmetic said 50 units — but the garment is cropped by the section's bottom
edge, so dropping it pushes part of it out of frame and the *visible* centre
moves less than the model does. 50 units bought 0.039, so the remainder was
scaled off that actual response rather than off the arithmetic. The two now sit
within 0.005 of each other at 1024, 1280 and 1440.

**The horizontal shift stays at −36, and that number is measured, not chosen.**
An attempt at −96 moved the product off the spec column and straight onto the
lede instead. The copy ends at 384 units and the column starts at 983, so the
free corridor between them is centred on 683 against a frame centre of 720 —
a shift of −37. The product was already centred in the space it has; only its
size was ever wrong.

Frame coordinates at 1440 unchanged, seams soft, console clean.

---

## 2026-08-21 — Everything measured in frames, not viewports

Six reports at 1280×800. Most were one cause wearing different clothes: pieces of
the layout were still counted in *viewports* while the composition is counted in
*frame units*, and those only agree on a 1.8:1 screen.

- **The product spilled into the seam between the first and second screens.** Its
  canvas was a viewport tall against a details screen cut to the frame's 800
  units, so it overhung by the difference — 89px at 1280×800. The canvas is now
  one frame tall and sticks half the leftover down, which centres it while the
  hero shows and makes it *exactly* the details section once pinned. Spill above
  and below is now 0 at 1024, 1280, 1440 and 1920.
- **The technology stage and its scroll region, likewise.** The stage was a
  viewport tall and its region counted in `100lvh`; both are frames now. Pinned
  at the top rather than centred, because everything in it hangs off the top.
- **The gap between blocks 4 and 5** was the visible symptom of all of that.

Every gap is now the same share of a screen at every width:

| between | 1024×768 | 1280×800 | 1440×800 | 1920×1080 |
|---|---|---|---|---|
| hero → details | 20.2% | 20.3% | 20.3% | 20.3% |
| details → collections | 20.0% | 20.1% | 20.3% | 20.3% |
| collections → technology | 22.0% | 21.9% | 21.9% | 21.9% |
| technology → FAQ | 22.1% | 22.1% | 22.2% | — |
| FAQ → footer | 5.6% | 5.6% | 5.6% | 5.7% |

**The spec-card marks sat 0.16em below the copy they are drawn level with.**
`justify-between` puts the mark's box on the same line as the paragraph's, and a
line box runs below its own baseline by the font's descent. Lifted by 0.17rem —
off the body size, so it scales. **Measured identical at 1440**, so this was a
property of the component rather than of a breakpoint; card heights and the CTA's
alignment with the column are unchanged, only the mark moved, by 2.8px there.

Product nudges on the client's call: the hero's 540 → 570 units, the FAQ's
horizontal offset −313 → −285.

**Text decode on touch was already correct** and needed no change: verified with
`hover: none` and real touch emulation, the collections headline animates on
entering the viewport at 390 (9 frames) and at 820 (8). It runs on an
`IntersectionObserver`; no hover is involved anywhere.

---

## 2026-08-21 — Where the slack goes, decided per screen instead of everywhere at once

Two requests that pull against each other under uniform scaling, and it is worth
stating why. The frame is 1.8:1. A 1280×800 screen is 1.6:1, so it has 11% more
height than the composition does, and that height has to go somewhere: into the
margins, and the screen fills but the space between blocks grows; or into the
space between blocks, and the space stays right but the screen does not fill.
Both cannot be true.

So it is decided per screen, by what each one is anchored to:

- **The hero fills the viewport.** Nothing inside it hangs off the top — the
  markers and the product are centred, the title, CTA and badges hang off the
  bottom — so the extra height widens the space between the product and the copy
  beneath it, which is where it shows least. Its box is `lg:inset-0`.
- **The technology stage likewise**, for the opposite reason: everything in it
  hangs off the *top*, so the slack falls to the bottom of a stage pinned to the
  viewport, where nothing is looking. Centring it had pushed the headline down
  and opened the hand-over from collections to 28% of a screen against 22% at
  1440.
- **Details, collections and FAQ get a section cut to the frame's own height.**
  Each carries a pair that has to stay level — a spec column and the CTA beside
  it — one anchored to the top and one to the bottom, which drift by exactly the
  slack. A fixed 800-unit box keeps them together, and cutting the section to
  match adds no gap between blocks.

Every gap is now the same share of a screen at every width:

| between | 1024×768 | 1280×800 | 1440×800 | 1920×1080 | 2560×1440 |
|---|---|---|---|---|---|
| hero → details | 20.2% | 20.3% | 20.3% | 20.3% | 20.3% |
| details → collections | 20.0% | 20.1% | 20.3% | 20.3% | 20.3% |
| collections → technology | 22.0% | 21.9% | 21.9% | 21.9% | 21.9% |
| FAQ → footer | 5.6% | 5.6% | 5.6% | 5.7% | 5.7% |

And the hero fills the screen at all five. Frame coordinates at 1440 unchanged,
seams soft, flow breakpoints untouched, console clean.

---

## 2026-08-21 — The frame's box is centred in the screen, and two icons finally scale

Four reports at 1280×800, two causes.

**The composition sat at the top of the screen with all the slack under it.** A
frame screen is a viewport tall; the composition is 800 frame units, and the two
are only equal on a 1.8:1 screen. The children were positioned against the
*section*, so the leftover fell entirely below them.

Each screen now holds an explicit 800-unit box, centred:
`max-lg:contents lg:absolute lg:inset-x-0 lg:top-1/2 lg:-mt-100 lg:h-200`. Every
frame coordinate inside it is untouched; the slack is simply split.

| | above | below |
|---|---|---|
| 1024×768 | 100 | 100 |
| 1280×800 | 44 | 44 |
| 1440×800 | 0 | 0 — the reference, unchanged |
| 1920×1080 | 7 | 7 |

`-mt-100`, not `-translate-y-1/2`: a transform would make the box a containing
block for `background-attachment: fixed` and knock every lattice panel inside it
out of step with the page — the same trap the sticky header hit.

**The two badge marks were the only images on the page that did not scale.**
`next/image` with `width`/`height` and no CSS size renders literal pixels, so the
globe and the reticle stayed 23px while their cards shrank with the root
font-size. Invisible at 1440, where the frame's scale is exactly 1 and 23 units
*are* 23px; wrong everywhere else, and the reason the reticle read as off-centre.
Now sized in rem from the same frame units.

Found by measuring every image at 1280 against 1440 and flagging anything whose
ratio was not 0.889 — exactly two of them, out of every image on the page.

| | reticle off-centre | icon |
|---|---|---|
| 1024×768 | +0.1 / −0.1 | 16.3px |
| 1280×800 | +0.0 / −0.3 | 20.4px |
| 1440×800 | +0.0 / −0.5 | 23px |
| 1920×1080 | −0.2 / −1.0 | 30.7px |

Badge heights equal at every width (48.3 / 60.4 / 68.0 / 90.7). Frame coordinates
at 1440 unchanged, seams soft, console clean, and the flow breakpoints — 390 and
820 — untouched.

---

## 2026-08-21 — A frame screen is 800 frame units tall, not a viewport tall

Four separate complaints at 1280×800 — a CTA out of line with the column it is
drawn level with, a button too far under the cards, too much air between blocks,
too much before the footer — were **one cause**.

A frame screen was `h-lvh min-h-200`: the larger of the viewport's height and 800
frame units. Those two are only equal on a 1.8:1 screen. At 1280×800 the frame
scales to 711px while `h-lvh` stays 800, and the 89px of slack splits the
composition in half: everything anchored to the frame's top scales with it,
everything anchored to the section's bottom does not, and they drift apart by
exactly the slack. Measured, the details CTA sat 49px below the spec column it is
level with at 1440.

Every frame screen is now `lg:h-200` — 800 units, at every scale. The technology
region and the travelling canvas follow the same unit rather than `100lvh`.

| | before | after |
|---|---|---|
| slack at 1280×800 | 89px on every screen | **0** |
| details CTA vs spec column | 724..765 against a list ending 675 | **635..676 against 675** |
| the same at 1440 (reference) | 714..760 against 758 | unchanged |

**The product's pose was never viewport-dependent** — a separate report, checked
separately. Measured against each section's own box, the silhouette is identical
at 1024, 1280, 1440, 1920 and 2560: width 0.618–0.620 of the viewport, centre
0.418–0.424 across and 0.505–0.510 down, ink from 0.032 to 0.977. What changed
was the composition around it, which the slack had been distorting.

**The canvas is now centred over its container.** `applySize` rounds the buffer
*up* to a whole 50-unit cell so the lattice cannot moiré, which leaves the canvas
overhanging by up to a cell per axis — measured 26×31 at 1024, 20×39 at 1280,
0×0 at 1440, where 800 is a whole number of cells. Left at the default top-left
that overhang all fell off the bottom-right. Correct, though it turned out not to
be what anyone was seeing.

> [!note] The probe that invented a drift
> The first pass appeared to show the product sitting 9% higher at 1024 than at
> 1440. It was normalising against the *window* height rather than the section's
> — and now that a section is shorter than the window, the sampling band ran past
> its bottom into empty lattice and dragged the centroid up. Normalise against
> the thing you are measuring inside of.

Frame coordinates unchanged, seams soft at 1024 / 1280 / 1440 / 1920, console
clean.

---

## 2026-08-21 — Portrait tablets were getting a frame drawn for a shape they are not

Auditing the two viewports the earlier sweeps had not covered as *shapes* —
1024×1366 and above 1440 — turned up a real gap. An iPad in portrait was in frame
mode, and the frame is 1.8:1: the composition scaled to 71%, filled the top 40%
of the screen and left roughly 800px of empty lattice under it. Nothing was
broken; the frame simply has nothing to say about that shape.

`lg` now means landscape *and* 1024 or wider, and the root font-size rule mirrors
it. See [[decisions-log#ADR-0034]].

| viewport | aspect | regime |
|---|---|---|
| 1024×1366 | 0.75 | flow |
| 1440×1600 | 0.90 | flow |
| 1280×1024 | 1.25 | frame |
| 1024×768 | 1.33 | frame |
| 1440×800 | 1.80 | frame — the reference, root still exactly 16px |
| 2560×1440 | 1.78 | frame |

Above 1440 checked as layout, not only as seams: 1920×1080 and 2560×1440 have no
sideways scroll and nothing off-screen; type scales proportionally.

---

## 2026-08-21 — 3D scene optimised: tiered, budgeted, and no longer built for a screen nobody has reached

Measured by hooking the WebGL context itself — counting `drawArrays`/
`drawElements`, `clear` as a frame, `linkProgram`, `texImage2D` — because
`renderer.info` is not reachable from outside the scene module.

**What was already right and stayed untouched:** one shared rAF for the page,
`IntersectionObserver` + `document.hidden` gating, on-demand rendering behind
`needsFrame`, `renderer.compile` before handoff, Draco with a local decoder, a
fixed physics timestep, a clamped delta, full disposal. Programs measured
**stable at 7 through a whole scroll, before and after** — there were no compile
stalls to fix.

**Three tiers, read once at construction**, from which the pixel-ratio ceiling,
the frame budget and the resize policy all derive, so they cannot drift apart.

| | before | after (phone) |
|---|---|---|
| pixel-ratio ceiling | 2 on every device | **1.0** mobile · 1.25 tablet · 1.5 desktop |
| frame budget | every tick, every device | **1000/30** mobile · 1000/45 tablet · every tick desktop |
| frames drawn at load | 505 | **186** |
| draw calls at load | 540 | **225** |
| frames over a full scroll, scene 1 | 146 | **55** |
| frames over a full scroll, scene 2 | 189 | **70** |
| WebGL contexts at first paint | 2 | **1** |
| programs linked at first paint | 14 | **7** |
| texture uploads at first paint | 18 | **9** |

A 3× phone was rendering nine times the fragments of a 1× screen against a
ceiling of 2 — four times what it needed. Roughly 62% fewer frames, each about a
quarter the fill.

**The FAQ's scene was being built at first paint for a product seven screens
down** — a second context, seven programs, nine texture uploads, charged to the
first frame. A render loop can be gated after the fact; *construction* cannot,
so it now mounts through a `NearViewport` gate two screens ahead. Measured on a
first traversal, the product is fully faded in on arrival at any ordinary pace.

**`resize` is now a desktop event.** iOS Safari fires it every time the URL bar
collapses mid-scroll, and handling it rebuilds the framebuffer — the documented
cause of "the whole scene flashes". A coarse pointer listens for
`orientationchange` instead, which is the one case that genuinely needs a rebuild
and the one case that cannot happen mid-scroll. The canvas wrapper is also
promoted to its own compositor layer, so the fixed lattice glow repainting during
a scroll cannot invalidate the WebGL composite on WebKit.

Frame coordinates unchanged, seams still soft at 1440 and 1920, touch audit and
console clean.

---

## 2026-08-21 — Tablet and phone audited; the card's action was invisible and still tappable

Six touch viewports — 360×740, 390×844, 430×932, 768×1024, 820×1180, 1024×768 —
with real touch emulation and `hover: none` / `pointer: coarse`, not just a
narrow window. **`mobile: true` alone does not change those media features**, so
an audit that only resizes is still measuring a desktop.

**The worst find was not a size.** The collections card trades its tag chips for
a SHOP NOW link on hover — and a device that cannot hover got neither: the link
stayed at `opacity: 0` while remaining hit-testable, so the whole chip band was
an unmarked tap that navigated away, and the card's actual action never appeared.
`pointer-events` now follows the opacity, and `(hover: none)` shows the link
outright. Desktop is unchanged: at rest the link is still invisible **and** now
inert, which it should have been all along.

**45 controls were under 32px.** Nav labels resolved to 11px tall, the view
switches to 12×12, the newsletter arrow to 10×6, its checkbox to 10×10, and the
e-mail field to 15 — because the box's padding was on the wrapper, so most of
what looked like the field did not focus it. The fix is a `tap-area` utility: an
empty `::before` stretched past the element, so the *hit* area grows and the
drawing does not. Where the design's own spacing was the limit, the gap was
widened below `lg` rather than the mark redrawn.

Measured by probing outwards from each control until the point stops resolving to
it — `getBoundingClientRect` cannot see a pseudo-element, so the box lies:

| | drawn | tappable |
|---|---|---|
| nav label | 26×11 | 42×35 |
| view switch | 12×12 | 34×32 |
| newsletter arrow | 10×6 | 42×39 |
| consent checkbox | 10×10 | 32×33 |
| e-mail field | 185×15 | 201×43 |

**30 of 31 now clear 30×30**; the last is ABOUT at 49×29, one pixel under an
arbitrary bar. No sideways scroll, no clipped text, no broken images, both WebGL
contexts alive, console clean at every size. Frame coordinates unchanged.

> [!note] The probe reported clipping it had caused itself
> `tap-area` is an absolutely positioned child with a negative inset, so it
> inflates its element's `scrollWidth` — and the audit read that as text being
> cut. Nothing was cut. Real clipping has to be measured against the text, with
> a `Range`, not against the box.

**Known content gap, not a bug:** tapping a view switch changes its state but not
the picture — one photograph per product exists so far, so every swatch resolves
to the same image. The control is real; the pictures are missing.

---

## 2026-08-21 — Seams checked across twelve resolutions; the technology walk sped up

**Every product seam, at every size, now measured rather than reasoned about.**
The FAQ cut was found because a clearance was *computed* at one viewport instead
of measured across shapes, so the check that replaces that reasoning is a script:
park each stage's bottom edge in frame, sample the garment at full density, at
mid-fade and right at the edge, and express what is left at the edge as a share
of full. Bands are scaled from the fade itself, so the test means the same thing
at 1280 as at 2560.

Twelve viewports — 1280×720, 1366×768, 1440×800, 1440×900, 1512×982, 1600×900,
1680×1050, 1728×1117, 1920×900, 1920×1080, 2560×1080, 2560×1440 — across the
details and FAQ stages. **All 24 soft**, with 0–9% of full density remaining at
the edge. Two details cases at 2560 report no garment above the edge at all,
which is the aspect ratio moving the model up, not a failure.

The detector was verified able to fail: with the masks disabled at 1920×1080 it
reports the details seam at **225%** residual — the garment at full brightness
right against the edge — and calls it a hard cut.

**`LAYER_STEP` 0.7 → 0.5 → 0.4** on the client's call, in two passes: the cards
were changing too slowly for the scroll they cost. The five layers now take 1.6
viewports where they took 2.8, and the section 2.6 where it took 3.8. Walk
re-checked at 1440×800 and 1920×1080 after each step — all five arrive, in
order. 0.4 is near the floor: below about 0.35 one inertial trackpad flick
covers more than a step and the stack starts skipping a card.

Frame coordinates unchanged; nothing in the console at 1920×1080 or 390.

---

## 2026-08-21 — The FAQ seam, and why "it does not clip" was arithmetic, not a measurement

The garment behind the questions was **cut dead flat** by the section's bottom
edge, right above the footer. It carried no fade, because an earlier pass had
removed it on this reasoning: the model comes to rest at 756 against a section
`min-h-200` holds at 800, so there is nothing to hide.

**That is true at 1440×800 and only there.** The section takes the larger of
`h-lvh` and 800 *units*, and those two scale differently — the units track the
root font-size, the viewport height does not. Change the aspect ratio and the
clearance disappears. At 1920×900 it is gone entirely. A clearance that depends
on the viewport's shape is not a clearance; it should have been measured across
shapes rather than computed once.

The fade is back on the FAQ stage, and the mask's own curve was widened at the
same time. Both were wrong in the same way — **the visible ramp was too short to
read as a dissolve.** The previous shape held 92% density through three quarters
of its travel, which put the whole transition into a final 30px; measured at
1920 the ramp was 60px, short enough to look like the straight cut it exists to
hide. Now 192px of travel, the first third at full density and the remaining two
thirds decaying evenly.

Ghosting re-checked at 1920 by autocorrelation at the lattice pitch, since that
was what removing the FAQ fade was meant to cure. Clean at every band — body
(+0.761 at 10px against +0.818 at 7px), upper fade, and the last stretch. The
details seam is clean too.

Frame coordinates unchanged; nothing in the console at 1920 or 390.

---

## 2026-08-21 — The COLLECTIONS submenu is reachable, and works by tap

Two separate faults, and neither was the one it looked like.

**Desktop: the 16 units between label and panel were dead space.** The panel was
`absolute top-full mt-4`, and a margin on an absolutely positioned box moves the
box — so nothing covered the strip the cursor had to cross, crossing it was a
`pointerleave`, and the menu shut before it could be reached. The offset is now
`pt-4` on a wrapping absolutely positioned box, which *contains* it, so the run
from label to link is continuous. A 220ms close delay backs it up for a hand
that clips a corner. Verified by hit-testing the strip: y 44/48/52 now resolve
inside the wrapper where before they resolved to `header`, and a control run with
the old geometry restored closes the menu on a 700ms pause in the gap, exactly as
the fix prevents.

**Touch: `focus` fires before `click`.** Tapping a button focuses it and then
clicks it, so opening on focus and toggling on click cancelled out inside a
single tap — traced: `aria-expanded` went **true at 155ms and false at 157ms**.
Focus no longer opens the panel; activation does, which is also the correct
pattern for an `aria-expanded` disclosure button. Blur still closes it. One tap
now opens and a second closes, at 390 and at 820.

Hover is additionally gated on `(hover: hover) and (pointer: fine)` so a touch
device never opens by hover, with a 700ms grace after a tap for hybrids.

> [!warning] Three probes lied before one told the truth
> - `mobile: true` in `setDeviceMetricsOverride` does **not** change the
>   `hover`/`pointer` media features. The page still reported itself
>   hover-capable, so the touch runs were measuring desktop behaviour. Needs
>   `setTouchEmulationEnabled` plus `setEmulatedMedia`.
> - Filtering hover on `pointerType === "touch"` looked wrong because of that
>   mis-emulation. The event log shows `pointerenter` really does carry
>   `touch` — the diagnosis it produced was a false lead.
> - The break-mode control read its flag from `process.argv[6]` when the flag
>   arrives at `[5]`, so "the control does not fail" meant "the control never
>   ran". A control that cannot fail proves nothing; check that it can.

Frame coordinates unchanged; nothing in the console at 1440 or 390.

---

## 2026-08-21 — The pointer highlight stops reading as a blob

The complaint was that it looked like a patch stuck on the grid. **The cause was
the falloff curve, not the radius or the brightness** — the four rounds of
narrowing it (340 → 272 → 192) never touched what was actually wrong. A plain
`colour → transparent` radial is a linear cone: a flat bright core, and a rim
where it reaches zero that the eye finds and traces. Three changes, none of them
"make it dimmer":

- a **convex** decay through explicit stops, so brightness falls fastest near the
  middle and there is no flat core whose edge can be seen;
- a second halo at 1.75× the radius and a sixth of the strength, whose only job
  is to dissolve the first one's rim into the page;
- the same treatment on the trailing pair, which was arriving as a sharper
  second patch chasing the first.

Falloff on the page background, per 30px: +7.0 at the cursor then −1.0 a step,
even the whole way to zero at 210px. Before: +11.0, −2.0, −3.0, −2.0, −3.0, −1.0
— steep core, visible shoulder.

**Shape alternatives were rendered and rejected on the evidence.** Hard-stepped
tiers, which sounded right for a grid, produce a *stamped disc* — worse, not
better. A pure crosshair along the grid axes and a horizontal scan band both
remove the blob entirely; the client preferred the round form kept and softened.

> [!warning] `background-attachment` counts layers
> The highlight went from four background layers to five. A short
> `background-attachment` list is **repeated**, not padded, so leaving
> `scroll, scroll, fixed, fixed` on `hero-lattice-panel` would have silently
> handed the new trailing layer `scroll` and pulled every card's glow out of
> phase with the page behind it. One value per layer.

Frame coordinates unchanged, cards exact; nothing in the console at 1440 or 390.

---

## 2026-08-21 — Turn capped below the back view; the stage fade reshaped; highlight tightened

**`TURN_MAX` 80° → 40°.** The ceiling is set by the two screens that start
already turned: the hero rests front-on so this is a symmetric ±40°, but the
details screen and the FAQ rest at `SCROLL_TURN` and hover *adds* to it, so the
far end of their sweep was 40 + 80 = 120° — the garment's back. It is now 80°, a
strong side three-quarter with the zip and front panel still reading.

**The stage fade: the shape, not the length.** Both previous settings were wrong
in opposite directions, and the second was mine. A linear 160px ramp is 50%
transparent 80px up, which ghosted the 10px lattice across the lower body of the
jacket. Cutting it to 48px stopped the ghosting and produced exactly the thing
the fade exists to prevent — a hard horizontal line slicing the jacket across the
full width of the screen, which is what the client photographed. The mask is now
a **long, shallow tail**: 140px of travel, still 92% opaque three quarters of the
way down, giving way only over the last 30px.

Measured by autocorrelation at the lattice pitch, across the garment:

| band | 10px (the grid) | 7px (control) | |
|---|---|---|---|
| body, above the fade | +0.490 | +0.519 | clean |
| upper half of the tail | +0.080 | +0.081 | clean |
| last 30px | +0.692 | +0.048 | ghosting — and correctly so, the model is leaving the frame there |

**Lattice highlight 272px → 192px.** Falloff measured on the page background:
+11.0 at the cursor, +9.0 at 40px, +6.0 at 80px, +4.0 at 120px, +1.0 at 160px,
and exactly 0.0 at 192px — terminating on the token's own value.

Frame coordinates unchanged, cards exact; no console output, exceptions or
DevTools issues at 1440 or 390.

---

## 2026-08-21 — The FAQ product answers the cursor exactly as the details screen does

On the client's call, the pinned instance stops being a special case. It reads
the same turn, roll, tilt and parallax the travelling one does, and the two now
share a single block of code — **the only difference left is what the turn is
measured from**: the travelling product turns away from front-on as it makes the
journey, and the pinned one starts already at the angle that journey ends on
(`still.turn`, defaulting to `SCROLL_TURN`). The still-only limb reaches are gone.

Sweep measured on the silhouette's centroid: 424.0 with the cursor far left,
477.4 centred, 450.4 far right — and 424.0 again on a repeat of the far-left
run, so the reading is exact to 0.1px. Non-monotonic because the garment passes
edge-on partway through the sweep, which is also true on the details screen.

Worth knowing rather than fixing: with the base at `SCROLL_TURN` and hover at
±`TURN_MAX`, the far end of the sweep reaches a back view. That is the same
range the details screen has, which is what parity means here — but if the back
is unwanted it is `TURN_MAX`, and it would narrow both screens together.

This is the third setting the pinned product has had: cursor-driven body (too
loud behind the copy), constant turntable (read as a loop playing), held pose
with bones only, and now parity with block 2. Frame coordinates unchanged; no
console output, exceptions or DevTools issues at 1440 or 390.

---

## 2026-08-21 — Deterministic arrival on the details screen, and the pinned product adopts its pose

**The details screen is entered in one pose, every time.** Hover and the
journey's own turn add, so a cursor parked at the edge of the section while the
reader scrolls landed the product anywhere across a ~120° spread — at the far
end of which the garment arrives showing its back. The cursor's authority is now
gated by `TRAVEL_SETTLE_MS`: zero while `journey` is changing, ramping back over
500ms once the page is still. **Time, not distance** — a distance-based gate
hands authority back over the last stretch of the travel, which is precisely the
stretch that decides the pose.

Measured on the silhouette's centroid, which survives this environment's render
noise where a pixel diff does not:

| | centroid | vs reference |
|---|---|---|
| no cursor, at arrival (reference) | 594.9 | — |
| **cursor parked far right, at arrival** | **594.7** | **−0.2px** |
| cursor parked far right, +2.6s | 701.2 | +106px |
| no cursor, +2.6s (idle breath alone) | 588.9 | −6px |

So the entry is pose-identical whatever the cursor is doing, and full hover
authority is back a moment later — 106px of travel against a 6px noise floor.

**The pinned instance holds the same pose the journey ends on.** `HeroSceneStill`
gained an optional `turn`, defaulting to `SCROLL_TURN`, so the FAQ shows the
garment from the details screen's three-quarter angle rather than reverting to
the model's front-on default — and the two cannot drift apart if that angle is
retuned. Its limb reach is 55° against the hero's 80°, so the cursor stirs the
bones slightly less than block 2 does.

**Details product 960 → 880 units**, drop 140 → 100 so the top edge stays put —
the same half-the-difference rule the two earlier trims used.

> [!note] Two probes that could not see what they were asked to
> A pixel diff of the garment area has a ~38% noise floor here: the scene drops
> its pixel ratio under SwiftShader's frame rate, so two runs differ by the
> buffer resolution alone. And a "do the bones respond" test that parks the
> cursor and waits measures nothing — the bone drive is *velocity*, so the
> chains return to rest, and what the diff actually picked up was the lattice
> glow following the cursor. Bones have to be caught mid-swing, in a crop the
> glow's 272px reach cannot touch.

---

## 2026-08-21 — Sweep narrowed again, pinned product parked, and the lattice stops ghosting through the jacket

**The bottom fade was making the garment translucent.** `hero-stage-mask` is a
`mask-image`, so it does not dim the canvas — it takes alpha out of it, and what
is behind it is a 10px lattice. At 160px the grid read straight through the whole
lower body of the jacket on the details screen and behind the FAQ, and the product
stopped looking like an object. Diagnosed by autocorrelation across the fade band:
a peak at exactly the lattice pitch (10px, corr +0.44) against a 7px control at
+0.26 — and the peak disappears with the mask off. Two changes:

- The fade is **48px, not 160**. It exists to hide a hard horizontal cut where a
  viewport-height box crops the model; that is a seam treatment and wants the
  length of a seam.
- **The FAQ stage carries no mask at all.** Since the model was lifted 60 units
  its ink comes to rest at 756 against a section `min-h-200` holds at 800 or
  taller — there is no cut there to hide, so the fade was pure cost.

Verified opaque afterwards on the hero, details and FAQ at both 1440 and 390.

**Hover sweep 110° → 80°**, roll 28° → 22°. At ±55° the product went nearly
side-on at the edges of the section; at ±40° the front panel, collar and zip stay
readable through the whole sweep.

**The pinned instance is parked, not turning.** The constant turntable that
replaced the cursor-driven body went too far the other way — a full revolution
walks the garment through its own back and reads as a loop playing rather than as
an object sitting there. It now holds its pose, keeps only the 1.5° idle breath,
and the cursor still reaches the bone chains: cursor-far-left against
cursor-far-right differs by 4.5%, against a control of two identical runs at 0.3%.

1440 frame re-checked against the recorded coordinates: no mismatches, collections
cards exact. No console output, exceptions or DevTools issues at 1440 or 390.

---

## 2026-08-21 — Product motion: a trailing turn, a three-quarter rest, a turntable behind the questions

**The hover turn trails now.** Rotation spring 0.345/0.450 → **0.120/0.505**:
50% in 100ms, 95% in 350ms, zero overshoot, measured on a sweep of the scene's
own integrator. The sweep itself is smaller — **110°** across the section
instead of 140°, roll 35° → 28°.

> [!warning] Lag is not dead time, and only one of them reads as sluggish
> This is the second attempt at a softer feel. The first ran the cursor through
> the pointer's own lerp *before* the spring — two filters in series — and the
> product did not begin to move for 391ms, which felt broken and was reverted.
> The fix is to soften the single spring, so the product answers on the very
> next frame and simply takes longer to arrive. Do not reintroduce the smoothed
> pointer as the rotation input.

**The journey lands in a three-quarter view.** `SCROLL_TURN` 24° → **40°**. The
number is chosen for where the product comes to *rest*: at 24° the details
screen still read as very nearly front-on, and a garment shown flat hides its
own shape.

**The pinned instance is a turntable, not a control.** Behind the FAQ the
product now turns at a constant rate — one revolution per 40s, off the frame
clock so the rate is the same on any display — and the cursor is routed to the
**bone chains only**. The body never receives the pointer's angle: the two limb
integrators are driven to a sixth of the hero's throw and only their velocity is
used, which is already what the jiggle consumes. A body that swung to the cursor
would pull the eye off the copy it sits behind.

Measured: the pinned jacket changes 43% of its own area over 4s with no pointer
input at all, and cursor-far-left against cursor-far-right *at the same moment in
the turn* differs by 4% — against a control of two identical runs which came out
pixel-identical at 0.0%, so that 4% is the cursor and not timing drift between
runs.

---

## 2026-08-21 — Responsive adaptation below 1024; the 1440 frame untouched

**The scaling regime was the bug, not the layouts.** See [[decisions-log#ADR-0032]]
for the full reasoning. In short: the root font-size mapped each viewport band to
the design width it was drawn at, which is only correct *at* that width — so the
page rendered correctly at 360, 1024 and 1440 and at no other width. The root
font-size hit 28.4px at a 640 viewport and 10.0px at 641, and at exactly 1024 the
1440-wide frame was drawn at full scale inside 1024px, putting the collections
lede off-screen at x 1069–1354. Now: `1.111111vw` at and above 1024 (the frame,
fitted to any width), a flat `16px` below it (flow, no scaling).

Everything else followed from re-measuring at real sizes:

- **The pinned header had no backdrop below `lg`** and the whole page scrolled
  through it — spec-card copy read out from behind the logo and nav on every
  section. The fill is `hero-lattice-panel`, the same opaque lattice the cards
  use, plus a bottom hairline. It sits on the sticky *wrapper*, not the header:
  the header is a `Spring`, and a transform makes `background-attachment: fixed`
  resolve against the element instead of the viewport, which would knock the
  lattice out of step with the page behind it.
- **The product's swipe target used frame coordinates at every width.**
  `left-85 size-190` resolved to x 340–1100 — on a phone, a grab area sitting
  mostly off the right edge and nowhere near the jacket. Below `lg` it is now
  the product box itself; at 1440 it is unchanged at 340–1100.
- **Footer columns clipped their own labels.** Four columns from 640 left
  "TERMS & CONDITIONS" and "SHIPPING & RETURNS" cut off, and `whitespace-nowrap`
  cut the copyright mid-word at 390. Four columns now start at `md`, and nowrap
  is `lg:` only — below the frame, long labels wrap.
- **Collections take two columns from 640** rather than one very wide card with
  a small photograph adrift in it.
- **A third headline size for the tablet band**, 50px, chosen to match what the
  frame itself draws at 1024 (70 × 1024/1440 = 49.8px) so the regime change is
  invisible in the type.

**The 1440 frame is byte-identical.** Verified against the recorded values:
logo [40,24,75,30], cart 1302,24, marker [40,341,156,119], CTA 635,714, details
intro [40,122,344,218] and list at 983/122/417, collections cards 331×446 at
40/383/726/1069, FAQ list [726,136,674,618], footer 1440×350 with social flush
at 1400 and nav columns at 297/465/633/801.

Swept for errors at 360, 640, 820, 1024 and 1440: no console output, no
exceptions, no DevTools issues, no horizontal overflow. Only the known
`/privacy-policy` 404 from the cookie banner, which is accepted.

---

## 2026-08-21 — Full error sweep: production clean at four widths

Console, uncaught exceptions, network responses, the DevTools Issues panel and
the Next dev overlay, swept across the whole page with the interactive parts
exercised, at 1440 / 1024 / 820 / 390. **Production is clean on every count at
every width**, except the `/privacy-policy` 404 that the cookie banner decision
already accepts. The dev overlay stays empty with an extension attribute
injected, so the `suppressHydrationWarning` fix holds.

Three things surface in dev only and none is a defect:

- **`next/image` aspect-ratio warning on `arrow-right.svg`, phone widths only.**
  The check is `round(rendered) !== declared` on each axis, warning when exactly
  one differs. Under the adaptive rem grid the 10×6 mark renders 10.83×6.48 at
  390 — width rounds to 11, height still reads 6. A *square* mark can never trip
  it, which is why the 11×11 brackets and 13×13 corners never have. The ratio is
  right to 0.2% and the check is compiled out of production.
  **`h-auto` is not the fix and was tried and reverted:** the asset is
  intrinsically 10×5.7735, so `auto` resolves the height against that and
  squashes the arrow 4% (measured 9.98×5.75 against the correct 9.98×5.98) while
  still warning — now at 1440 as well.
- **`PerformanceIssue: DocumentCookie`** — Next's own dev runtime at document
  line 78 (`app-page-turbo.runtime.dev.js`). The consent store uses
  `localStorage`; `document.cookie` appears nowhere in `src/`.
- **Two LCP hints** naming below-fold product images. An artifact of scripted
  scrolling: a programmatic scroll is not user input, so LCP never finalises and
  keeps moving to whatever is largest. Adding `priority` to those would make a
  phone eagerly fetch four large photographs — the opposite of the advice.

**Probe traps worth remembering.** Launching headless Chrome without a target
opens its default start page, and `Audits.enable` replays the issues already
collected for the *current* page — a run without `about:blank` reported a
`.google.com` cookie warning and two `FormAriaLabelledByToNonExistingIdError`
that belonged to Google's homepage, not to this site. Always give Chrome an
explicit `about:blank`, and treat any finding that does not reproduce on a
second run as suspect.

---

## 2026-08-21 — Hydration mismatch from browser extensions silenced

The Next dev overlay reported one Console Error on every load: *"A tree hydrated
but some attributes of the server rendered HTML didn't match the client
properties"*, with a single diff line — `cz-shortcut-listen="true"` on `<body>`.
That attribute is ColorZilla's; other extensions write their own the same way
(Grammarly's `data-gr-*`, dark-mode add-ons). They land before React hydrates,
so React finds markup it did not produce and reports a mismatch over something
the page cannot control. `suppressHydrationWarning` on `<body>` — one level only,
so a genuine mismatch anywhere inside the app still reports normally.

**Note this is invisible to a headless browser**, which has no extensions: the
CDP console scan came back clean while the overlay was showing the error on the
developer's own Chrome. Reproducing it means injecting the attribute yourself at
document-start, then reading the overlay's text out of the `nextjs-portal` shadow
root. Both directions were measured — the error present without the fix, the
overlay empty with it, with the attribute still on `<body>` in both runs.

Two traps in that probe, if it is ever needed again: a `ShadowRoot` cannot be
`cloneNode`d (walk its text nodes instead), and a `curl` wait-loop that echoes
"up" regardless of whether the port ever bound will happily point the whole
measurement at a server that never started.

---

## 2026-08-21 — Collections cards filled; above-fold images no longer lazy

**The collections cards get the same fill every other card has.** The exported
frame is transparent, but the details, technology and FAQ panels are all opaque
lattice, so the four product cards were the only ones the page's own lattice ran
straight through — they read as cut-outs rather than as objects. Now
`hero-lattice-panel`, the same utility the other three use, which also carries
the pointer highlight across the card. Card rects unchanged: 331×446 at x 40 /
383 / 726 / 1069.

**Seven `LazyLoadImageIssue` entries cleared.** `next/image` defaults to
`loading="lazy"`, and seven images in the first screen inherited it — the four
corner brackets, the wordmark's torch copy, and the two badge marks. Chrome
raises the issue because lazily loading what is already on screen only delays
LCP. `priority` on all seven; the DevTools Issues panel now reports zero after a
full-page scroll.

**Still open:** the starter's cookie banner links to `/privacy-policy`, which
does not exist — a 404 on every load, and the banner itself is still in the
starter's default styling rather than the site's.

---

## 2026-08-21 — Reveal trigger rewritten; glow tightened; footer bottom row restored

**The hold-back bug, fixed properly this time.** `REVEAL_ROOT_MARGIN` alone had
stranded three separate elements (details row 05, the details CTA, and finally
the footer's whole bottom row) — anything whose resting position is *closer* to
the viewport's bottom edge than the 64px margin is deep never intersects, so it
never reveals and the text is simply absent. Since a margin small enough to clear
every bottom anchor is too small to stop early reveals, `lib/animation/reveal.ts`
now runs **two observers, first to fire wins**: the hold-back one for things
scrolling up into view, and a `threshold: 1` one for anything already fully on
screen and therefore with no business staying hidden. `Inview` and `ScrambleText`
both route through it. This is the bug's third and — because the failure mode is
now structurally impossible rather than tuned around — last appearance.

**Text decode extended to prose.** `ScrambleText` now also drives the footer's
column links, the newsletter labels and the section ledes, so the site's
signature animation is not just a headline treatment.

**Lattice glow radius 340px → 272px** (`--raw-size-lattice-reach: 17rem`).
Measured by region median at 1440×800: +10 brightness under the cursor, gone by
60px out, unchanged beyond. Sampling single pixels along a row cannot see this —
the row lands on lattice gaps and card photography, which is why the first probe
reported a flat zero everywhere and looked like a regression.

**FAQ jacket raised 60 units** (`STILL.offsetY` −200 → −140), ink now 158..756.

---

## Baseline — built from `next16-claude-starter` v0.1.0

What the starter ships, so the first project entry has something to diff against:

| Area | What is there |
|------|---------------|
| Framework | Next.js 16 App Router · React 19 · TypeScript · Yarn · Node ≥ 20.19 |
| Styling | Tailwind v4, CSS-only config, three-tier design tokens ([[design-system]]) |
| Motion | Vendored spring engine + `spring-text-engine`, shared rAF ticker, reduced-motion ([[animation-system]]) |
| Layout | Adaptive scaling grid — root font-size tracks the viewport ([[design-system]]) |
| Scroll | Lenis smooth scroll + Zustand scroll store ([[smooth-scroll]]) |
| Server | `app/api` route handlers, zod-validated env, `{ data }`/`{ error }` envelope ([[api-architecture]]) |
| SEO | Metadata generator, `robots.ts`, `sitemap.ts`, JSON-LD ([[seo-metadata]]) |
| Agent harness | 8 commands, 7 path-scoped rules, 11 skills, 4 subagents, `verify.sh` ([[agent-harness]]) |
| Not included | CMS, database, auth, payments, i18n, tests — added per project ([[backend/README]]) |

The home view (`src/views/home.tsx`, route `/`) ships empty on purpose — start
there ([[new-page]]).

<!-- Log this project's changes below, newest first, under a `## YYYY-MM-DD` heading. -->

## 2026-08-21 — Ten from review: page-wide field, dropdown, preloader, metadata

**The lattice highlight is now the whole page's, and there is one of it.** It
used to be a WebGL pass that only existed where a canvas did — the hero and the
FAQ — while the opaque panels drew a CSS copy of the same idea. The shader is
gone and the CSS version does all of it: a fixed, viewport-sized overlay for the
page and the panels' own layer for anything that knocks the page out, both
reading the same two custom properties. One writer publishes them
(`PointerField`), so a section with no canvas at all lights up the same as one
with — measured on the collections screen, whose background goes from a median
of 13 to 21 under the cursor and stays at 13 away from it. That also deletes a
full-screen fragment pass from the render loop.

**Type sizes audited against the frames**, all twenty of them, at 1440: nav,
cart, markers, hero lede and badges, four 70px headlines, standfirsts, row titles
and bodies, card titles, tag chips, questions, answers, footer links, copyright,
the sign-up input and its consent line. Every one matches.

**The 5 → 6 seam is dissolved**, with the same utility the 2 → 3 seam uses rather
than a second copy of the gradient. Measured through the edge: 9.8 → 7.7 → 4.3 →
2.9 → 2.4 → 0, no step.

**The FAQ rows were already animating** — 0 → 2 → 4 → 5 as the section rises —
so only the cadence changed, from a 70ms step to the details screen's own 90.

**The footer's social row is anchored to the right margin** instead of a left
coordinate. It was overshooting the rule above it by 15px because the frame's
left value only lands flush for one exact set of glyph widths; pinning it to the
same 40-unit margin the rule uses makes that impossible. Now flush at 1400.

**COLLECTIONS has the submenu its caret promises.** The frame draws the glyph and
nothing behind it; the panel lists what the collections screen holds, opens on
hover *and* click, and closes on Escape or an outside click — hover alone would
put it out of reach of a keyboard and of touch.

**The consent checkbox** now carries `-webkit-appearance: none` as well as the
standard property. Without the prefixed one Safari keeps drawing its own control,
which is a filled white box — the stray square in the client's screenshot. It is
a hairline that fills when set, and brightens under the pointer like the
collections swatches.

**Text animation audited.** Two gaps found and closed: the footer's copyright and
social row had no reveal at all, and the sign-up heading did not decode.

**A preloader**, gated on real readiness rather than a duration: the fonts
resolving, `window.load`, and the hero scene reporting its model compiled. A
timer would be a promise about the network nothing can keep. It has an 8s
backstop so a failed model can never strand the page, a `<noscript>` rule for
where scripts do not run, and it lifts by itself — verified caught mid-flight at
"LOADING 077" and gone once settled.

**Metadata, icons and the share card**, generated from the logo. The brand is
ARTEFAKT — the footer's copyright and the wordmark under the mark both say so;
"Get Layers" is the Figma file. Two things worth noting: the supplied logo is
opaque, so compositing it anywhere left a black plate around the mark — the alpha
is rebuilt from its own luminance and that transparent version is now what the
header, footer, preloader and every icon use. And the metadata generator declared
the share image as 900×600 against a 1200×630 asset; scrapers lay the card out
from the declared numbers, so that was a real defect.

**Still to do before launch, both flagged rather than invented:** the sign-up form
has no endpoint, and `NEXT_PUBLIC_SITE_URL` is still `https://example.com`, which
is what every canonical and OG URL currently resolves against. The Twitter handle
is deliberately unset — inventing one risks attributing the card to a stranger.

## 2026-08-21 — Footer (block 6), and the FAQ product becomes the model

**The footer**, from node 1748:1161. Verified at 1440: 1440×350, logo 99×40 at
(40, 24), the four nav columns landing on 297 / 465 / 633 / 801, the sign-up
245 wide at (1155, 24), the rule 1360 wide at (40, 286), copyright at (40, 310)
and the social row at (1086, 310). Pixel-diffed against the frame at 3.3 mean
difference over the whole block.

It is **350 tall, not 800** — the only frame in the file whose content does not
fill its artboard, and Figma renders the node itself at 350, so the footer gets
its own height rather than a screen of empty lattice.

The sign-up is **a real form**: an `input`, a submit `button` and a `checkbox`,
labelled. The frame draws a picture of a control, and rendering that as static
text would tell a screen-reader user there is nothing to fill in. There is no
endpoint yet, so submitting is prevented rather than left to reload the page with
the address in the query string — flagged in DESIGN-MAP.md.

One small thing measured rather than eyeballed: the social row came out 16 left
of the frame because the separator in Figma is the text **" / "** — with its
spaces. On a monospaced face those two spaces are 19 units of the row's width.

**The FAQ screen's jacket is now the hero's model**, on the client's call, and
the photograph is deleted. That needed a *pinned* mode in the scene: the hero's
instance walks the product between screens and measures a journey against the
region it lives in, which an instance that is simply placed has none of. The
framing was read off the photograph rather than chosen — 765 units tall, 313
left of centre and 200 below it — and checked: the ink's top edge lands on 217
in the frame's render and 226 in ours, the rest clipped identically by the left
and bottom edges.

The cost is honest and worth stating: **this is a second WebGL context on the
page.** ADR-0031's one-canvas rule is about the *travelling* product, which must
not change hands; a separate, static appearance three sections later is a
different case, but it is still a second context and a second decode of the same
model.

**A set of assets was sitting unused.** `public/assets/block 4/` held the
client's own icon exports, dropped in alongside the block 2 ones and never
noticed — block 4 was built with icons pulled from Figma instead. Hers are clean
32×32 frames; Figma had handed over the inner groups cropped to their own bounds,
so icon 01 was 31.33×30.33 and stretched about 3% into its square box. Swapped
to hers; all five now measure 32×32 natural in a 32×32 box.

## 2026-08-21 — Entrances for the technology card and the two big images

The client asked for the cards to animate on arrival "like block 2". Block 5's
rows already did — measured on approach they come up 0 → 1 → 2 → 4 → 5 as the
section rises. **Block 4 was the gap**: its heading flew in while the stack image
and the specification card were already at full opacity a whole screen before the
section arrived, because the card's opacity is bound to the scroll walk and layer
01 is active from the start, and the image had no reveal at all.

Both have one now, and the shape of each was forced by the same rule:

**A transformed element becomes the containing block for its absolutely
positioned descendants**, so an `Inview` — which writes a transform — cannot be
wrapped around anything whose children are placed absolutely.

- The technology cards are absolute at the frame's coordinates, so the entrance
  is carried by **the cards themselves** (they have no absolute descendants) off
  a single `IntersectionObserver` on the stage, sharing `REVEAL_ROOT_MARGIN` with
  everything else. Verified: a screen out the card reads opacity 0 at
  `translate 0px 16px`, and by mid-approach 1 at `0px`.
- The stack image's box carries `-translate-x-1/2` to centre it on the frame, and
  a spring's transform would overwrite that, so the reveal went **inside** the
  box.
- The FAQ photograph is placed by percentages against its own box, so a transform
  on that box would move the entire crop. That one is **opacity only**.

Re-measured after the change: block 4's walk still lands on 136 / 236 / 370 / 492
/ 658, and the hero, details, collections and FAQ coordinates are all unchanged.
Nothing is left hidden at rest anywhere — the only faded elements are the hover
states that are meant to be.

## 2026-08-21 — FAQ section (block 5) built from Figma 1748:1158

The concept's fifth block: "NEED TO KNOW." over five questions and answers, with
the product running off the bottom-left.

**Built as a description list.** Five questions and their answers is what
`dl`/`dt`/`dd` is for, and it is what makes the section eligible for FAQ
structured data later. That content model allows only `dt` and `dd` inside a row,
so the frame's vertical rule between the columns is drawn as the answer's own
left border with the 32-unit gap split either side of it — identical on screen,
and the list stays a list.

**Verified against the frame by measurement.** Every coordinate at 1440 is the
frame's own: headline 258 wide at (40, 136) and 95 tall once cap-trimmed, the
list 674 wide at (726, 136), rows 114 tall at 136 / 262 / 388 / 514 / 640, the
question cell 195 wide, the rule landing on 970, and the photograph's window at
(-93, 208) 1006×780. Question and answer line breaks match the frame on every
row. Pixel-diffed: every region within a few pixels of the render.

Two details worth keeping:

- **Row height is 114, not 112.** It comes from the frame's rule, which is 112
  units against 80 units of copy; with the rule now a border there is nothing to
  drive the height, so it is set — and `h-28` gives 112 because the border is
  inside the box. Measured off the frame's own render rather than derived.
- **Question column widths are not uniform.** Row 02 is 195 where the others are
  175, and that is what keeps its question on two lines; widening the others to
  195 breaks them differently. Carried per row in the content, like the
  collections photographs' nudges.

The photograph is the same export the details frame used before the 3D model
replaced it there, re-downloaded and mirrored — 1.38MB PNG in, 0.20MB WebP out.

## 2026-08-21 — Technology section (block 4) built from Figma 1748:1155

The concept's fourth block: an exploded stack of the jacket's five materials,
with a card that walks down it as the section scrolls.

**Five frames are five states of one composition**, not five sections — the
heading, standfirst and stack are identical in all of them and only the card
moves. Verified rather than assumed: in state 4 the only card borders in the
right-hand column are that one card's own top and bottom, so the cards do not
accumulate. So the section is a pinned stage in a region tall enough to hold the
walk — one viewport plus 0.7 per remaining layer.

**Verified against the frames by measurement.** The card lands on the frame's own
tops at every step — 983/136, 983/236, 983/370, 983/492, 983/658, all 417 wide —
and the derived card heights (122 and 102) match the `cardSideY` values the
frames put the leader line at. Pixel-diffed against state 1: the stack's ink
centroid is within 0.7px, the standfirst within 0.5px, the leader line within
1.1px, 3.8 mean difference over the whole section.

**The leader lines are drawn, not exported.** Figma ships five SVGs because in
Figma a shape is a shape; they are one construction — a diagonal and an 8-unit
square — whose only variables are the two endpoints. Deriving them from the
numbers that place the card means the line cannot come loose from it.

**A headline sat 10px low, and the cause is worth keeping.** `text-box:
trim-both` trims a *block container's* own first and last line boxes. The h2 had
been made `flex flex-col` so its lines could be separate children — and a flex
parent has no text of its own, so the declaration was simply inert. The lines are
inline with a `<br>` now, and the glyph rows land within a pixel of the frame's.

**The reveal hold-back had to change again — and the shape of it was wrong.** The
details screen's button is `bottom-10`: at rest it clears the viewport's bottom
edge by 86 units, less than the 96px the 12% margin came to, so it never
revealed. A percentage is the wrong instrument here: those clearances are frame
units and scale with the viewport's **width**, while the margin scaled with its
**height** — it held at 1440×800 and would have broken again on a tall window.
It is a fixed 64px now, 22px clear of the tightest case on the page, and every
section was re-checked for elements still faded at rest: none.

The stack render went to WebP on the way in — 1.34MB → 0.21MB, alpha identical.

## 2026-08-20 — Reveals now play on screen; product trimmed again

**The reveals were firing off-screen.** `Inview` built its observer with no
margin, so it triggered the instant one pixel of an element crossed the
viewport's bottom edge — and between the stagger delay (up to 440ms on the last
detail row) and the spring's own travel, the animation was over before the row
was anywhere near read. What the reader saw was a row that had simply always
been there. The client's question — "why have animations at all?" — was exactly
right.

`REVEAL_ROOT_MARGIN` now holds every below-fold reveal back until the element is
properly on screen, and **`ScrambleText` shares the same constant** so a box and
its own label arrive together; before this the box appeared immediately and the
decode waited, which read as two unrelated effects.

**The value took two goes, and the second is the interesting one.** 20% looked
right on arrival but broke the *resting* state: these sections are viewport-tall
with content anchored to the bottom, and on the details screen at the frame's own
800 the last row's top clears the viewport bottom by 162px — against a 160px
band. Two pixels of margin, and it lost: row 05 never appeared at rest. At 12%
(96px there) all five rows are up at rest and a row arriving from below is still
hidden at 62px on screen and revealed by 138px. A fraction rather than a fixed
offset because the clearance grows with the viewport too.

**Product trimmed again** on the second screen, 1050 → 960 units, drop 185 → 140
so the top edge holds. Verified: the silhouette's left edge moves 196 → 218.

Two measurement traps worth remembering, both hit here: a **stale production
server** (the port was still held, so `yarn start` never bound and every reading
came from the previous build — kill by port, not by process name), and a
**threshold test that waits long enough for the animation to finish**, which can
only ever report "already done". Finding a trigger point needs a fresh load per
candidate position.

## 2026-08-20 — Six changes from review: images, seam, header, card interaction

**The product images were never broken — AVIF was.** Three of four collections
photographs failed to appear, in the browser as well as in captures. The cause,
measured on one 880×1213 cut-out at w=768: **WebP encodes in 0.125s, AVIF was
still unfinished after 3m20s.** Encoding AVIF from a source with an alpha
channel is pathologically slow here, and every product shot and the wordmark
plate are transparent PNGs — so the browser asked, the optimiser sat on the
encode, and only the one already cached arrived. `formats` is now `["image/webp"]`
and the four sources are WebP: **4.24MB → 0.39MB**, with alpha bit-identical to
the PNGs and a mean RGB difference under one level. This was nearly misdiagnosed
twice — first as a headless artifact, then as a `next/image` bug.

**The seam is dissolved.** Once the canvas finishes sticking it comes to rest
over exactly the details screen, so its bottom edge lands on the join with the
section below, and the product — which the frame runs off the bottom of that
screen — was being sliced by a hard horizontal line. A mask now fades the last
160 units into the page. Measured on lattice cell rows so the grid's own gaps do
not skew the read: luminance descends to 10.40 at the edge and stays at exactly
10.40 below it, which is the page lattice's own level; the step *at* the join is
−0.24, indistinguishable from the ramp around it. A deliberate deviation — at
rest the frame has the jacket solid to the edge.

**The header is pinned** for the whole page. The wrapper is what sticks; from
`lg` it is given zero height and the header inside goes back to being absolutely
positioned, so the banner keeps the frame's coordinates and takes no space —
verified: the header sits at viewport top at every scroll position, the hero
still starts at document 0, and the document is the same 2400 tall.

**The swatch column is a control, not decoration.** The client's note: it turns
the garment. `views` is now a list per product and the swatches switch between
them, cross-faded so the card never flashes an empty box. **Only one photograph
per product exists**, so the other three swatches currently land on it — the
mechanism is real, the pictures are missing.

**Cards gain a hover state** (an addition to the frame): the tag chips give way
to a SHOP NOW link and the price lifts from 40% to full white. Both are keyed to
`focus-within` as well as hover so the link is reachable by keyboard, and both
sit absolutely in one band so the swap cannot change the card's height.
**The prices are invented** — the frame has none — and need real figures.

Every frame coordinate re-measured after all of it: hero, details and
collections all unchanged, no horizontal overflow at 390 or 1440.

## 2026-08-20 — Collections section (block 3) built from Figma 1748:1152

The concept's third block: a "COLLECTIONS." headline, a standfirst in the top
right, and a row of four product cards over a centred "VIEW ALL JACKETS" button.

**Verified against the frame by measurement.** At 1440 every coordinate is the
frame's own: headline at (40, 130), standfirst 285-wide at (1069, 122), the four
cards at x 40 / 383 / 726 / 1069 at 331×446, each photograph landing on (37, 59)
inside its card, chips exactly 37 tall, button 46 tall and centred. Every card
title breaks into two lines as the frame breaks it. Pixel-diffed against the
frame's render: 3.4 mean difference over the whole section, ink centroids within
a few pixels everywhere.

The cards are a **flex row, not four absolute boxes** — 4×331 + 3×12 = 1360 =
1440 − 80, so the frame's positions fall out of the arithmetic rather than being
restated, and the same markup becomes two columns at `md` and a stack on a phone.
Measured clean at 390 and 820, titles still breaking in two.

**A note on where that measurement had to happen.** Three of the four product
images did not paint under `next/image` on the **dev server** — they loaded,
decoded (verified by drawing each into a canvas: 52–55% opaque, real luminance),
sat at the right coordinates at opacity 1, and still came out blank, while a
plain `<img>` rendered all four. On a production build all four render. So the
fault was the dev server's image pipeline, not the code — which is exactly what
`optimize-3d-scene` §0 warns about, and it nearly cost a "fix" to something that
was never broken. **Product imagery gets checked against `yarn start`.**

Two things are reproduced but not wired, and flagged rather than invented: the
cards carry a `+` glyph with no link behind it, and the colourway swatches are
drawn in the same state — second of four selected — on every card, so they are
a picture of a control and are marked decorative.

New tokens: 14px for the tag chips and 26px for the card titles.

## 2026-08-20 — Wordmark torch restored (regression from the canvas move)

The chrome plate's torch — the disc that lifts the wordmark to full opacity
under the cursor — stopped working in the middle of the hero. Its own component
was never touched; **the pointer plumbing underneath it broke in two ways when
the canvas moved up to the page.**

1. **Two pointer instances.** Consumers each named their own element:
   `hero-scene` the travel region, `hero-wordmark` its `<section>`. The WeakMap
   is keyed by that element, so once they stopped naming the same one the module
   handed out two instances and its "one listener, one loop" guarantee — the
   thing it exists for — quietly lapsed.
2. **The touch target left the section.** The scene's drag target is
   `pointer-events: auto` and 760×760, sitting dead centre of the hero, directly
   over the plate. It travelled with the canvas out of the `<section>`, so
   crossing it fired `pointerleave` on the section and the wordmark's own
   instance dropped `engaged` — killing the torch in exactly the area the
   wordmark occupies.

`acquireHeroPointer` now resolves both ends itself from anywhere inside the
region — events from `[data-product-region]`, coordinates from
`[data-pointer-frame]` — instead of trusting the caller. That makes the two
consumers incapable of disagreeing and makes it independent of mount order,
which matters because the scene is a lazy client chunk and lands *after* the
wordmark. The pointer also exposes its `frame` so the wordmark can convert into
the plate's coordinates through the element actually measured against.

Verified with a real cursor at three positions including dead centre, over the
drag target: the aperture holds opacity 1 throughout and tracks correctly —
cursor (720, 400) against a plate origin of (142, 111) gives 720−142−260 = 318,
measured 316.1, the difference being the pointer's own easing.

**The lesson worth keeping:** a shared-instance registry keyed on a caller-passed
element is only shared while every caller passes the same one. When the tree
moved, nothing errored and nothing failed a build — the guarantee just stopped
holding. Resolve the key from the structure, not from the caller.

## 2026-08-20 — Delays out; product trimmed on the second screen

The client's read was that the jacket "moves oddly, with a delay". Three
separate lags were stacked, and all three are gone.

**The scroll follower is removed.** Added a pass earlier to answer "make it
smoother", it kept the product drifting for ~640ms after the wheel stopped. The
framing tracks scroll directly again.

**Two smoothing filters in series became one.** The rotation was reading the
pointer's *smoothed* position, which is 95% settled after 391ms — the spring's
travel only started after that had run. Rotation now reads the raw pointer and
the spring does the smoothing; the lattice keeps the eased signal, which is what
it wants.

**The rotation spring is eight times quicker at the same calm.** Measured on the
integrator:

| k | d | 50% | 95% | overshoot |
|---|---|-----|-----|-----------|
| 0.060 | 0.850 | 83ms | 133ms | **31.7%** — the spec, the original lurch |
| 0.042 | 0.539 | 250ms | 950ms | 0.0% — critically damped, and the lag |
| 0.345 | 0.450 | 50ms | 117ms | 0.9% — shipped |

Jerkiness was never speed, it was the overshoot springing back. Note the shape:
**raising `k` alone makes this integrator slower**, because critical damping
forces `d` down and the low `d` throws away the velocity `k` just added — which
is why this came out of a sweep over both axes, not out of tuning one.
`sleeveLag` came down 3 → 0.63, exactly the 4.78× the new pair raises peak
angular velocity by, so the sleeve swing the client asked for is unchanged.

End to end the product now answers the cursor in ~150–200ms of wall clock,
against roughly 1.3s before. That figure needed a control: the idle bob never
stops, and two settled frames differ by 6.6 against a full swing of 12.6 — over
half the signal. Without subtracting that floor the first measurement read
"92% still to travel at 100ms", which was nonsense.

**Smaller on the second screen** — 1137 → 1050 units, with the drop cut by half
the difference so the top edge holds at y 65. Hero framing untouched at 518–540
units, and every frame coordinate on both screens unchanged.

## 2026-08-20 — Panels get their fill back; the journey is damped

**Correction.** The specification rows and the button were built as borders over
the artwork, because that is what `get_design_context` reports. The frame fills
both with the lattice: inside those boxes its render measures a median pixel of
13, the cell value, against the product immediately outside. They knock the
artwork out. With the fill restored (`hero-lattice-panel`) the body copy measures
10.8:1 on every row — identical row to row, which is what proves nothing is
bleeding through. The lighting compensation added in the previous pass is gone;
it was treating the symptom.

**The panels animate.** They are opaque, so the WebGL field behind them cannot
light their cells, and they would otherwise sit in a moving field as dead
islands. The pointer is now republished as viewport-space custom properties and
each panel draws the highlight from a `background-attachment: fixed` layer that
sits *under* the lattice's own gap lines — so the glow survives only inside the
cells and reads as squares lighting up, in phase with everything else and with no
per-element geometry. Measured: a panel's median goes 13 → 34 under the cursor
and is untouched two rows away; cost is 0.53ms a frame across seven panels, and
that is with the style recalc forced synchronously.

**The square field now reaches the second screen.** The pointer's listeners moved
to the whole travel region while its *coordinates* are measured against the
canvas, which is pinned to the viewport — measuring against the region instead
would let the highlight slide away on its own whenever the page scrolled under a
still cursor.

**The journey is damped rather than read raw.** A wheel notch is a step change,
and mapping it straight onto the camera makes the product jump once per notch
however smooth the easing curve is. It now chases the scroll through a follower
(95% in ~640ms, frame-rate corrected), which also hands the sleeves a longer
trail because the jiggle reads its velocity.

Product nudged 30 units up and 36 left at its landing spot, on the client's call
— verified by A/B: the silhouette's left edge moves 39–40px.

## 2026-08-20 — The product travels between the two screens

The details screen's photograph is deleted; the jacket there is now the hero's
own 3D model, which grows and sinks into place as you scroll from one screen to
the next.

There is **one canvas and one WebGL context for the whole page**. The product
does not hand off between two renderers — it never changes hands at all, only
its framing does. See [[decisions-log]] ADR-0031 for why a second canvas and a
cross-fade were rejected, and for the sticky-plus-negative-margin shape that lets
a canvas span two sections.

Where the model lands was read off the photograph it replaces rather than
invented: the frame's crop put the jacket's ink 1137 units tall and 259 below the
centre line, and those are the numbers the camera interpolates to. Verified end
to end — the hero's framing is untouched at rest (540 units), and at journey's
end the model reaches 1137 with the collar landing at y 96 against the
photograph's 91.

The journey also turns the product 24° and dims its lights. The dim is
load-bearing, not styling: the live render is far brighter than the photograph,
and its highlights were swallowing rows 03–05. The rim lamp takes the deeper cut
because it sits exactly under the card column. Numbers in the ADR.

Every coordinate re-measured after the move — the hero's nine frame positions and
the details screen's four are all unchanged, one canvas on the page, no
horizontal overflow, and on a phone the canvas lands on the hero's reserved box
to the pixel.

## 2026-08-20 — Details section (block 2) built from Figma 1748:1102

The concept's second block: headline and standfirst on the left, the product
photograph running full-bleed behind everything, a five-row specification list
on the right, and the "EXPLORE THE JACKET" button pinned bottom-left.

**Verified against the frame by measurement**, not by eye — every coordinate at
1440 is the frame's own: intro 344-wide at (40, 122), headline exactly 95 tall,
spec column 417-wide at (983, 122), rows 102/122/122/122/122, title column at
+97, numeral and icon both 17 from their padding edge, button 277×46 at
(40, 714), image window 1494×1160 at (-27, 77). Line breaks match the frame in
every block. Residual deltas are ≤2px and are font-metric rounding — the frame
rounds a 19.8px line box to 20.

Three things worth keeping:

- **The headline needed `text-box: trim-both cap alphabetic`.** At leading 0.8
  its two lines occupy 112px but the frame measures it at 95 — it trims above
  the capitals and below the baseline. Without it the 36px gap below measures
  from the wrong edge and the standfirst sits 17px low.
- **The frame's header is not rebuilt.** The artboard draws the logo, nav and
  cart again because every Figma frame is standalone; the page has one banner.
- **The button was extracted** to `components/ui/frame-button.tsx`. Both frames
  draw the same control at the same size, and the corner-bracket hover would
  otherwise exist in two places and drift.

**A defect in the previous responsive pass surfaced while measuring this** and is
fixed: type steps were on `md` (768) when the adaptive grid changes its base
width at 640, so the 641–767 band rendered the hero's nav and edge statements at
**8.2px**. Steps moved to `sm`; see [[decisions-log]] ADR-0030, which also
records the deeper grid-band question it leaves open.

New tokens: 40% and 25% white as ink roles (`--hero-content-muted`/`-faint`,
distinct from `--hero-rule`, which is an edge), the 70px headline and its 40px
compact step, leading 0.8, and prose/display aliases for the 1.1 leading and
-0.02em tracking the two frames share.

Measured at 390, 700, 820, 900, 1024 and 1440: no horizontal overflow anywhere,
and the hero's own coordinates are unchanged at 1440.

## 2026-08-20 — CTA hover: brackets, not a fill

Third attempt at the CTA's hover, and the first that is not a fill. Solid white
inversion was rejected, then a 10% wash was rejected, for the same reason both
times: **nothing on this page is filled.** Every surface is near-black, every
edge is a hairline, so any wash — at any opacity — lands as a muddy grey
rectangle borrowed from a different site.

So the box no longer reacts at all. Four corner brackets converge on it instead:
10px, drawn from two borders each rather than the marker's SVG (a border cannot
disagree with the box beside it about what 1px means), resting 12px out so they
clear the corner by 2px and read as a separate frame closing in. The vocabulary
is already in the frame — the edge statements are bracketed the same way, and
the reticle badge is the same gesture. The arrow keeps its 4px nudge, and the
label decodes on its own because `ScrambleText` already fires on `mouseenter`
and `focus`.

The brackets are now the focus indicator, so the default outline is dropped to
avoid two rings; it returns under `forced-colors`, where the palette is
substituted and four hairlines are not something to stake keyboard access on.

Verified by measurement, not by eye — this tab never recomposites. Under a real
`:hover` with transitions disabled: background stays `rgba(0,0,0,0)`, all four
brackets read `opacity 1` at `translate 0`, arrow at `4px`. **Transitions must
be disabled to measure this at all** — `getComputedStyle` returns the
*interpolated* value during a transition, and with the animation clock frozen in
a hidden tab every hover target reads as its start value. That cost a detour
into "the CSS is broken" when it never was.

## 2026-08-20 — Tuner removed, hero adapted below the frame breakpoint

**The dev tuner is gone** and the look it produced is frozen as a `LOOK` constant
in `hero-scene.tsx`, with the measurements that justify each value written beside
it. `hero-tuning.ts` and `hero-tuner.tsx` are deleted; nothing reads a runtime
settings object any more.

**The hero is responsive.** The absolute frame now applies from `lg` up; below it
the section is flow — see [[decisions-log]] ADR-0029 for why scaling or cropping
the frame were both rejected. `md` handles the awkward 640–1024 band, where the
root font-size follows a 1024 base and a phone-shaped layout would otherwise
render small: type steps up, the product's box goes from square to 16:9, and the
corner cards pair into a row.

Measured at three widths — 390, 820, 1440. No horizontal overflow at any of them,
and at 1440 every frame coordinate is back to the frame's own value: logo 40/24,
cart at 1302, markers at 40 and 1215, cards 263×68 at (40, 692) and 222×68 at
(1178, 692), CTA 170×46 at (635, 714).

Two regressions caught by that check rather than by eye, both written up in the
ADR: `lg:w-auto` silently beat the frame's own width and collapsed the cards to
2px, and re-tiering the CTA's gap to `md` removed it from `lg` and left the
button 8px narrow.

## 2026-08-20 — Warm cast: back to the pale rim, after two wrong turns

The frame's faint orange cast comes from the **rim light**, and the original
`#ffd9c0` — hue 28 at about a quarter saturation — was already it. Two attempts
to "improve" that were both rejected, and both are worth recording so they are
not repeated:

- **`#ff5a1e` on the rim.** Hue 16, which is red-orange, not orange. The gap
  between "warm" and "wrong" here is roughly fifteen degrees of hue.
- **An `emissive` term on the shell, plus a third warm lamp.** Emissive makes the
  material glow *from within*, which is a different phenomenon from a warm light
  grazing a lacquered surface, and it looked like one. The reasoning that led
  there was sound — a warm lamp on a near-black base does mostly produce a
  specular dot, and ACES pushes that dot white — but the conclusion was wrong:
  the frame's warmth is a *rim*, faint and edge-bound, not a bloom over the body.

Reverted: no emissive, no third lamp, rim back to `#ffd9c0` at 2.4. The panel is
back to 15 sliders and 3 colour pickers.

**The lesson worth keeping**: when a colour reads wrong, check its hue angle
before reaching for a new mechanism. Both detours were mechanisms invented to
solve what was a 15° hue error.

## 2026-08-20 — Product look dialled towards the reference

Starting values derived from the frame's own product plate rather than guessed.
Measured over it: median luminance **0.055**, p90 0.50, p99 1.0, median
saturation **0.86**, and **69% of lit pixels in the 195–270° azure→indigo band**
with ~14% warm and magenta fringing.

What that forced:

- **The blue is the light, not the material.** Two thirds of the reference sits
  in one hue and a neutral studio environment cannot produce that, so the key
  light carries it and the environment is turned well down.
- **Low metalness.** Tried `metalness: 1` first: the shell becomes a mirror of
  the environment, bright and pale, nothing like the reference. A lacquered black
  shell is a dielectric — dark base, gloss from `clearcoat`.
- **Thin film.** 220–720nm produced a pink-and-green metallic. Blue and violet
  live at 120–360nm; past ~450 the greens and magentas take over. That is the
  first slider to check whenever the jacket goes pink.

**The shell cannot be pure black on this background.** It was sitting near RGB 14
against lattice cells at 13 — the same tone, so the silhouette dissolved into the
grid. Base colour, environment and exposure are each lifted a step, and the rim
is now a pale azure rather than the warm tone it started as: it still draws the
edge that separates the silhouette, without a red cast.

**Not visually confirmed.** The first two candidate sets were seen and both were
wrong; after that the preview stopped recompositing the WebGL layer — sliders
apply and the scene recomputes, but the captured frame is stale, and forcing a
repaint did not clear it. The final numbers are reasoned from the measurements
and need a real browser to judge. The panel exists precisely so that judgement
does not have to be mine.

## 2026-08-20 — Dev tuner for the product's look; CTA hover reworked

**The CTA no longer inverts.** A solid white fill read as a different site's
button against this palette, where every surface is near-black and every rule is
a hairline. Hover now washes the box with 10% of the foreground and still nudges
the arrow 4px; the arrow's `invert` went with the fill.

**`MeshStandardMaterial` → `MeshPhysicalMaterial`.** The reference render's
oil-slick sheen is an **iridescence layer**, and the standard material has no
such thing at any setting — no amount of metalness and roughness reaches it. The
GLB's single material is upgraded in place on load.

Every layer the panel can reach is switched on at construction with a non-zero
value. Three compiles a *different program* when `iridescence` or `clearcoat`
crosses zero, so leaving them at 0 would have stalled a frame every time a
slider passed the origin — `optimize-3d-scene` §3.2.

**`hero-tuner.tsx`** — 13 sliders and 3 colour pickers over material, film
thickness, environment, exposure and both lights, with *Copy JSON* to hand the
settled values back. Measured: the panel is 320×640 in an 800 viewport, the field
list scrolls internally (902px of content in 561px, `overscroll-contain`), and
the header and footer stay pinned. The page behind it does not scroll.

Rendered behind `process.env.NODE_ENV === "development"`, which is a build-time
constant — verified absent from the production chunks. A GUI must never ship with
the scene.

**Values found with it are not settings**: paste them back into `hero-scene.tsx`
as constants. Nothing reads `hero-tuning.ts` in production, because the only
thing that writes it is the panel.

## 2026-08-20 — The remaining roughness was frame rate, not tuning

Three passes of slowing the rotation spring had not fixed "jerky", which was the
clue: a dropped frame reads as jerky however smoothly the maths solves.

**The lattice was shading the whole canvas to produce nothing.** Full-bleed at
1300×750 and DPR 2 is 3.90M fragments a frame; the influence radius is 340px, so
the disc that can ever be lit is 1.45M — **63% of every frame ran `hash`, `atan`
and `hsv2rgb` for an alpha of 0**. The shader now leaves right after the cell
test if the cell is beyond the radius of *both* the live and the lagged pointer
(a fast sweep can put a cell outside one and inside the other). Measured after:
the falloff is untouched — 11 → 8 → 7 → 6 → 6 → 2 → 0 by 300px, against an
early-out at 390px, so nothing visible is clipped.

Going full-bleed for the lattice is what introduced this: the canvas grew from
760×760 to the whole section, and the shader grew with it.

**`fpsScale` was dimming the layer, which saves nothing** — the fragments still
ran. A sustained drop below 50fps now also steps the pixel ratio down 2 → 1.5 →
1.25, which is the lever that actually buys frames.

Rotation spring 0.033/0.634 → **0.042/0.539**: 95% in 935ms, still 0% overshoot.
A modest step; past roughly a second the tail stops reading as weight and starts
reading as lag.

## 2026-08-20 — Rotation slowed again; a hover on the CTA

**Rotation spring 0.06/0.63 → 0.033/0.634.** Still critically damped, still 0%
overshoot, but twice as long a tail: 50% of the travel in 200ms so it keeps
answering the hand, 95% in 768ms where it used to be 384ms. While the cursor is
moving, that extra lag is what reads as weight rather than as chase.

**The CTA now inverts on hover** — white fill, black label — and the arrow slides
4px and inverts with it, or it would vanish into the fill. `focus-visible` gets
the identical treatment, so a keyboard user sees the same affordance. The label
already decoded on hover; it is a `ScrambleText`.

Both are CSS `transition-*` on `--duration-normal` with `ease-entrance`, which is
precisely the exception ADR-0014 carves out of the springs-only rule: a discrete
two-state colour change plus a few-px decorative nudge. Nothing here is
scroll-driven, staggered or interruptible, so none of it wants a spring.

**Verified** from the compiled CSS rather than by forcing `:hover` with a script,
which does not reliably apply: `hover:bg-hero-content`, `hover:text-hero-surface`,
`group-hover:translate-x-1`, `group-hover:invert` and the `focus-visible` pair all
emit, and the measured transition is `0.25s cubic-bezier(0.2, 0, 0, 1)` — the
token, not a literal.

## 2026-08-20 — Idles on the two corner marks

- **Globe turns about its vertical axis** — `perspective(110px) rotateY()`,
  swinging ±58° every 3.4s, so it narrows to 53% of its width at the extreme.
  A flat `scaleX` narrows the glyph the same amount but reads as a *squash*;
  only perspective grows the near edge while the far edge shrinks, and that
  asymmetry is what sells it as a turn. It swings either side of face-on rather
  than going all the way round: past 90° a flat glyph mirrors, and a sphere must
  never read as inside-out. Spinning it in plane was never an option — that
  reads as a coin turning on edge.
- **Reticle does not rotate.** A sight is aimed, not swept. It pings instead:
  rise in 0.24s, fall over 0.77s, rest for 1.39s of every 2.4s, peaking at 1.16
  with the opacity riding the same envelope. Rest is most of the cycle on
  purpose — a steady throb just flickers in the corner of the frame.

Both are single white paths, so nothing inside them can move independently — the
motion had to suit the whole shape. Driven from the shared ticker with a sine,
like the product's idle drift: `@keyframes` are banned and these loop forever, so
a `transition` cannot express them either. Only `transform` is written, and only
while the mark is on screen.

**Verified**: the transform curves, offline — the globe stays in 0.82–1.00 and
never inverts, and the reticle's dip occupies 14% of its cycle. In-page the
first ticks land correctly and then stop, because the mark's
`IntersectionObserver` reports it off screen in a permanently hidden preview tab
and the subscription correctly drops. The loop itself needs a real browser.

## 2026-08-20 — The jacket felt twitchy; the springs were tied to the display

Two causes, both measured, neither of them "too fast".

**The springs advanced per frame, not per unit time.** The same constants settle
in 384ms at 60Hz and **191ms at 120Hz** — so on a ProMotion screen the product
arrived twice as sharply as it was tuned to. Everything physical now runs on a
**fixed 1/60s timestep** with an accumulator capped at 4 steps: 60/90/120/144Hz
all measure 383–400ms to 95%, 0% overshoot. The pointer's own lerp had the same
flaw and is now converted from its per-60Hz-frame value to the real frame time.

**The bone chains were saturating.** Hover rotation reaches far higher angular
velocities than the old drag did; at `JIGGLE_DRIVE = 9` a sweep asked the sleeves
for ~45° of lag against a 10° limit, so they slammed into the clamp, sat pinned
there for the whole sweep and released together. Drive is now 1.1 and the limit
is approached with `tanh` instead of a hard clamp — a sweep now asks for 5.6°,
eased to 5.0°, with headroom left.

> [!important] These constants are quoted per 60Hz frame
> `TILT_STIFFNESS`, `TILT_DAMPING`, `LERP` and the jiggle pair only mean what
> they say if they are stepped 60 times a second. Anything new that integrates
> them belongs inside the fixed-step loop, not in the render frame.

## 2026-08-20 — Torch on the wordmark plate

Hovering lifts the chrome wordmark to full opacity **under the cursor only**; the
rest of the plate stays at its resting 20%.

- `hero-wordmark.tsx` — the plate plus the torch. Built as a **moving aperture
  over a second copy**, not a mask that follows the cursor: animating
  `mask-position` repaints the whole plate (~2.8M device pixels here) every
  frame, whereas this changes only a `transform` on two boxes and the compositor
  takes it without a repaint. The aperture translates to the cursor and the copy
  inside translates back by the same amount, so the copy stays pinned to the
  plate while the hole slides across it. The soft edge is a *static* radial mask
  on the aperture, so it never re-rasterises either.
- `acquireHeroPointer()` — the pointer is now a refcounted instance shared per
  section. The lattice, the product and the plate all read one listener and one
  loop, which is the property the spec is actually asking for; before this the
  scene owned the only instance and a second consumer would have had to build
  its own.

**Verified**: the copy inside the aperture stays pinned at the plate's origin
(142, 111) at every aperture position, and is sized to the plate (1157×617) not
to the aperture — get that wrong and `object-cover` frames a different crop, so
the torch would reveal the wrong part of the wordmark.

**Not seen end to end.** The preview tab is `document.hidden`, so the pointer's
own `IntersectionObserver` gate never opens there and `intensity` stays 0, which
correctly suppresses the torch. Driving the aperture by hand confirms the
geometry; the hover trigger itself shares the scene's already-proven path.

## 2026-08-20 — Product rotates on hover, on both axes

Replaces the press-and-drag turntable. Moving the cursor now turns the product
about its vertical axis (±140°) and rolls it in the screen plane (±35°) —
"по кругу" and "вокруг" at once. Press-and-drag stays on touch only, where there
is no hover to read; letting a fine pointer drag as well would stack an
accumulating turn on top of an absolute one.

**Absolute, not accumulated.** The cursor's position in the section *is* the
angle. Accumulating from movement winds up: sweep back and forth and the product
drifts further every pass with no way home. The absolute mapping still produces
angular velocity, so the sleeves and straps trail exactly as before — the jiggle
now reads the roll, the turntable and a touch fling together.

The two pivots stayed, but their roles swapped: the **roll is outermost** so it
always reads as a roll on screen, with the turntable inside it in the product's
own frame. The other way round, a rolled product turns about a tilted axis and
the two visibly fight.

**Measured**, by pumping an exact number of frames between synthetic pointer
events and reading the resolved angles: cursor at the far left resolves
−116.7° against a −116.7° target, far right +116.7°, dead centre 0° on both
axes, and the bottom edge gives a −27.9° roll against ny 0.797 × 35°. Returning
to the centre zeroes both, which is the property the absolute mapping exists for.

**A harness note, since it produced two false negatives already.** Pumping the
loop by hand in a hidden tab is fragile: the queue can empty and leave `__step`
doing nothing, and `pointerleave` from stray real input silently drops
`intensity` to 0, which zeroes every target and reads exactly like "the rotation
is broken". Re-dispatch `pointerenter` and confirm `intensity` is 1 before
believing any angle.

## 2026-08-20 — Hero interaction layer

Built the interactive spec: a pointer-reactive lattice and a product that tilts,
turns and carries momentum.

**New**
- `hero-pointer.ts` — the section's only `pointermove` listener and only pointer
  loop. Smooths at lerp 0.12, ramps presence in at 250ms / out at 400ms on
  `easeOutCubic`, tracks `idle | hover | dragging`, and keeps a 100ms sample ring
  so a release can be handed a real velocity. Gated by `IntersectionObserver`.
- `hero-grid.shader.ts` — the lattice. 50px pitch, 44px box (the static CSS
  lattice's 10/8 fill ratio, so the two read as one material), value quantised
  **per cell**, 340px `smoothstep` radius, ceiling `rgba(255,255,255,0.10)`,
  hue from the bearing to the cursor with saturation capped at 0.35 and tied to
  the falloff, and a `hash(cellId)` phase so neighbours never ignite in step.
- `hero-scene.tsx` — replaces `hero-subject.tsx`. Full-bleed canvas carrying both
  layers; see [[decisions-log]] ADR-0028 for why they share one.

**Measured, not assumed.** Rendering the shader offscreen and reading pixels
back: boxes are 44px with 6px gaps at 50px pitch; alpha inside a box is constant
(min = max), which is the quantisation the stepped look depends on; falloff
reaches zero at 350px against the 340px radius; saturation runs 0% at 350px →
20% at 150px → 31% at 50px against the 0.35 cap, so the periphery is steel and
colour only appears in the core.

**The turn integrates raw travel, not the smoothed position.** Integrating the
smoothed value loses rotation on a quick flick: it is still catching up when the
button comes back up, and the remainder is dropped. Smoothing stays on the
lattice and the tilt, which want easing; the gesture tracks the hand.

**A note on verifying this in the preview.** The scene's visibility gate —
correctly — never opens in a tab that is permanently `document.hidden`, so the
loop has to be driven by hand. Two ways of doing that are traps:

- `setTimeout` is clamped to ~1s in a hidden tab, so a drag gets two frames and
  the accumulated angle looks like nothing happened.
- A `MessageChannel` pump runs at full speed but **starves the main thread of
  input** — real pointer events stop arriving entirely (measured: zero
  `pointermove` on the section), which also reads as "the drag does nothing".

Both produced a false negative here. What works is holding the rAF callbacks in
a queue and flushing an exact number of frames between synthetic pointer events.

**Still not verified end to end**: the touch gesture split and the sub-50fps
dimming — the harness cannot produce a real touch, and the frame budget needs a
real GPU under load.

## 2026-08-20 — Product enlarged, wordmark plate pulled in off the edge copy

At 20% the plate's strokes were crowding the edge statements — measured, not
guessed: across the copy lines the ink reached x 204–1236 against copy at 40–196
and 1215–1400, so 8px of clearance on the left and a **21px overlap** on the
right. Both sizes changed, recorded in DESIGN-MAP.md:

- Plate to **92%** (1157×617, centre unchanged) — ink now 245–1195, clearing the
  copy by 49px and 20px.
- Product to **540 units tall** (was 500) in a **760** box (was 650), ink centre
  16 units higher at y 364. The box had to grow: the mesh is 1.34 as wide as it
  is tall, so 540 tall is 724 wide and 650 could not hold it. The up-shift is
  forced too — a 540-tall product centred where the frame centres it reaches
  y 650, and the lede starts at 646.

**`hero-subject.tsx` framed on height alone**, which silently crops anything
wider than the canvas — the camera cannot tell that the sides ran past the
viewport. It now takes the greater of the height fit and a `MAX_WIDTH_FRACTION`
width fit, and re-frames on resize, since the width fit depends on the camera
aspect.

## 2026-08-20 — Wordmark plate raised to 20%, pinned behind the product

The plate now runs at 20% rather than the frame's 8% — peak stroke RGB 61 against
the lattice's 13, where 8% gave 32 and read as a ghost. A deliberate, recorded
deviation (DESIGN-MAP.md), not a drift.

- The stage got `isolation: isolate`, and the plate/model are explicitly `z-0` /
  `z-10` inside it. Document order alone had them right, but the model's `z-10`
  would otherwise share a stacking context with the frame's copy, which is also
  `z-10` — so the product could start painting over the text. Now the plate can
  be brightened freely without ever coming over the jacket.

**The plate stayed invisible after all of this, and the cause was not the CSS.**
Swapping the dark export for the chrome one under the same filename left the
`next/image` URL unchanged, so the optimizer kept serving the cached dark bytes —
from `.next/dev/cache/images`, which survives a dev-server restart and holds
entries for 4 hours. Disk and the raw `/assets/…` URL both had the chrome file
(brightest 246); `/_next/image` was returning the dark one (brightest 19.7) the
whole time. Cleared, and written up in [[folder-structure]] with the two curls
that tell the two apart — **compare the raw path against the optimized one before
touching any CSS.**

## 2026-08-20 — Product is a live 3D model; hero assets renamed

The flat jacket render is gone; the hero now renders `hero-jacket.glb` live on
`three`. See [[decisions-log]] ADR-0027 and [[tech-stack]].

- `src/views/home/hero/hero-subject.tsx` — the renderer. Plain three.js on the
  shared ticker, drawing on demand; code-split with `next/dynamic({ ssr: false })`
  so it never reaches the server bundle. The canvas keeps the exact 650-unit box
  the flat plate had, so nothing around it moved.
- `public/draco/` — self-hosted Draco decoder. The mesh is Draco-compressed and
  will not load without it.
- `three` + `@types/three` added. **No fiber/drei** — reasoning in ADR-0027.
- `public/**` is now excluded from ESLint: it was linting the vendored decoder.

**Assets renamed — the old names were wrong and one collided.**

| Was | Now | What it actually is |
|-----|-----|---------------------|
| `hero-mountains.png` | `hero-wordmark.png` | The **brand wordmark**, not mountains — the plate behind the product. Now the supplied 4× **chrome** export (5028×2684), which is the artwork the frame actually uses. |
| — | `hero-wordmark-dark.png` | Dark finish of the same wordmark. Not the frame's plate; unused. |
| `hero-logo.png` | `hero-logo.png` | Restored: the 75×30 header mark **with** its ARTEFAKT line, re-exported from Figma at 4×. It had been overwritten by a wordmark drop. |
| `hero-jacket.png` | *(deleted)* | Superseded by the model. |

**Worth remembering**
- The plate reads as mountains at 8% opacity. It is the wordmark. Naming it
  `hero-mountains` sent the next person looking for a background that was in the
  frame the whole time.
- **But it genuinely was invisible**, and not because of the name: the originally
  supplied `Background Image.png` was the *dark* finish of the wordmark, peaking
  at RGB 20. At the frame's 8% that lands on 14.6 against a lattice of 13 — a
  1.6-level difference, i.e. nothing. The chrome finish peaks at 251 and lands on
  33, matching the 32 measured in Figma's own render. Two finishes, same alpha
  mask, ten-fold difference in luminance: **compare luminance, not alpha**, when
  identifying a plate. Checking alpha alone is what led to the wrong file.
- `verify.sh`'s `duration-fast|normal` check matched its own correct form,
  `duration-[var(--duration-normal)]`, as a substring and reported a FAIL for
  code that was right. Tightened, and checked in both directions.

## 2026-08-20 — The hero copy boots up

Every piece of copy in the hero now resolves through the same decode effect as
the nav, staggered into a cascade on load: nav → edge markers → lede → CTA →
corner cards. Delays live in one table, `HERO_REVEAL`
(`src/views/home/hero/hero.motion.ts`).

- `<ScrambleText>` gained `revealDelay` (decode once on mount) and `maxSteps`.
- `maxSteps` (22) is what makes a mixed cascade read as one effect: the tick rate
  stays 40ms everywhere and a longer label resolves several characters per step,
  so the 38-character lede runs ~760ms instead of grinding through 38 steps at
  1.5s while a 4-character nav item finishes in 160ms.
- Blocks still arrive on a `<Spring>` fade. The spring is the motion, the decode
  is the content — and the fade covers the frame where the resolved text would
  otherwise flash before its own decode begins.

**`spring-text-engine` is now unused in `src/`.** The lede and the edge markers
were its last two callers; both are decodes, which the engine cannot express
(ADR-0026). The package stays installed and [[text-engine]] stays canonical — it
is still the tool for a prose or headline reveal, and hard rule #1 still routes
that kind of text animation to it. `HERO_WORD_GAP_EM` went with them.

## 2026-08-20 — Decode-on-hover effect on the header nav

Nav items and the cart link now scramble and resolve left to right on hover or
focus, in the manner of pixelvault.fit: ~40ms per step, one character resolving
per step, drawn from an uppercase/digit/symbol pool.

- `src/components/ui/scramble-text.tsx` — `<ScrambleText>`, the first entry in
  `components/ui/`. See [[components/ui]].
- `src/hooks/use-scramble-text.ts` — the effect itself, running on the shared rAF
  ticker rather than a `setInterval` per link, so the page keeps one loop and the
  effect pauses with the tab.

**Worth remembering**
- This is a deliberate, narrow exemption from hard rule #1: the text engine
  springs a *property* of a letter, and this effect changes no property — it
  substitutes the characters. [[decisions-log]] ADR-0026 sets the boundary.
- The scrambled glyphs are `aria-hidden` with the real label in a visually-hidden
  copy, so the accessible name stays put while the visible text churns.
- `<ReducedMotion>` cannot switch this off — it toggles react-spring's
  `skipAnimation`, which this never touches — so the hook reads
  `prefers-reduced-motion` itself.
- Whitespace is held fixed across steps, so `CART [ 0 ]` keeps its shape; the
  reference scrambles spaces too.

## 2026-08-20 — Hero fills the viewport, width and height

The 1440 frame was pinned and centred above its design width, so wide screens got
side margins and a dead band under the 800px frame. The `1440` font-size rule is
now unbounded upwards, so the design scales to fill any viewport ≥ 1025px, and
`<AdaptiveGrid />` is no longer mounted — scaling is pure CSS, with no flash of
unscaled layout on first paint. See [[decisions-log]] ADR-0024.

- The lattice and `min-h-lvh` moved from the hero section onto the page wrapper:
  in the frame the lattice sits behind everything including the header, and on
  the page it stays full-bleed and full-height at any aspect.
- The hero now fills the viewport **height** too: `h-lvh min-h-200`, with each
  piece anchored to the edge the frame anchors it to rather than the whole frame
  being scaled to fit. Scaling to cover would have cropped the four corners off a
  16:10 window; scaling to fit left the band. See [[decisions-log]] ADR-0025.
  The lede moved to `bottom-29.5` (118px above the base, as in the frame) and the
  two plates to `top-1/2` plus a half-height margin — a margin, not a translate,
  because the subject's spring animates `scale` and writes `transform` itself.

**Fixed along the way**
- The backdrop plate is the LCP element and was lazy-loading — now `priority`.
  (This was the "1 Issue" in the Next dev overlay.)
- `size-2.625`, `h-1.125` and `w-1.3` emitted **no CSS at all**: Tailwind's
  dynamic spacing scale only accepts multiples of `0.25`. The corner brackets and
  the nav caret were silently falling back to their intrinsic attribute sizes.
  Now `size-2.75` / `h-1.25 w-1.5`, which is what they were rendering anyway —
  and they scale with the grid instead of being frozen in px.

## 2026-08-20 — Hero section built from Figma

Built the Get Layers hero (Figma `WINXFW2nTM7zYwd5dGgm1T`, node `902:304`,
1440×800) into the home view. Node IDs are recorded in `DESIGN-MAP.md`.

**Added**
- `src/views/home/` — the view plus its `hero/` section components
  (`Hero`, `HeroHeader`, `HeroStage`, `HeroMarker`, `HeroTitle`, `HeroCta`,
  `HeroBadge`). Replaces the flat `src/views/home.tsx`.
- `src/data/mocks/home.ts` — hero copy and asset descriptors.
- `public/assets/hero/` — 3 rasters, 5 SVGs. See `DESIGN-MAP.md`.
- **IBM 3270** via `next/font/local` (`src/app/fonts/3270-Regular.otf`), bound to
  `--font-mono`. No new package — `next/font` is already in the framework.
- Hero tokens in `globals.css`: surface / lattice / content / rule colours, a
  12·18·20px type ramp, 0.9 and 1.1 leadings, −0.02em tracking, lattice geometry.
- `@utility hero-lattice` — the frame's background grid. Figma exported node
  `902:305` empty, so the pattern was rebuilt from pixels sampled off the
  reference render: 10px pitch, 2px gap, `#0d0d0d` cells, half-gap offset.

**Changed**
- `body` no longer forces `100vh`/`100vw` + flex centring. That was the empty
  starter's placeholder; it clipped real content and would have broken Lenis
  scrolling for every later section. It now sets colours only.

**Worth remembering**
- `TextEngine`'s `columnGap` default (0.3em) and `"inherit"` (resolves to
  `normal`, i.e. no gap) both mis-set this copy. IBM 3270 is monospaced at an
  0.54em advance, so `HERO_WORD_GAP_EM` reproduces the space it replaced.
- The hero uses `<Spring>`, not `<Inview>` — see [[decisions-log]] ADR-0023.
- Only the 1440 frame exists. Above it the canvas is pinned and centred; at or
  below 1024 it clips. Tablet and mobile frames are still needed.
