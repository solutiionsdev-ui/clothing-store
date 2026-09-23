---
tags: [meta, decision]
updated: 2026-08-28
---

# Decisions Log (ADRs)

Why this project's conventions are what they are. Each entry records a decision,
the reasoning behind it, and what it constrains when you build.

These are **inherited from the starter** — they explain the rules in `AGENTS.md`
and across the vault, and notes link to them by number. Add your project's own
decisions on top, continuing the numbering. Amending an inherited decision is
fine; write a new ADR that says so rather than editing the old one.

Template: [[templates/adr-note]].

---

## ADR-0047 — The page's lattice is two layers; only a card may paint its own

**Status:** Accepted · 2026-08-28 · amends [[decisions-log]] ADR-0038, which
stands for cards and no longer for the page

**Decision.** The page shell wears `hero-lattice-shell` — a background colour
and nothing else — and the surface it used to paint is two `aria-hidden`
elements in front of it: `hero-lattice-beam` (`position: fixed`, the three
pointer-highlight gradients) and `hero-lattice-bars` (`position: absolute`, the
grid). In that order, both before the page's content. `hero-lattice-panel` is
unchanged and stays on the cards.

**Why.** A `background-attachment: fixed` layer cannot be scrolled by the
compositor. It is re-*painted* every frame across the element's whole visible
area, and on the page shell that area is the entire viewport for the length of
the document. ADR-0038 knew this and measured it — "a 3000px scroll held 16.7ms
median" — and accepted it, because 16.7ms reads as 60fps and 60fps reads as
fine.

**16.7ms was not fine; it was half.** The panel is a 120Hz display and the rest
of this page runs at 8.4ms. That one element was holding every content section
at exactly half the refresh rate, and half rate next to full rate is what a
reader calls lag — which is how this surfaced, as "the collections cards lag",
from a section whose cards are not the cause.

**Measured, production build, real Chrome, a 9-second sweep of the whole page at
4× CPU throttle:**

| band | before | after |
|---|---|---|
| frames delivered, whole page | 678 | **755** |
| details, median frame | 16.1ms | **8.6ms** |
| collections, median frame | 15.9ms | **9.4ms** |
| technology, median frame | 8.5ms | 8.4ms |

Isolated first by ablation: overriding `background-attachment` to `scroll` on
**the shell alone** recovered the whole win (757 frames), and on every card
*except* the shell recovered almost none (693). The cards cost roughly what
their area says they should, which is very little.

**What was ruled out, since it was the reported suspect.** The collections
cards' pointer tilt — `perspective`, `preserve-3d`, a `translateZ` layer, four
cross-faded photographs per card — costs nothing measurable. With the
perspective and the 3D context forced off, collections holds 10.0 and 14.8ms
across two runs against a 10.0/10.2 baseline; with the three inactive
photographs set to `display: none`, 10.2 and 9.2. Both are inside the run-to-run
noise. There is no `will-change` on these cards to remove.

**Why this preserves the picture exactly.** The two halves keep the anchoring
they already had — the beam was viewport-anchored and is now a viewport-fixed
element; the bars were `scroll`-attached to this same box and are now an
absolute element filling it. Paint order was the layer list and is now tree
order, which is why **the beam must come first and the bars second**: the bars
paint over the light, and that is what makes the highlight read as the grid
brightening rather than as a lamp shining across it.

Verified by pixel diff at four scroll positions with the pointer variables
pinned. Collections is identical (0.084% of pixels differ, maximum channel delta
**3**). The top, details and FAQ frames differ by 5.9%, 5.9% and 0.34%, all of
which is the hero and FAQ product scenes sitting at a different turntable phase
and two patches of mid-flight scramble text — a same-build capture repeated
twice differs by 8.5% in the same places. The diff shows no change anywhere on
the lattice, the panels or the highlight. That the beam is genuinely painting
was checked separately: hiding it moves 6.27% of the pixels.

**What this constrains.**

- **The two layers are ordered, and nothing may come between them.** Swapping
  them does not error, it just stops looking like the page.
- **Nothing static may be a direct child of the shell.** Both layers are
  positioned with `z-index: auto`, so they sit above any non-positioned sibling
  whatever the tree order — the content would go under the grid. There are none
  today; adding one is the trap.
- **ADR-0038 still governs the cards.** A panel is small, its repaint is
  bounded by its own box, and a card cannot hold a document-tall fixed layer
  anyway. Do not "fix" the panels by copying this.
- The prohibition ADR-0038 added holds for the panels and is now moot for the
  shell: a transform on an element makes it the containing block for its own
  `fixed` layers. The shell has no fixed background left to lose, but
  `hero-lattice-beam` is a fixed *element* and a transformed ancestor would
  capture it the same way.
- **The bars are now their own declaration, which makes them safe.** All five
  layers used to share one `background-image`; the highlight reads
  `--hero-pointer-x`, and an unset custom property invalidates the whole
  declaration — the grid would have gone with it. The defaults at `:root`
  (`-100vw`) meant this never fired, but the two are no longer coupled.
- The beam is `display: none` under `(hover: none) and (pointer: coarse)` — the
  same query `PointerField` bails on. It could never be visible there, and a
  full-viewport fixed element is a composited layer whether or not it paints
  anything. Keep the two queries identical.

---

## ADR-0046 — The reel is a canvas over keyed stills, not a scrubbed `<video>`

**Status:** Accepted · 2026-08-28 · supersedes [[decisions-log]] ADR-0042,
ADR-0044 and ADR-0045, and takes up the option ADR-0045 held in reserve ·
amends ADR-0040 (the scrub stays; its mechanism changes)

**Decision.** `technology-reel.tsx` renders a `<canvas>` and blends between two
pre-decoded stills every frame. `technology-stack.mp4` is no longer served:
`.claude/scripts/video/frames.mjs` exports it to two tiers of keyed WebP —
**61 × 768px** above `lg`, **41 × 512px** below — and the component fetches them
through `createImageBitmap` and draws them itself. The SVG `feColorMatrix` key
is baked into the frames at export; the filter survives only for the poster.
`SOURCE_FPS` and `CLIP_TAIL` are gone.

**Why, after three ADRs said the scrub was fine.** They were right and it did
not matter. ADR-0044 got the seeking to provably optimal — every distinct
picture presented, in order, no repeats — and ADR-0042 made each seek O(1).
Measured again here on a production build in real Chrome over a 2400ms
traversal, **frame timing was never the problem and is unchanged by this
rewrite**: 8.4ms median and 16.7ms at the 95th percentile either way, with no
frame over 25ms.

What was wrong is that a decoder can only ever present *a whole picture*, and
the reader's scroll does not land on picture boundaries. ADR-0045 saw this
clearly and answered it by doubling the asset — baking a fixed 50/50 blend into
every second frame to buy more discrete pictures per second. That is the right
idea aimed one level too low: the blend a scroll position actually wants is
almost never 50/50, and no amount of pre-baking can supply the one it wants.

**Measured, same harness, same machine, video against canvas:**

| | scrubbed `<video>` | canvas over stills |
|---|---|---|
| display frames showing a new picture | 51.5% | **99.5%** |
| longest unchanged run (display frames) | 2–3 | **1** |
| same, at 4× CPU throttle | 55.2% | **99.5%** |
| frame time median / p95 | 8.4 / 16.7ms | 8.4 / 16.7ms |
| frames over 25ms | 0 | 0 |

The picture now changes on **every** display frame, at reading speed and at 4×
throttle alike. That is the "complete answer at every speed" ADR-0045 predicted
and declined to build.

**The blend is additive on a cleared canvas, and getting this wrong looks like a
smear.** Drawing frame A and then frame B at `globalAlpha = t` under the default
`source-over` is not a cross-dissolve: where B is transparent A survives at full
strength, so the stack's old position never leaves. Clearing first and adding
`(1−t)·A + t·B` with `globalCompositeOperation = "lighter"` interpolates colour
*and* alpha in premultiplied space, which is the correct dissolve. The weights
sum to one, so nothing clips.

**Why fewer frames, not more.** Continuous interpolation is what decouples
picture count from smoothness, so the export goes the opposite way from
ADR-0045: 242 frames become 61. What the count now bounds is not the frame rate
but how much *motion* one blend has to span — 1/12s here, on a slow translation
that does not ghost. The tail goes too: 99.1% of the clip's movement is over by
4.4 of its 5.04 seconds, and shipping the rest cost memory to hold seven copies
of one still. `CLIP_TAIL` was that trim expressed at runtime; it is now
expressed in the asset.

**The real constraint is resident memory, and it is why there are two tiers.**
A decoded `ImageBitmap` costs `side² × 4` bytes however cheap it was on the
wire, so the desktop set is **137MB** resident against 2.77MB downloaded. That
is the number that sizes this decision, not the download — and it is why the
tier is chosen by **viewport width, not device pixel ratio**: a phone at DPR 3
asks for more backing store than the desktop box does and has far less room to
hold it. Below `lg` the section drops its pinned stage anyway and the box is a
third of the size.

**What this constrains.**

- **Frames are fetched and decoded through `createImageBitmap`, never drawn from
  an `<img>`.** An `<img>` defers its decode to the first `drawImage`, and that
  decode is synchronous and on the main thread — it would put back exactly the
  stall this removes. `createImageBitmap` off a blob decodes on a worker thread.
- **Do not raise the tiers without recomputing the resident cost.** 121 frames
  at 1024px is 507MB and will kill a tab. Full sharpness at that count needs
  compressed GPU textures and a WebGL path, which this section does not have.
- **The key lives in two places and must move as one** — `KEY_WEIGHT` /
  `KEY_FLOOR` in `technology-reel.tsx` (poster only) and the same constants in
  `frames.mjs` (every frame). They are tuned to this artwork; ADR-0040 has the
  measurements. Verified equal after the rewrite: the corner pixel keys to
  alpha 32/255 under both, which is the encoder's own noise floor and the haze
  ADR-0040 accepted as the limit of a luma key.
- **`mix-blend-mode` is still out**, for ADR-0040's reason: the stage is pinned
  with `position: sticky`, which creates a stacking context the page's lattice
  is outside of. The frames carry a real alpha channel, which survives it.
- The poster is now the element carrying the alt text, and the canvas is
  `aria-hidden` — the artwork is described exactly once, and it stays described
  after the poster fades.
- `SEEK_FOLLOW` keeps its value and loses its justification. 0.45 was a truce
  with the decoder — below it the chase asymptoted and the requested frame
  *index* stopped changing. There is no index now, so any coefficient keeps the
  picture moving and 0.45 is simply the feel the section shipped with.

**The mp4 stays in the repo** as the export's source — `frames.mjs` reads it —
but nothing fetches it. Its even frames are the real ones; ADR-0045's synthetic
in-betweens are dropped on the way in.

**Regenerating.** `node .claude/scripts/video/frames.mjs`. This machine has
`ffmpeg` now, which it did not when ADR-0045 was written.

---

## ADR-0045 — The reel is 48 fps, half of it blended in-betweens

**Status:** Accepted · 2026-08-27 · client's call between three options ·
extends [[decisions-log]] ADR-0042 and ADR-0044

**Decision.** `technology-stack.mp4` carries **242 frames at 48 fps** instead of
121 at 24. Every second frame is a synthetic 50/50 cross-blend of its two
neighbours. `SOURCE_FPS` in `technology-reel.tsx` is 48 to match. 1280×1280,
all-intra H.264, 9 Mbps, **5.44MB** (from 3.61MB).

**Why, and why this was not a code bug.** After ADR-0044 the scrub was provably
optimal — measured over a traversal: every one of the 106 distinct pictures
presented, **in order, zero repeats, zero backward steps**. The remaining judder
was the *asset*: 106 pictures spread over the whole travel means that at a
reading scroll speed you cross a picture boundary about every 2.3 display
frames, and 2.3 is not an integer, so the hold alternates irregularly —
`2,3,2,3,2,2,2,3,…`, 76 holds of two frames against 29 of three. That is 3:2
pulldown judder, and no amount of seeking fixes it. It is also why it was
intermittent: above ~1000 px/s every display frame gets a new picture and the
same code looks perfect.

**Measured after** (same bench, presented frames via `requestVideoFrameCallback`):

| traversal | pictures/s before → after | hold, display frames |
|---|---|---|
| 5000ms | 21 → **42** | 2–3 → 1–2 |
| 4000ms | 26 → **53** | 2–3 → 1–2 |
| 3000ms | 35 → **60** | 1–2 → **1** (1% irregular) |
| 2000ms | 53 → **60** | 1–2 → **1** (0% irregular) |

At ordinary and fast reading speeds the picture now changes on *every* display
frame. Full-page traversal is unchanged by the larger file: max frame 17.7ms,
no long tasks.

**The cost, stated plainly.** Half the frames are invented. Measured against
their neighbours they are **13% softer** (mean absolute luma gradient 4.57 vs
5.25), which is a motion blur and only ever visible while the clip is moving —
a still hold always lands on a real frame, because the reader stops between
boundaries as often as on them. The file grew 51%.

**Rejected.** *Even-cadence holding* (code only, no asset change) halved the
irregularity at some speeds but only 55% → 29% at the most common one, and it
drops 3–15% of the frames to keep the beat. *Runtime blending on a canvas* is
the complete answer at every speed and stays true to the artwork, but it
replaces the `<video>` with a `<canvas>` and moves the SVG colour key into it —
a rewrite of the section, held in reserve.

**Reproducing the asset.** `.claude/scripts/video/` — `interp.swift` builds this
clip, `reencode.swift` the plain all-intra one. No `ffmpeg` on this machine.
Regenerate from the **original**, not from a shipped file, or the blends compound.

---

## ADR-0044 — The scrub asks for a frame index, and the follower runs every frame

**Status:** Accepted · 2026-08-27 · supersedes the `SEEK_EPSILON` rule in
[[decisions-log]] ADR-0040, and depends on ADR-0042

**Decision.** Three changes to the reel's ticker in `technology-reel.tsx`:

1. The playhead is integrated **before** the `video.seeking` guard, not after.
2. Seeks are quantised onto the clip's own frame grid (`SOURCE_FPS = 24`) and
   issued only when the wanted frame *index* changes.
3. `SEEK_FOLLOW` 0.18 → 0.45, and rebased against the real frame delta.

**Why (1).** The guard sat above the integration, so the follower only stepped on
frames where the decoder happened to be idle. Measured over a 2.5s traversal:
the video reported `seeking` on **125 of 161 frames**, so a lerp quoted per frame
ran on 22% of them. That does not merely lag — the playhead advances in bursts of
whatever backlog accumulated during the decode, and bursts are exactly what reads
as judder. Where the picture *lands* is the decoder's business; where the
playhead *is* is the scroll's.

**Why (2).** ADR-0040's epsilon was `1/60` s on the stated grounds that "a
request finer than one frame of the clip cannot show anything new" — but a frame
of this clip is `1/24` s. Every request between the two was a decode that could
not change a pixel, and it occupied the decoder when a real one arrived. Asking
for an index costs one seek per picture the reader can see, and none that cannot.

**Why (3).** 0.18 was sized for a decoder that had to walk from a distant
keyframe. After ADR-0042 the decoder sustains **115 seeks/s** while a traversal
asks for about 42, so the seek is no longer scarce and the extra smoothing was
being paid for in judder: an exponential chase spends its last frames
asymptoting, and the frame index stops changing while it does. Replaying one
recorded traversal at a range of coefficients, the longest run of unchanged
picture went 0.18 → 10 frames, 0.35 → 5, **0.45 → 4**, 0.8 → 2 — with the count
of distinct frames shown and the lag at the end identical throughout. 0.45 keeps
real smoothing for the paths Lenis does not ease.

**Measured after, production build, real wheel input through Lenis:**
`seeking` **78% → 21%** of frames; longest unchanged run **11 → 3** frames
(median 1, p95 2); frame time median 16.7ms, max 17.7ms, **no frame over 25ms
across a full-page traversal**.

**What was ruled out first.** The SVG `feColorMatrix` key was the obvious
suspect and is innocent: frame timings through the section are identical with
the filter, with it set to `none`, and with the video display-hidden
(median 16.7 / max 17.8 in all three).

---

## ADR-0043 — A mount that builds a WebGL context is scheduled off the scroll frame

**Status:** Accepted · 2026-08-27

**Decision.** [[near-viewport]] (`src/components/common/near-viewport.tsx`) no
longer calls `setNear(true)` inside the `IntersectionObserver` callback. It hands
the mount to `requestIdleCallback` (1s timeout, `setTimeout` fallback).

**Why.** Creating the FAQ product's renderer is ~100ms of synchronous main-thread
work — context creation, the PMREM `RoomEnvironment` prefilter, the first shader
compile — and an `IntersectionObserver` fires *during a scroll*. Measured on an
M1 at 1440×900, production build, walking the full page: a single dropped frame
of **117ms**, landing exactly on the `canvas 1→2` transition. After the change
the same traversal has **no frame over 50ms** (worst 48ms, p99 18.8ms).

`lead = 2` already buys two screens of runway before anything has to be on
screen, so nothing is gained by spending that budget in the frame that happened
to cross the trigger line. The idle timeout is the guarantee that a page which
never goes idle still gets its product.

**What this does not fix.** The two scene instances still build two renderers and
two PMREM environments. A render-target texture belongs to the context that made
it, so the environment cannot simply be shared — collapsing this to one renderer
is an architectural change, not a tuning one. See [[optimize-3d-scene]] §3.

---

## ADR-0042 — A scroll-scrubbed video must be all-intra, and H.264

**Status:** Accepted · 2026-08-27 · makes good on [[decisions-log]] ADR-0040

**Decision.** `public/assets/technology/technology-stack.mp4` is encoded
**all-intra** — every frame an IDR — in **H.264**, not HEVC. Any future clip
driven by `currentTime` inherits both requirements.

**Why all-intra.** ADR-0040 says the decoder "lands wherever its keyframes
allow". The supplied asset allowed nothing: 121 frames, **one** keyframe, so
every seek decoded from frame 0 forward. Measured in Chrome on an M1, seeking
across the clip as the ticker does: **96ms average, 175ms worst** — six frames of
budget for one scrub step, which is the freeze readers were reporting. All-intra
makes every seek O(1): **8.4ms average, 10.8ms worst**, inside a single frame.

All-intra costs bitrate, and it is still a large net win here because the source
was grossly over-encoded: 1440×1440 at 19.8 Mbps. Re-encoded at 1280×1280 —
the clip displays at ~1330×1238 device px, so 1280 is the honest size — the file
went **11.93MB → 3.61MB**.

**Why H.264.** The source was `hvc1` (HEVC). It decodes on Apple hardware and
`canPlayType('video/mp4; codecs="hvc1"')` returns `""` even in the Chrome that
plays it — meaning **Firefox and Chrome on Windows showed no reel at all**. This
was a correctness bug wearing a performance bug's clothes.

**How.** No `ffmpeg` on the build machine and no Homebrew; the re-encode ran
through AVFoundation (`AVAssetWriter`, `AVVideoMaxKeyFrameIntervalKey: 1`,
`AVVideoAllowFrameReorderingKey: false`) from a throwaway Swift tool. Verify any
replacement by parsing the container: **no `stss` box** means every sample is a
sync sample. An `stss` with a small count means the freeze is back.

---

## ADR-0041 — A pinned element's release is a velocity step; ramp it

**Status:** Accepted · 2026-08-27

**Decision.** Anything held by `position: sticky` whose motion the reader is
watching — the travelling product, the technology clip — lags the page as it
un-pins, by `λ(1 − e^(−x/λ))` of the distance scrolled past the release, with
λ at 0.35 of a viewport.

**Why.** A pinned element's apparent velocity is zero while it sticks and the
page's own the frame after it releases. That is a step, and a step in velocity
is what the eye reads as something slamming into place — which is exactly what
was reported twice, first of the product and then of the clip, after both of
their *own* animations had already been eased.

The ramp is a first-order filter on the canvas's own motion, and the shape is
not decorative: the derivative of `λ(1 − e^(−x/λ))` at x = 0 is exactly 1, so
the element starts the release perfectly still relative to the viewport and
eases up to the page's speed over the following λ. There is no discontinuity
left to feel.

**λ is also the largest distance the element can fall behind**, which is what
decides the number. A third of a viewport covered the seam and then some: the
product read as sliding out of its own screen, and the clip — which ends 45
units above its stage's bottom edge with nothing clipping it — hung a sheet of
the stack over the section below. 0.15 bounds the lag at 114px on a 760-tall
window, and the seam is untouched: the derivative at x = 0 is 1 whatever λ is.

**What this constrains.**

- **Measure the layout, not the element you are moving.** The ramp is written
  as a transform, and a transformed element's own `getBoundingClientRect`
  includes it — measuring there feeds the output back into the input and the
  ramp stalls at a fixed point a third of the way in. It cost a debugging pass;
  the clip reads its parent's rect and the product derives the distance from the
  hero's rect, which it already has.
- The distance past the release is derivable without a second rect read where a
  section's geometry already gives it: the product's canvas sticks for exactly
  the hero's height, so anything the hero has scrolled beyond its own height is
  scroll the canvas is no longer absorbing.
- Only where something is actually pinned. Below the frame breakpoint there is
  no sticky element and no seam to cover, and the ramp must stand down.
- A scroll-driven animation should also **land where the pin ends**. The
  technology clip stopped moving 15% before its travel did — mapped over the
  whole run, it showed a still picture and then flew off. Its scrub now ends at
  the point the clip itself stops changing (measured frame by frame), so its
  own landing and the release ramp meet.

---

## ADR-0040 — Scroll-scrubbed video, and why its black ground is keyed rather than blended

**Status:** Accepted · 2026-08-27 (revised the same day — the blend it originally
specified does not work in this section; see below)

**Decision.** The technology stack is a `<video>` whose `currentTime` is driven
by the section's scroll progress on the shared ticker, and whose black ground is
removed with an SVG `feColorMatrix` that writes alpha from the colour channels.
**Not** with `mix-blend-mode`.

**Why scrub rather than play.** The section is already a pinned stage whose
scroll walks a card down the layers. A clip playing to its own clock behind a
composition tied to the reader's reads as two unrelated things happening at
once; on the same clock they are one, and the reader can hold either still.

The playhead *chases* progress rather than being placed on it (`SEEK_FOLLOW`),
for the same reason the product's turn does: a wheel flick asks for a seek of
half the clip in one frame and the decoder lands wherever its keyframes allow.
Requests smaller than a frame are dropped, and a seek is never issued while one
is already in flight — that is what turns a scrub into a freeze.

The run starts a **viewport early** (`ENTRY_LEAD`), so the clip is already alive
as the screen arrives rather than showing its first frame throughout. It still
ends where the card walk ends.

**Why the blend had to go, and the general rule.** The clip is a lit object on
solid black, so untouched it lands as an opaque rectangle with the page's
lattice stopping dead at its edges. `mix-blend-mode: difference` is the obvious
answer, and in this section it does nothing at all: a blend composites against
the backdrop **within the nearest ancestor stacking context**, and the section
pins its stage with `position: sticky`, which creates one. Everything the clip
could blend with is outside it.

Verified rather than argued: with the stage forced to `position: relative` the
blend works and the grid reads straight through the artwork; back on `sticky`,
the black rectangle returns. **`position: sticky` is the trap** — unlike
opacity, transform and filter, it does not look like a compositing property, and
every pinned section in this project has one.

**What this constrains.**

- **Do not reach for `mix-blend-mode` inside a pinned stage.** It will not
  error, it will simply have no effect. Key the asset instead.
- The key is a real alpha channel, so it survives stacking contexts, ancestors
  and the mobile layout where there is no sticky element at all.
- `KEY_WEIGHT` / `KEY_FLOOR` are tuned to *this* clip: measured on a frame, the
  ground is 0 of 765 at the median and 3 at the 95th percentile. A different
  clip with a lifted ground needs the floor re-measured, or a faint rectangle
  comes back. The weight is **7**, raised from the 2.6 first shipped: this
  stack's bottom two layers are genuinely dark — the lining's median pixel is
  0.14 of full brightness — and a gentle weight left them a third opaque with
  the page's grid reading straight through. Measured across the clip at
  7/−0.04, 51% of the frame is fully opaque against 36%, the part-transparent
  band collapses from 15% to 5%, and the clear ground only moves 41% → 39%.
- **A luma key cannot separate dark artwork from a dark ground.** What is left
  translucent at the bottom of this stack is the limit of the technique, not a
  tuning error; buying it would cost a visible rectangle.
- Equal channel weights, not luminance: this artwork is blue and violet, and
  luminance weights blue at 0.07 — the outer shell would key out with the
  ground.
- Reveals on this box are still out and the box is still centred with auto
  margins. Both were removed for the blend and are worth keeping: the scrub is
  the motion, and a transform would isolate anything a later pass tries here.
- Twelve megabytes seven screens down: it mounts through `NearViewport`, like
  the FAQ's product.
- Muted inline playback is primed with a play/pause on `loadeddata`. Without it
  iOS keeps showing the poster and the scrub silently does nothing there.
- Measured cost of the filter: a 1500px scroll held 16.7ms median, 16.8ms at the
  90th percentile, one 33ms frame.

---

## ADR-0039 — Continuous pointer motion may use `@react-spring/web` directly

**Status:** Accepted · 2026-08-27 · narrows [[#ADR-0002]]

**Decision.** Motion whose value is a **continuous function of the pointer**,
rather than a transition between two states, may drive `@react-spring/web`
imperatively from a hook, outside the components in
`src/components/animation/springs/`. `usePointerTilt` is the first.

**Why.** Every component in that folder animates from a `from` to a `to`,
switched by hover, view or scroll progress. A card that leans towards whichever
corner the cursor is in has no `to`: the angle is the cursor's position in the
box, the same way the product's turntable reads the pointer's place in its
section. There is nothing to hand those components. The alternatives were worse
— a CSS-variable bridge would be motion outside the spring engine, and
extending the engine needs the sign-off ADR-0009 reserves.

Hard rule #1 is about the library and the physics: both hold here. Only the
component wrapper cannot express the shape.

**What this constrains.**

- This is not a licence to reach for `useSpring` because a component is
  inconvenient. State-to-state motion keeps using the components; if a value is
  a function of a continuous input, this applies and the file has to say so.
- Drive it imperatively (`api.start`) and read it through `animated` elements,
  so a pointer crossing the page costs no React renders.
- Gate it: mouse pointers only, and silent under `prefers-reduced-motion` —
  what the spring components do for you, you now do yourself.

---

## ADR-0038 — The lattice travels with the page

**Status:** Accepted · 2026-08-27 · amends [[#ADR-0036]]

**Decision.** The whole lattice — cells, bars and the pointer highlight — is
painted by the page's own root element with `hero-lattice-panel`. The bars take
`background-attachment: scroll`, the three highlight layers `fixed`.

**Why.** ADR-0036 removed the second grid by keeping the one on the *fixed*
layer, which cured the moire and left the grid standing still while the page
scrolled past it — the background read as a window onto something else rather
than as the page's own surface. Moving the survivor onto the page fixes that
without bringing the beat back: there is still exactly one grid, and it is now
anchored to the document.

The bars must stay **before** the highlight in the layer list, because that is
what quantises the light into cells; and the highlight layers must stay `fixed`,
because they are drawn from viewport coordinates. A short attachment list is
repeated rather than padded, so all five values are written out.

**What this constrains.**

- Do not put `hero-lattice-panel` on anything a spring animates. A transform
  makes the element the containing block for its own `fixed` layers and the
  highlight silently leaves the viewport's frame.
- Measured cost, since a `fixed` layer on a document-tall element repaints on
  scroll: a 3000px scroll held 16.7ms median, 16.8ms worst frame, on a page
  already running WebGL.

---

## ADR-0037 — The frame's canvas is the window, and every x is edge- or centre-relative

**Status:** Accepted · 2026-08-27 · amends [[#ADR-0035]]

**Decision.** The frame canvas is `w-full`, not `90rem`. Every horizontal
coordinate in the `lg:` layout is anchored to an edge or to the centre; no left
offset that only happens to be the right margin at exactly 1440 units survives.

**Why.** ADR-0035 made the scale fit the window's height, which is what stopped
the composition being cropped — but held to 90rem the frame then sat centred on
a wide screen with a band of bare lattice down each side, 97px of it at
1920×950. That reads as the page having grown margins, and it was the first
thing the client saw.

A fixed-aspect composition can fill the width or fit the height, not both —
unless it is allowed to be fluid. So it is: the scale still comes off the
height, the canvas takes the window, and the extra width goes into the gaps
between the composition's columns, where the frame has nothing drawn. What it
cost was re-anchoring nine placements — the cart, the details specs, the FAQ
rows, the technology card and its leader lines, the collections lede, the
footer rule, the wordmark plate and the touch grab area.

**Every one of them is a no-op at 1440 units.** `right-10` on a 417-wide column
starting at x 983 is the same pixel; auto margins on a 1157-wide plate are the
frame's x of 142 to half a unit. The reference render is unchanged, which is
what makes this safe to hold against the Figma file.

**What this constrains.**

- New frame geometry is written from the edge it belongs to. A left coordinate
  is only correct for something in the left half.
- The technology leader lines are `calc(50% ± n)` / `calc(100% − n)`, and the
  marker square is its own element — a `rect` inside a box stretched by
  `preserveAspectRatio="none"` comes out a rectangle.
- The 3D scene reads its frame unit from the canvas **height** (`FRAME_HEIGHT`),
  never from `width / 1440`, which on a fluid canvas oversized the product by
  11% at 1920×950.
- `100vw` still counts the scrollbar. Measure against the content box.

---

## ADR-0036 — The lattice is one grid, drawn once, on whole pixels

**Status:** Accepted · 2026-08-27

**Decision.** The page paints the lattice's **cell colour** and nothing else;
the fixed highlight layer (`hero-lattice-glow`) draws the bars. Pitch, gap and
the half-gap bleed are rounded to the device's pixel grid with `round()`, behind
an `@supports` guard.

**Why one grid.** Both layers used to draw bars. The page's were anchored to the
document and the highlight's to the viewport, so the two held still against each
other only while the page did — and slid across each other as soon as it moved.
A 10-unit grid over a 10-unit grid at an arbitrary offset is not a slightly
softer grid: it is half-cells, doubled rules and a pattern of light and dark
bands that swims with the scroll. Removing the second copy costs nothing, since
the highlight layer is `fixed inset-0` and always covers the viewport.

**Why whole pixels.** Pitch and gap are frame units, so they scale with the
frame, and a rem is not a whole number of pixels at most window sizes — at 1920
the pitch resolves to 13.33px and the gap to 2.67px. A repeating gradient with
fractional stops is antialiased per bar, and because the fraction only comes
round every third cell the error repeats on a three-cell beat: a visible ripple
through the background. Rounded, every bar is identical and every cell is the
same square. The cell ends up 10/13 of the pitch rather than the frame's 8/10 at
some widths — a third of a pixel in a 13px cell, against a ripple that is not
subtle at all.

**What this constrains.**

- The page background is a **colour**. Anything that needs the grid where the
  fixed layer cannot reach — the preloader, which sits above it — keeps using
  the `hero-lattice` utility.
- The opaque panels (`hero-lattice-panel`) still draw their own bars against
  their own box. They are opaque, so they cannot beat against anything; their
  phase simply differs from the page's, which is what it always did.
- Use `--hero-lattice-offset`, not `calc(gap / -2)`, for the bleed — it has to
  round with the gap or the first bar lands on a half pixel.

---

## ADR-0035 — The frame scales to fit both axes, and is capped by the content box

**Status:** Accepted · 2026-08-27 · amends [[#ADR-0032]], [[#ADR-0034]]

**Decision.** In the frame regime the root font-size is
`min(1.111111vw, 2lvh)` — the 1440×800 frame's scale factor on each axis,
whichever is smaller — and the frame canvas is `w-full lg:max-w-360` rather than
`lg:w-360`.

**Why the height term.** The frame is 1.8:1 and every screen in it is `h-200`,
its own 800 units. Scaled by width alone, the composition is taller than the
window on **any** screen wider than 1.8:1 and the bottom of it is cut off. That
is not an edge case: a maximised browser on a 1920×1080 display is about
1920×950, an aspect of 2.02. Measured there before this change, the frame came
out 1067 units tall in a 950-unit window — the hero's CTA and both badges sat
below the fold with 45 elements crossing it, and the technology stage lost its
closing note and the last of its five cards.

The alternative was to let each section take the window's height while its
contents keep the frame's, and that is exactly the drift ADR-0024 already
rejected: the pairs these frames draw level with each other come apart by
precisely the slack. A composition with a fixed aspect either scales to fit or
is cropped. It now scales, and `mx-auto` centres it, so above 1.8:1 there is a
band of the page's own lattice down each side — 33px each at 1920×950.

`lvh`, not `svh` or `vh`: the sections are `h-lvh`, and a scale taken off the
small viewport with sections taken off the large one puts the slack straight
back.

**Why the cap.** `w-360` is 90rem, which the width term makes exactly `100vw` —
and `100vw` counts the scrollbar while the page's content box does not. The
canvas was 15px wider than the box that held it, so `mx-auto` had no room to
centre anything: the frame sat flush left and overhung the right edge, putting
everything the frame centres 7.5px right of the axis the reader sees. As a cap
the canvas is the content width whenever the frame is the wider of the two.

**What this constrains.**

- Keep the two terms in step with `grid.config.ts` and with the frame's own
  dimensions. The formula is `FONT_BASE * 100 / baseWidth` across and
  `FONT_BASE * 100 / baseHeight` down.
- Type keeps scaling with the frame, so the `max(…, 12px)` floors from the
  readability pass matter more, not less, on a wide-short window.
- `100vw` is still wrong for anything that must line up with the page. Measure
  against the content box.

---

## ADR-0033 — What the 3D scene gives up per tier, and what it keeps

**Status:** Accepted · 2026-08-21

**Decision.** The scene reads a tier once at construction and spends differently
on each: a pixel-ratio ceiling of 1.0 / 1.25 / 1.5, a frame budget of 30 / 45 /
uncapped, and `resize` listened for only where there is a fine pointer.

**What that costs, honestly.** A phone renders the garment at half the linear
resolution it used to and at half the frame rate. Both are visible if you look
for them: the silhouette edge is softer, and a fast turn under the thumb has
coarser steps. Both were judged worth it — this scene is one full-screen lit,
iridescent, clearcoated mesh, which is fill-bound, and fill is exactly what a
phone runs out of. 1.0 rather than the 0.85 soft-sprite scenes can take, because
the jacket has hard silhouette edges and a zip and those alias visibly below 1.

**The physics is not throttled with the frame rate.** It is stepped on its own
fixed clock inside the frame precisely so the feel cannot follow the display; a
30fps tier hands it larger deltas and it takes more steps, capped at four.

**Deliberately not done, with reasons.**

- **The two WebGL contexts were not merged.** One canvas spanning hero →
  details → FAQ is the theoretically right shape, and [[#ADR-0031]] argues for it.
  It is also a large architectural change to a composition that has been tuned
  over many passes, and its measured prize — one context's programs and VRAM —
  has already been moved off the critical path by building the second scene on
  approach. Revisit if a third product screen ever appears.
- **The duplicate Draco decode was left alone.** `DRACOLoader` decodes in a
  worker pool, so the second decode never touches the main thread. Sharing a
  *skinned* model between scenes needs `SkeletonUtils.clone`, and that risk buys
  only worker-thread time.
- **No bot path.** Stripping the scene for crawlers means reading `headers()`,
  which turns a statically prerendered `/` into a dynamic route. That is a real
  cost for an audit-score gain; middleware could avoid it and would be the way
  to do this properly if it matters.
- **Two directional lights kept.** The guidance is one key plus IBL. The rim
  light is doing visible work on the garment's shoulder and dropping it is a
  look decision, not an optimisation one.
- **Textures still PNG, not KTX2.** Nine uploads per context; converting via
  `gltf-transform` would cut VRAM and upload bandwidth. Worth doing before this
  ships, not worth doing without re-checking the material against the frames.

---

## ADR-0034 — The frame is for landscape screens, not merely wide ones

**Status:** Accepted · 2026-08-21 · amends [[#ADR-0032]]

**Decision.** `lg` — the switch between the two regimes — is
`(min-width: 1024px) and (min-aspect-ratio: 1/1)`, and the root font-size rule
mirrors that condition exactly.

**Why.** The frame is 1440×800, which is 1.8:1. A width test alone sent an iPad
in portrait — 1024×1366, one of the most common tablets there is — into frame
mode, where the composition scaled to 71% and occupied the top 40% of the screen
with roughly 800px of empty lattice beneath it. The frame was not broken there;
it simply has nothing to say about a shape it was never drawn for.

A portrait tablet is closer to a large phone than to a desktop, and the flow
layout is already built for narrow-and-tall — verified at 768 and 820 — so it
gets that instead. 1024×768, 1280×1024, 1440×800 and everything wider still get
the frame; 1024×1366 and 1440×1600 do not.

**What this constrains.**

- The two conditions must stay identical. A mismatch draws the flow layout at
  the frame's scale, which is how the collections lede once ended up rendering
  entirely off-screen (ADR-0032).
- `lg:` keeps meaning "the frame", so none of its 246 usages had to change —
  the built-in variant is overridden rather than a new one introduced.
- Rotating a tablet now switches regime, as resizing across 1024 already did.

---

## ADR-0032 — Two scaling regimes, split at 1024: the frame scales, the flow does not

**Status:** Accepted · 2026-08-21 · amends [[#ADR-0024]], [[#ADR-0029]], [[#ADR-0030]]

**Decision.** The root font-size has exactly two regimes:

```css
html { font-size: 1.111111vw; }              /* ≥1024 — the 1440 frame's scale factor */
@media (max-width: 1023.98px) {
  html { font-size: 16px; }                  /* below — ordinary responsive flow */
}
```

At and above 1024 the page reproduces the 1440 frame, so scaling the root
font-size *is* the layout: every rem in the `lg:` composition is a frame unit
and one rule fits the whole thing to any viewport — 71% at 1024, 1:1 at 1440,
larger beyond. Below 1024 there is no frame to reproduce, so nothing is scaled.

**Why the old three-band rule was wrong.** It mapped each range to the design
width it was drawn at — 360 below 640, 1024 above it, 1440 above that — and set
`font-size: 16 * 100 / baseWidth` vw. A band pinned to a base width is only
correct *at* that width and drifts linearly away from it in both directions, so
the page was drawn correctly at exactly three viewport widths and nowhere else.
Measured: the root font-size reached **28.4px at a 640 viewport** and dropped to
**10.0px at 641** — a 2.8× cliff one pixel wide, with 124px headlines on a large
phone and 8.8px card titles on a small tablet. At 820 everything rendered at 80%
of its intended size; at 500, at 139%.

**It also broke 1024 outright.** `max-width: 1024px` and Tailwind's `lg`
(`min-width: 1024px`) both match at exactly 1024, so that viewport got a 16px
root *and* the frame layout: the 1440-wide composition was drawn at full scale
inside 1024px. The collections lede sat at x 1069–1354 — entirely off-screen,
silently, because an ancestor clipped it rather than scrolling. 1024 is iPad
landscape.

**The one remaining discontinuity is deliberate.** At 1024 the page changes from
flow to frame. The two sides are different designs and are not meant to match;
only the section headline is tuned to cross it smoothly (see below). Everything
else steps because the layout steps.

**What this constrains.**

- Below 1024, write ordinary responsive CSS. rem is px/16 again and means what
  it says — no mental scale factor.
- Type steps still fire at `sm:` (640) and `lg:` (1024), never `md:` for the
  regime change itself — but `md:` is now free for genuine layout choices that
  have nothing to do with the grid, and the footer's column count uses it.
- The section headline has three sizes, not two: 40px below 640,
  **50px from 640**, and the frame's 70px from 1024. The middle value is not
  free — at 1024 the frame draws its 70px headline at 70 × 1024/1440 = 49.8px,
  so 50px makes the regime change the one place the headline does *not* jump.
- `grid.config.ts` carries one breakpoint now. Keep it in sync with the CSS.

---

## ADR-0031 — One canvas for the whole page, framing driven by scroll

**Status:** Accepted · 2026-08-20

**Decision.** The product lives in `ProductStage`, a region wrapping both
screens, and there is exactly **one** WebGL context on the page. The hero no
longer owns the canvas. Scroll drives a single `journey` value, 0 with the hero
at rest and 1 with the details screen at rest, and that value interpolates the
product's framing, its turn, and its lighting.

**Why not two scenes.** The obvious build is a second canvas in the details
section and a cross-fade at the seam. It costs a second context, a second load
and decode of the same model, and — the part that cannot be fixed — a visible
discontinuity where one product is replaced by another. The product never hands
off here. It is the same object throughout; only the camera and the lights move.

**Why sticky, and why the negative margin.** A canvas cannot escape the section
it sits in, so from `lg` the canvas is a viewport-tall sticky box that is a
*sibling* of the two screens, and the screens are pulled back over it with
`-mt-[100lvh]`. Without that margin the sticky box would also occupy a screen of
its own and the page would be three screens long for two screens of content.
Verified: the region measures exactly 2× the viewport.

**Below `lg` there is no journey.** The canvas is absolutely positioned over the
hero's own product box — the shape is shared as `PRODUCT_BOX` so the overlay and
the space it fills cannot drift — and the details screen has no product at all.
A viewport-tall jacket sitting behind two screens of stacked copy is a different
design, and no frame exists for it. Measured at 390: the canvas lands on
[22, 72, 347, 347], which is the hero's reserved box to the pixel.

**What the journey drives.** Framing (540 → 1137 units tall, rising 36 above the
centre line → sinking 259 below it), a 24° turn, and a dimming of the lights.
All three are eased with smootherstep, so velocity is zero at both ends and
neither screen is left twitching. The turn's velocity is fed to the bone jiggle
alongside the pointer's, so the sleeves and straps trail the whole way down —
that trailing is the difference between a transform and something with mass, and
it came free from machinery that already existed.

**A dimming pass was added here and then removed.** The specification copy was
being swallowed by the product's highlights, and the product's lighting was
turned down across the journey to compensate. That treated the symptom: the real
cause was that the panels behind that copy had been built without their fill —
`get_design_context` does not report it — so the product was showing through
boxes that are opaque in the frame. With the fill restored the copy measures a
uniform 10.8:1 on every row, *identical* across rows, which is the tell that
nothing is bleeding through any more. The product keeps its full lighting.
Recorded because the wrong fix looked convincing and was measured to "work".

**Rotation still reads only from the hero.** The pointer module listens on the
hero section, which is also what normalises the cursor into a ±1 range. Once the
journey is under way the hero has left the viewport, so hover rotation settles
back to rest on its own and screen 2 keeps only the idle bob and the journey's
own turn. That is the right behaviour there — the product is a backdrop with copy
on top of it — and it fell out of the existing design rather than needing a case.

## ADR-0030 — Type steps fire at the grid's own breakpoint, not at `md`

**Status:** Accepted · 2026-08-20

**Decision.** Every responsive step that changes a **type size or a control's
metrics** uses `sm:` (640). `md:` (768) is reserved for steps that change
**layout shape** — a column becoming a row, a box changing aspect, the gap
between two cards.

**Why.** The adaptive grid scales the root font-size by dividing 16px by the
design base width for the range: 360 below 640, 1024 up to 1024, 1440 above. So
the root font-size does not slide — it *jumps* at 640, from 28.4px at a 639
viewport to 10.9px at 641. Every rem on the page jumps with it.

The type steps exist to cancel that jump, which only works if they land on the
same pixel. They were on `md`, 128px too late, so the 641–767 band kept the
small-tier tokens against the small root font-size and the two multiplied.
Measured at a 700 viewport before the fix: the hero's edge statements and nav at
**8.2px**, its badge copy at 8.2px, the details body at 12.3px, the details
headline at 27px. After: 12.3px, 12.3px, 12.3px and 47.9px.

**Consequence — a step at `sm` outlives the band, so restate the frame value at
`lg` when they differ.** `sm:` applies at every width above 640, 1440 included.
Where the frame's own value is *larger* than the small-tier token, that is
exactly right and the step just lands on it. Where the frame's value is
*smaller* — the hero's 12px badge copy is the only such case — the step has to
be undone: `text-hero-caption sm:text-hero-body lg:text-hero-caption`. Verified
at 1024 and 1440: badge copy back to 12px, everything else on its frame value,
and every hero coordinate unchanged.

**Not fixed here.** The jump itself is the grid's design (ADR-0024) and the
band's real problem is that a 700px viewport is scaled as if the design were
1024 wide. A `{ maxWidth: 768, baseWidth: 768 }` entry in `grid.config.ts`, with
the matching `globals.css` media query, would put the root font-size at 14.6px
there instead of 10.9px and make the steps cosmetic rather than load-bearing.
That changes every existing section's rendering in that band, so it is a
deliberate decision to take on its own, not a side effect of building block 2.

## ADR-0029 — Below the frame breakpoint the hero is flow, not a scaled frame

**Status:** Accepted · 2026-08-20

**Decision.** The hero's absolute frame coordinates apply from `lg` (1024) up.
Below it every piece is ordinary document flow: header wraps, the product takes a
box in the column, the edge markers become a pair of columns, the corner cards
stack and then sit in a row at `md`. The two wrappers that group them carry
`lg:contents`, so they dissolve at the breakpoint and the pieces go back to
positioning against the section.

**Why.** There is one frame, 1440×800, and its composition depends on space that
a phone does not have: statements pinned to left and right edges *beside* the
product, and two cards in opposite bottom corners. Scaling that frame down is the
obvious move and the wrong one — at 360 the copy lands at four pixels. Cropping
it loses a corner, and the corners are where half the content lives. Flow is the
only arrangement that keeps every element legible and in a sensible reading
order, and the order falls out of the DOM the frame already had: product,
statements, lede, CTA, cards.

**When building.** Design mobile at **360** — the adaptive grid's own base below
640, where 1rem is 16px. Two traps, both hit while building this:

- **`lg:w-auto` will silently beat the frame's own width.** Same specificity,
  later in the sheet; the cards collapsed to 2px. Do not add a resetting utility
  at the same breakpoint the frame sets a value at.
- **A step at `md` is not a step at `lg`.** Moving the CTA's gap to `md:gap-6`
  removed it from `lg`, where the frame wants 8, and the button came out 8px
  narrow. When a frame value is re-tiered, restate it at `lg`.

The 640–1024 band is the awkward one: the root font-size follows a 1024 base
there, so a phone-shaped layout renders small. `md` exists to answer that — type
steps up, the product's box widens from square to 16:9, and the cards pair up.

Verified at 390, 820 and 1440: no horizontal overflow at any of them, and at 1440
every frame coordinate is back to the value the frame specifies.

## ADR-0028 — The interactive lattice shares the product's scene; one canvas, one loop

**Status:** Accepted · 2026-08-20

**Decision.** The hero's pointer-reactive lattice is a full-screen quad rendered
by an orthographic pass in the **same** `WebGLRenderer` as the product, ahead of
the perspective pass, with `autoClear` off. Pointer state comes from one module
(`hero-pointer.ts`) with one listener and one subscription to the shared ticker.

**Why.** The alternative — a second canvas with its own loop — samples the
pointer at a different moment in the frame from the product's loop. Under a fast
flick the highlight and the product visibly drift out of phase, and the effect
reads as two unrelated things layered rather than one surface reacting. Sharing
the renderer also halves the context count and the per-frame state churn.

**When building.** The lattice's `mix-blend-mode: screen` becomes
`AdditiveBlending` inside the canvas. Over this frame's near-black ground the two
are within a couple of RGB levels, and it avoids needing a separate element to
blend against. Consumers **must not re-smooth** the pointer — the module owns the
lerp; a second one downstream reintroduces exactly the phase split this decision
exists to remove. The canvas is full-bleed, so the product is placed by
projecting the frame's own coordinates rather than by a CSS box (see
`hero-scene.tsx`); a fixed box would have forced a second canvas for the lattice.

## ADR-0027 — The hero product is a live glTF model on plain three.js

**Status:** Accepted · 2026-08-20

**Decision.** The hero product is rendered from `hero-jacket.glb` by
`src/views/home/hero/hero-subject.tsx`, built on `three` directly — no
`@react-three/fiber`, no `drei`. It renders on demand through the shared ticker,
and is code-split with `next/dynamic({ ssr: false })`.

**Why.** The scene is one static, untextured mesh. Fiber would add a React
reconciler and, more importantly, **its own rAF loop** running beside the shared
ticker that every other animation here goes through — the exact duplication
`src/lib/animation/ticker.ts` exists to prevent. Rendering on demand rather than
every frame follows from the same reasoning: a still model does not need 60fps,
so the loop asks for a frame only after a load or a resize.

**When building.**

- **Draco is required.** The mesh is `KHR_draco_mesh_compression`; without the
  decoder it silently fails to load. It is self-hosted in `public/draco/`, not
  fetched from a CDN — copy it again from
  `three/examples/jsm/libs/draco/gltf/` if `three` is upgraded.
- **The material is art direction, not model data.** The GLB ships one near-black
  material at `metalness: 0`, `roughness: 0.32`, no textures — a silhouette under
  any lighting. `hero-subject.tsx` overrides metalness and roughness and lights
  the mesh from a `RoomEnvironment` probe. It will not match the pre-rendered
  plate it replaced, which was lit and shaded offline; the iridescence in the
  frame is not in this file.
- **Everything must be disposed.** Geometry, materials, the PMREM target, the
  Draco worker and the renderer are all released on unmount — an undisposed
  `WebGLRenderer` leaks its context, and browsers cap live contexts.
- **The box is fixed.** The canvas keeps the 650-unit square the flat render
  occupied, and the camera is pulled back to fill `FILL` of it, so the frame's
  composition is unchanged.
- **Hard rule #8 is now live.** A performance request against this page must go
  through the `optimize-3d-scene` skill first. See [[optimize-3d-scene]].

## ADR-0026 — A character-substitution effect is content, not motion, and does not go through the text engine

**Status:** Accepted · 2026-08-20 · narrows ADR-0002 / hard rule #1

**Decision.** The decode effect (`ScrambleText` + `useScrambleText`) substitutes
characters on a fixed step; it is **not** built on `spring-text-engine`. It runs
on the shared rAF ticker, and it is the hero's text-reveal language — on load as
a staggered cascade, and on hover/focus for anything interactive.

**Why.** Hard rule #1 sends all text animation through the engine, and that rule
holds for what the engine does: it splits a label into line/word/letter slots and
springs a *property* of each — `y`, `opacity`, `scale`. This effect animates no
property. It swaps the characters themselves and leaves every box untouched, so
there is nothing for a spring to interpolate; the engine cannot express it at any
setting. Reaching for a different animation library would break the rule that
matters (`@keyframes`, `framer-motion` and friends stay banned); a hook driving
React state from the project's own ticker does not.

**When building.** The exemption is narrow — **character substitution only**. Any
motion that accompanies it (a colour or glow on hover) still follows ADR-0014,
and anything that moves a letter is still the engine's job. Two constraints are
part of the decision, not optional polish:

- **The accessible name must not churn.** The substituted glyphs are
  `aria-hidden` and the real label is kept in a visually-hidden copy, so a screen
  reader is never handed `AXIGY`. This mirrors the engine's own `seo` copy.
- **Honour `prefers-reduced-motion`.** Rapidly mutating glyphs are exactly what
  that setting exists to suppress, and `useReducedMotion` cannot help here — it
  toggles react-spring's `skipAnimation`, which this effect never touches, so the
  hook checks the media query itself.

Use a monospaced face, or the substitution reflows the line on every step.
See [[hooks]] and [[components/ui]].

## ADR-0025 — A full-viewport section anchors its parts; it does not scale to fit

**Status:** Accepted · 2026-08-20

**Decision.** A section that must fill the viewport height sizes itself with
`h-lvh` (floored at the frame's own height) and anchors each piece to the edge
the design anchors it to — header to the top, closing copy/CTA/cards to the
bottom, hero subject and edge markers to the centre line. Width still scales
through the rem grid (ADR-0024); height is absorbed by the gaps.

**Why.** The obvious alternative is to scale the whole frame until it covers the
viewport. That fails on this design: it carries content in all four corners, so
covering a 16:10 window crops ~90px per side against a 45px margin and eats the
logo, cart, edge markers and both cards. Scaling to *fit* instead is safe but
leaves a band, which is the thing being fixed. Anchoring keeps every element on
its correct margin at every aspect, crops nothing, and — because the frame's
own coordinates are what the anchors resolve to — reproduces the design exactly
at its native 1440×800.

**When building.** Derive each anchor from the frame, don't eyeball it: the
offset is the design coordinate measured from *that* edge. For a centred plate
that the frame nudges off-centre, use `top-1/2` plus a margin of half its height
± the nudge, **not** `-translate-y-1/2` — a spring animating `scale` writes
`transform` inline and would silently overwrite the class. Floor the section with
`min-h-<frame height>` so a window shorter than the frame scrolls instead of
crushing the layout. See `src/views/home/hero/hero.tsx`.

## ADR-0024 — The 1440 frame fills every wider viewport; no JS scaling pass

**Status:** Accepted · 2026-08-20 · amends ADR-0008

**Decision.** The `1440` breakpoint rule in `globals.css` is **unbounded
upwards**, so the root font-size stays `100vw / 90` at any width above the design
base. `<AdaptiveGrid />` is not mounted.

**Why.** The starter's grid assumes a design frame per breakpoint and hands
everything above 1920 to a damped JS scale-up. This project has exactly one
desktop frame — 1440 — so above it there was nothing to scale *to*: the canvas
was pinned at 1440 and centred, leaving wide screens letterboxed with a dead band
under an 800px-tall frame. Letting the 1440 base carry upwards makes the frame
fill the viewport at every desktop width, which is what a full-bleed hero wants,
and it removes the JS pass — the layout is correctly scaled in the very first
paint instead of snapping into place after hydration.

**When building.** Keep `globals.css` and `grid.config.ts` in sync. Once a 1920
frame exists, bound the 1440 rule at `max-width: 1920px`, add the 1920 breakpoint
back, and mount `<AdaptiveGrid />` for the scale-up (`coef` damps it; `1` is
fully proportional). Below 1024 the canvas is still wider than the viewport and
is clipped; that range needs its own frame. Height is handled separately — see
ADR-0025. See [[design-system]] and [[components/common]].

## ADR-0023 — Above-the-fold reveals use `<Spring>`, not `<Inview>`

**Status:** Accepted · 2026-08-20

**Decision.** A section that is in the viewport on first paint animates with
`<Spring>`. `<Inview>` stays the primitive for anything the user has to scroll to.

**Why.** `<Inview>` gates its spring on an IntersectionObserver. For a hero that
is on screen at load, the observer adds no behaviour — it only adds a way for the
reveal to never fire, leaving the section stuck at its `from` values. That is not
hypothetical: an observer does not fire while the page is hidden, so a hero
rendered in a background tab stays invisible until the tab is focused. `<Spring>`
is driven by mount and the `enabled` flag, which is what an above-the-fold reveal
actually means.

**When building.** Pick by whether the element is on screen at load, not by
whether the motion is a "reveal". Note that `<Spring>` has no `innerTag`, so a
spring that animates `transform` needs a plain positioning wrapper when the
element also carries a Tailwind transform (`-translate-x-1/2`) — react-spring
writes `transform` inline and would otherwise overwrite the class. See
[[animation-system]] and [[components/animation-springs]].

## ADR-0022 — Track latest within majors; hold TypeScript 7 and ESLint 10

**Status:** Accepted · 2026-08-18

**Decision.** Dependencies track the newest release **within their current
major**. Three majors are deliberately held back.

**Why.** Stale pins hand every new project a migration debt on day one; a broken
toolchain is worse. Each hold was tested, not assumed:

- **TypeScript 5, not 7** — `eslint-config-next` depends on `typescript-eslint@8`,
  whose peer range is `typescript >=4.8.4 <6.1.0`. TS 7 breaks `yarn lint`.
- **ESLint 9, not 10** — ESLint 10 removed `context.getFilename()`;
  `eslint-plugin-react` still calls it, so linting dies on startup.
- **`@types/node` tracks the Node major in use**, not the newest published.

**When building.** The blockers live in someone else's dependency graph, so they
lift without work here — **re-test periodically** rather than treating them as
permanent. [[tech-stack]] carries the table and the reasons. Node ≥ 20.19 is a
hard floor (`engines` + `.nvmrc`): the ESLint toolchain fails to install below it.

---

## ADR-0021 — SEO is a practice with a workflow, not just a metadata helper

**Status:** Accepted · 2026-08-18

**Decision.** SEO and AEO get skills, an audit agent and a documented order of
work ([[seo-aeo]]), not just the metadata utilities.

**Why.** The mechanism existed; the practice did not. Nothing checked whether a
new route reached `sitemap.ts`, whether titles were unique, or whether the site
was legible to answer engines — the fastest-moving part of search and the one
most likely to be skipped.

**When building.** Audit in order: indexability → metadata → content structure →
structured data → performance → AEO. A perfectly optimised page that cannot be
crawled is worth nothing. **AI-crawler policy is the user's decision** — "be
cited by AI" and "don't train on my content" need different bots allowed. Never
cloak, and never emit schema describing content that is not on the page.

---

## ADR-0020 — Payload + Supabase are the CMS and database, added per project

**Status:** Accepted · 2026-08-18

**Decision.** Payload (Postgres adapter) on Supabase are the documented defaults.
**Neither ships in the starter** — the `payload-cms` / `supabase-db` skills
install them when a project needs them.

**Why.** Payload runs *inside* the Next app — admin as a route group, content via
an in-process Local API, types generated from the schema — which matches how this
starter already works (Server Components reading data, passing props down) and
keeps deployment one Vercel project. Supabase covers database, media bucket and
optional auth in one service. Most projects from this starter are marketing sites
that never need either, so an unused install would be a large dependency surface
and a migration story maintained for nothing.

**When building.** [[cms-payload]] and [[database-supabase]] carry the
conventions. Two constraints break installs if ignored: `@payloadcms/next` pins a
minimum Next version (verify before installing), and Supabase's connection
strings are not interchangeable — runtime on the transaction pooler (6543, no
prepared statements), migrations on the direct connection (5432).

---

## ADR-0019 — Hard rules get a mechanical check, not just prose

**Status:** Accepted · 2026-08-18

**Decision.** `.claude/scripts/verify.sh` checks every hard rule that is
objectively decidable from source and exits non-zero on any FAIL. Judgement calls
stay with the `qa-verify` skill.

**Why.** Rules that are never checked decay into suggestions, and silently — a
stray `@keyframes` or hardcoded hex surfaces at review, if at all. `yarn lint`
knows nothing about springs, token tiers or route delegation.

**When building.** Run it after any code change ([[qa-verification]]). It greps
rather than parsing TypeScript, so it is biased toward false positives: a
dismissed warning costs seconds, an unchecked rule costs a review cycle. WARNs
never fail a build, so justify them rather than ignoring them.

---

## ADR-0018 — Split the docs into knowledge (vault) and execution (`.claude/`)

**Status:** Accepted · 2026-08-18

**Decision.** The vault stays the single source of truth for *why* and *what*;
`.claude/` holds *how it runs* — path-scoped rules, skills, agents, commands and
the verify script ([[agent-harness]]). Every skill, agent and command is
registered in the vault.

**Why.** Documentation that cannot be executed gets skipped; execution files
without recorded reasoning drift and duplicate. Keeping each mechanism to one job
avoids both.

**When building.** `.claude/` files stay short and point into the vault rather
than restating it — restated rules drift out of sync. **Path-scoped rules fire
when Claude *reads* a matching file, not when it writes one, and are not
re-injected after `/compact`.** They reinforce; they never guarantee. Anything
that must hold unconditionally belongs in `verify.sh` or a hook.

---

## ADR-0017 — A skill states its preconditions and its own internal conflicts

**Status:** Accepted · 2026-07-24

**Decision.** Every skill must state the environment its measurements assume, and
name explicitly where one of its steps undermines another.

**Why.** `optimize-3d-scene` was run on a real scene and the fix *order* held up
— what cost hours was everything left implicit: a first step that could not be
executed on the stack in front of it, measurements silently invalidated by the
dev server, and two individually correct steps that contradicted each other.

**When building.** When writing or editing a skill: a step names its
preconditions, and a step names where it fights another step. Numbers taken in
the wrong environment are worse than no numbers, because they read as evidence.

---

## ADR-0016 — Skills are registered in the vault, not just dropped in `.claude/`

**Status:** Accepted · 2026-07-24

**Decision.** A skill is only "installed" once it lives in `.claude/skills/<name>/`,
has a vault note under `workflows/`, is linked from [[README]] and
[[ai-agent-guide]], and — if invocation should be non-optional — has a routing
rule in `AGENTS.md`.

**Why.** A skill folder is discoverable to Claude Code at runtime but invisible in
the vault, leaving the invocation decision to model judgement. Where the skill
exists *because the order of operations matters*, that is exactly the wrong thing
to leave to chance.

**When building.** Registration is also when a skill gets checked against reality
— stale paths and references to files that do not exist surface here.

---

## ADR-0015 — Strict three-tier design-token naming convention

**Status:** Accepted · 2026-07-17 · amends ADR-0004

**Decision.** Tokens follow three tiers with an explicit grammar: primitive
`--raw-<category>-<name>[-<shade>]` → semantic `--<role>[-<variant>][-<state>]` →
`@theme inline` binding. Only Tier 1 holds literals; Tier 2 names purpose, never
appearance, and is the themeable layer. No tier may be skipped.

**Why.** ADR-0004 made tokens the styling currency but never said what a token
should be *called*, so every project would invent its own — defeating the point of
a shared starter. The names are predictable across projects by design.

**When building.** Full rules in [[design-system]]. Two Tailwind v4 facts,
verified by compiling a probe stylesheet, that guides commonly get wrong:

1. Naming primitives `--color-*` would **generate a utility for every raw value**
   and let markup bypass the semantic tier — hence the `--raw-*` prefix, kept out
   of `@theme`.
2. **There is no `--duration-*` namespace.** `duration-fast` compiles to nothing.
   Durations stay Tier 2 and are used as `duration-[var(--duration-fast)]`.
   (`--ease-*` *is* real.)

`@theme inline` is load-bearing: `inline` inlines the `var()` into each utility so
Tier 2 overrides cascade. Binding a literal there freezes the value and silently
breaks theming.

---

## ADR-0014 — Narrow CSS-transition exception for trivial state changes

**Status:** Accepted · 2026-07-17 · amends ADR-0002

**Decision.** All real motion stays spring-based, with one exception: CSS
`transition-*` for simple discrete state changes — `hover:` / `focus-visible:` /
`active:` colour, opacity, border, underline, and small decorative nudges.

**Why.** The outright ban cost most where it helped least: a nav link fading its
colour on hover needed a client component and a spring config to animate one
property nobody will interrupt. The rule pushed toward boilerplate or quiet
rule-breaking.

**When building.** Three conditions, all required, or it is a spring:
token-backed timing (`duration-[var(--duration-fast)] ease-entrance`),
`transition-*` only (`@keyframes` stay banned outright), and utilities only —
never a CSS file. Everything scroll-driven, revealing, staggered, orchestrated,
layout-affecting or interruptible remains a spring; text stays [[text-engine]].
The list is enumerated rather than a judgement call ("simple animations") so it
cannot erode into general CSS animation. Past the list, use `<Hover>`.

---

## ADR-0013 — `<Inview>` self-observe fix; spring components honour resize

**Status:** Accepted · 2026-06-07

**Decision.** Second authorised edit to the protected engine: `<Inview>` now
calls its callback ref so it observes itself when no `trigger` is passed, and
`<Inview>` / `<Spring>` / `<Hover>` pass the React-tracked `width` into
`isMobileDisabled(value, width)`.

**Why.** `<Inview>` only animated when given an external `trigger` — the common
case silently did nothing, because a callback ref was being assigned as
`.current` instead of called. Separately the `width` dependency was tracked but
never used, so resize re-evaluation of mobile gating did nothing.

**When building.** The springs folder stays `#do-not-modify` by default — these
were explicitly signed-off bug fixes, not an opening.

---

## ADR-0012 — Styling lives in utilities and components, not `globals.css`

**Status:** Accepted · 2026-05-22 · amends ADR-0004

**Decision.** A strict placement order, first match wins:

| Situation | Goes where |
|-----------|-----------|
| One-off styling | Tailwind utilities in `className` |
| Repeated pattern with markup/structure/props | a **React component** in `components/ui/` |
| Repeated pure-utility combo, no structure | a Tailwind v4 `@utility` |
| Pseudo-elements, 3rd-party overrides, complex selectors | `@layer components` |
| A new colour/spacing/radius value | a token (per ADR-0015) |

**Why.** With tokens in `globals.css` and guidance to extract repeated patterns
into `@layer components`, the path of least resistance made that file a dumping
ground — hundreds of component-specific classes never deleted when their
component was. Splitting the file would only spread the same bloat; the fix is a
placement rule.

**When building.** The default answer to "this looks repeated" is a **React
component**, not a CSS class — an eyebrow label with a `::before` dot is an
`<Eyebrow>`, not a `.label-eyebrow`. `globals.css` holds imports, tokens, base
resets and the narrow `@layer components` exceptions; if it grows past that,
something was misplaced. **CSS Modules were considered and rejected** — a second
styling mechanism is not worth the mental model when motion is spring-based (no
keyframes to co-locate) and utilities plus components cover everything else.

---

## ADR-0011 — API layer: `app/api` route handlers, secrets server-side

**Status:** Accepted · 2026-05-22

**Decision.** External calls go through Next.js Route Handlers at
`src/app/api/<resource>/route.ts`. The handler owns the work — business logic,
upstream calls, filtering, secret env vars. No mandatory passthrough service
layer; extract shared code only when genuinely reused.

**Why.** `route.ts` is never bundled to the browser, so it is the natural place
for secrets, and a single convention keeps every endpoint the same shape.

**When building.** Every endpoint validates input with `zod` and returns the
`{ data }` / `{ error }` envelope via the shared `handle()` wrapper. Secret env
vars are unprefixed and read through `getServerEnv()`; `NEXT_PUBLIC_` is only for
browser-safe values. Client Components fetch same-origin via `apiFetch`;
render-time data is read in Server Components. Full note: [[api-architecture]].
Server Actions were considered for mutations and deferred — revisit with a new
ADR if forms need progressive enhancement.

---

## ADR-0010 — SEO & performance hardening

**Status:** Accepted · 2026-05-21

**Decision.** `src/lib/site.ts` (`siteConfig`) is the single source of truth for
SEO. `metadataBase` is always set; `themeColor` lives on the `viewport` export.
Added `robots.ts`, `sitemap.ts`, JSON-LD, `loading.tsx` / `error.tsx` /
`not-found.tsx`, and `<ReducedMotion>`.

**Why.** Relative OG/canonical URLs never resolved to absolute, so social
previews broke in production; an animation-heavy starter ignored
`prefers-reduced-motion`; and the home view was a top-level `"use client"`,
breaking the server-first rule it should model.

**When building.** Set `NEXT_PUBLIC_SITE_URL` in every deployed environment or
canonical and OG URLs resolve to localhost. `<ReducedMotion>` toggles
react-spring's global `skipAnimation` from one app-root mount, covering every
spring and the text engine at once. **`isBot()` is discouraged** — it opts the
route out of static rendering and edges toward cloaking; reduced motion is the
preferred lever, since springs only animate opacity/transform and content is in
the DOM for crawlers regardless ([[seo-metadata]]).

---

## ADR-0009 — Shared animation ticker; authorised engine performance refactor

**Status:** Accepted · 2026-05-21 · amends ADR-0002

**Decision.** One-time authorised refactor of the protected engine, plus a shared
loop primitive: `src/lib/animation/ticker.ts` — a single app-wide,
reference-counted rAF loop that starts on the first subscriber and stops on the
last. It is **not** `#do-not-modify`; it is the supported extension point.

**Why.** Cost scaled with the number of animated components: a private rAF loop
per `useLoop` instance that never stopped, a debounced `resize` listener per
spring component, and an `IntersectionObserver` re-created on every render.

**When building.** A page with N animated components now runs **one** rAF loop
and **one** resize listener. Subscribe new per-frame work to the ticker rather
than starting a loop. Hard rule #2 was amended here: the engine stays protected
by default and changes need explicit sign-off — this ADR is not a precedent for
editing it.

---

## ADR-0008 — Adaptive scaling grid via root font-size

**Status:** Accepted · 2026-05-21

**Decision.** Keep a rem-based design proportional across viewports by scaling
`html { font-size }`: `vw`-based media queries in `globals.css` for scaling down,
and a `<AdaptiveGrid>` client component for scaling up beyond the largest
breakpoint.

**Why.** The behaviour arrived as a `styled-components` implementation, which is
not a project dependency and conflicts with the CSS-only config rule. Only the
behaviour was kept; the implementation was rebuilt on the project stack.

**When building.** Breakpoints live in `grid.config.ts` **and** are mirrored in
the `globals.css` media queries — duplicated by design, since ADR-0004 forbids
generating CSS config from JS. **Keep the two in sync**; the formula is written
in both files. Design px map cleanly to rem at the design base width.

---

## ADR-0007 — Automate the vault workflow with Claude Code hooks

**Status:** Accepted · 2026-05-21

**Decision.** Encode the "read the vault first, update the docs after" workflow as
hooks in `.claude/settings.json`: `SessionStart` injects a pointer to the vault,
`UserPromptSubmit` reminds the agent to consult the relevant guide,
and `Stop` blocks **once per turn** to confirm docs were updated.

**Why.** Documentation drifts the moment it depends on someone remembering.

**When building.** The `Stop` hook uses a `${TMPDIR}` marker keyed by session id
so it blocks at most once per turn — no infinite loop. Hooks are reviewable and
disableable via `/hooks`, and take effect at the next session start.

---

## ADR-0006 — The vault is the single source of truth

**Status:** Accepted · 2026-05-21 · amends ADR-0001

**Decision.** The vault is the **only** documentation source. The repo root keeps
thin shims: `AGENTS.md` carries the breaking-change warning and hard rules and
points into the vault; `CLAUDE.md` and `.cursorrules` `@`-import it.

**Why.** Dense spec files at the root duplicated the vault's content as terse
specs, and the two would drift.

**When building.** Put documentation in the vault and link to it. Keep the root
shims consistent with it — they are the first thing every agent reads.

---

## ADR-0005 — Use standard `next/link` for navigation

**Status:** Accepted · 2026-05-21

**Decision.** Standard Next.js navigation — `<Link>` from `next/link`,
`useRouter` from `next/navigation`. The custom `<AnimLink>` / `useAnimRouter()`
convention referenced in early drafts is dropped; it was never built.

**Why.** Two conflicting conventions existed in the docs and only one had code.

**When building.** No animated route-transition layer exists. If one is needed,
revisit with a new ADR rather than reviving the old names. See [[routing]].

---

## ADR-0004 — Tailwind v4 with CSS-based config

**Status:** Accepted (starter baseline) · amended by ADR-0012 and ADR-0015

**Decision.** All theme configuration lives in `globals.css` under `:root` and
`@theme inline`. There is no `tailwind.config.js`. Raw values in class names are
banned.

**Why.** Tailwind v4 removes the JS config file in favour of CSS-native config.

**When building.** Design tokens are the only styling currency: a value that does
not exist as a token gets added to `globals.css` first — following the three-tier
grammar (ADR-0015) — and component-specific *classes* do not go there at all
(ADR-0012). See [[design-system]].

---

## ADR-0003 — Routes delegate to Views

**Status:** Accepted (starter baseline)

**Decision.** `app/**/page.tsx` only imports and renders a component from
`src/views/`. All layout and UI logic lives in the view.

**Why.** Mixing routing concerns with page UI makes `app/` files heavy and hard
to test.

**When building.** Every route is a ~3-line file; views are the real page
components. `verify.sh` FAILs on a route importing anything else. See [[routing]].

---

## ADR-0002 — All motion is spring-based (`@react-spring/web`)

**Status:** Accepted (starter baseline) · amended by ADR-0014 and ADR-0009

**Decision.** Every animation uses `@react-spring/web` through the component
layer in `src/components/animation/springs/`. CSS keyframes and `framer-motion`
are **banned**. Text animation goes through `spring-text-engine`.

**Why.** Marketing sites need rich, interruptible, physically natural motion. CSS
transitions and keyframes are rigid; competing libraries add weight.

**When building.** The springs folder and `src/hooks/animation/` are
`#do-not-modify` — consume them, wrap them, never edit them without sign-off.
ADR-0014 narrows the CSS ban to allow `transition-*` for trivial hover/focus
state only. See [[animation-system]] and [[text-engine]].

---

## ADR-0001 — Adopt an Obsidian vault as the project brain

**Status:** Accepted (starter baseline) · amended by ADR-0006

**Decision.** `obsidian/` is a linked, navigable vault documenting how the
project is built and why.

**Why.** Project knowledge scattered across root markdown files gave new
contributors and AI agents no structured map of the system.

**When building.** Docs are maintained alongside code — see [[meta/README]] for
the maintenance rules, and [[agent-harness]] for how the vault and `.claude/`
divide the work.
