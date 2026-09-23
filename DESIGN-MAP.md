# Design map

Figma nodes behind the implemented UI. QA and any later pass re-fetch from here —
a section without a node ID cannot be verified against its design later.

**Figma file key:** `WINXFW2nTM7zYwd5dGgm1T`
**Source URLs:**
- Hero — https://www.figma.com/design/WINXFW2nTM7zYwd5dGgm1T/Get-Layers?node-id=902-304
- Details (block 2) — https://www.figma.com/design/WINXFW2nTM7zYwd5dGgm1T/Get-Layers?node-id=1748-1102
- Collections (block 3) — https://www.figma.com/design/WINXFW2nTM7zYwd5dGgm1T/Get-Layers?node-id=1748-1152
- Footer (block 6) — https://www.figma.com/design/WINXFW2nTM7zYwd5dGgm1T/Get-Layers?node-id=1748-1161
- FAQ (block 5) — https://www.figma.com/design/WINXFW2nTM7zYwd5dGgm1T/Get-Layers?node-id=1748-1158
- Technology (block 4) — https://www.figma.com/design/WINXFW2nTM7zYwd5dGgm1T/Get-Layers?node-id=1748-1155
  (states 2–5: `1924:2259`, `1924:2285`, `1924:2311`, `1924:2337`)
**Frame width:** 1440 × 800 — the design base width, matching the `1440` adaptive-grid
breakpoint, so design px map 1:1 to the `--spacing` scale (`n px` → `n/4`).

| Section | Node ID | View / component | Background | Notes |
|---------|---------|------------------|------------|-------|
| Hero | `902:304` | `views/home/hero` → `Hero` | `hero-lattice` on `--hero-surface` | Holds the page `h1` |
| ├ lattice plate | `902:305` | `@utility hero-lattice` in `globals.css` | — | Exported empty; rebuilt from sampled pixels (10px pitch, 2px gap, `#0d0d0d` cells) |
| ├ backdrop | `902:306` | `HeroStage` | — | **Brand wordmark** at 8% opacity, 1257×671 at (92, 84). Reads as mountains at that opacity; it is not. |
| ├ subject | `902:302` | `HeroStage` → `HeroSubject` | — | Live glTF model in the frame's 650×650 box at (394, 55) |
| ├ logo | `902:309` | `HeroHeader` | — | 75×30 at (40, 24) |
| ├ nav | `902:341`–`902:347` | `HeroHeader` | — | gap 64; caret `902:345` at +113px from the label |
| ├ cart | `1923:2152` | `HeroHeader` | — | left 1302, top 24 |
| ├ lede (`h1`) | `902:308` | `HeroTitle` | — | top 646, 20px/0.9, two hand-set lines |
| ├ marker left | `902:333`–`902:336` | `HeroMarker align="start"` | — | left 40, w 156, centred vertically |
| ├ marker right | `902:337`–`902:340` | `HeroMarker align="end"` | — | Mirror of the left block; right 40, w 185 |
| ├ CTA | `902:320`–`902:322` | `HeroCta` | — | 46px tall, bottom 40, centred |
| ├ badge left | `902:310`–`902:319` | `HeroBadge align="start"` | `--hero-rule` border | 263×68 at (40, 692) |
| └ badge right | `902:323`–`902:327` | `HeroBadge align="end"` | `--hero-rule` border | 222×68 at (1178, 692) |
| Details | `1748:1102` | `views/home/details` → `Details` | page `hero-lattice` | Block 2. Holds the section `h2` |
| ├ headline + standfirst | `1921:1779` | `DetailsIntro` | — | 344-wide column at (40, 122); headline 70px/0.8/-1.4px, box trimmed to cap-height (95, not 112); gap 36 |
| ├ subject | `1919:1662` | `ProductStage` → `HeroScene` | — | **The hero's 3D model, not the frame's photograph.** The picture's own crop (a 1494×1160 window at (-27, 77) with the image at 220.86%×158.1%, offset -60.12%×-24.9%) put the jacket's ink at 1137 units tall, centred 259 below the frame's centre line — those two numbers are what the model is framed to |
| ├ spec list | `1921:1748` | `DetailsFeature` ×5 | **opaque lattice fill** + `--hero-rule` border | 417-wide column at (983, 122), gap 12. Rows 102 / 122×4 — the height follows the body copy |
| ├ CTA | `1909:1657` | `FrameButton` | **opaque lattice fill** + `--hero-content` border | 277×46 at (40, 714) |
| Collections | `1748:1152` | `views/home/collections` → `Collections` | page `hero-lattice` | Block 3. Holds the section `h2` |
| ├ headline | `1923:2009` | `Collections` | — | 70px/0.8/-1.4px at (40, 130), cap-height trimmed — same setting as block 2 |
| ├ standfirst | `1923:2012` | `Collections` | — | 285-wide at (1069, 122), 20px/1.1 at 40%, uppercased in CSS |
| ├ product cards | `1923:2053`, `1923:2054`, `1923:2068`, `1923:2081` | `CollectionsCard` ×4 | `--hero-rule` border | 331×446 at x 40 / 383 / 726 / 1069, y 228. Built as a flex row: 4×331 + 3×12 = 1360 = 1440 − 80 |
| │ ├ title | `1923:2039` etc. | — | — | 26px/0.9, held to 217 units so the frame's break before "JACKET" survives |
| │ ├ swatches | `1923:2112` etc. | — | — | Four 12px cells at (301, centre), gap 4; the **second** is filled on every card |
| │ └ tag chips | `1923:2041` etc. | — | 40% white border | 37 tall, 14px/0.9 at 40%, px 14 |
| ├ CTA | `1923:2015` | `FrameButton` | — | 255×46 at (593, 714), centred |
| └ header | `1922:1982`, `1922:1983`, `1923:2148` | — **not rebuilt** | — | Same reason as block 2: the artboard has to carry the banner, the page has one |
| Technology | `1748:1155` (+4 states) | `views/home/technology` → `Technology` | page `hero-lattice` | Block 4. Holds the section `h2`. **Five frames are five states of one composition**, not five sections |
| ├ headline | `1923:2135` | `Technology` | — | 70px/0.8/-1.4px at (40, 136), 367 wide, cap-height trimmed; breaks TECHNOLOGY / ENGINEERED / TO ENDURE |
| ├ standfirst | `1923:2136` | `Technology` | — | 367 wide at (40, 650), 20px/1.1 at 40%, uppercased in CSS |
| ├ layer stack | `1931:2756` | `Technology` | — | **One flattened 1024×954 render**, drawn 665×619 at (387.5, 136). The five materials are not separable from it — see below |
| ├ layer card | `1924:2208` etc. | `TechnologyStack` | opaque lattice + `--hero-rule` border | 417 wide at x 983; tops 136 / 236 / 370 / 492 / 658, one per state |
| └ leader line | `1924:2258` etc. | `TechnologyStack` → `Leader` | — | Hairline from the card's left edge at its own centre line to an 8-unit square on the layer. **Drawn, not exported** — five assets, one construction |
| FAQ | `1748:1158` | `views/home/faq` → `Faq` | page `hero-lattice` | Block 5. Holds the section `h2` |
| ├ headline | `1924:2415` | `Faq` | — | 70px/0.8/-1.4px at (40, 136), 258 wide, cap-height trimmed; the width is what breaks NEED TO / KNOW. |
| ├ product | `1925:2479` | `Faq` | — | The details frame's own photograph, **mirrored**; 1006×780 window at (-93, 208), same 220.86%×158.1% crop |
| ├ question rows | `1924:2451`, `1924:2429`, `1924:2456`, `1924:2466`, `1924:2461` | `Faq` | opaque lattice + `--hero-rule` border | 674 wide at (726, 136), 114 tall, gap 12. Question cell 195 wide, a 32-gap either side of a full-height rule, answer takes the rest |
| └ question widths | `1924:2453` etc. | — | — | 175 on every row **except 02, which is 195** — that is what keeps its question on two lines |
| Footer | `1748:1161` | `views/home/footer` → `Footer` | page `hero-lattice` | Block 6. **350 tall, not 800** — the only frame in the file whose content does not fill the artboard, and Figma renders the node at 350 |
| ├ logo | `1929:2587` | `Footer` | — | The header's own asset at 99×40 (the header draws it 75×30), at (40, 24) |
| ├ nav columns | `1931:2698` | `Footer` | — | Four columns at (297, 24), 120 wide with a 48 gap — lefts land on 297 / 465 / 633 / 801 |
| ├ newsletter | `1931:2755` | `FooterNewsletterForm` | `--hero-content` border | 245 wide at (1155, 24); the box is 14px copy with the arrow, the consent line 13px at 25% |
| ├ rule | `1930:2615` | `Footer` | — | 1px at 25%, 1360 wide at (40, 286). **Drawn, not exported** |
| ├ copyright | `1930:2614` | `Footer` | — | 18px at 25%, (40, 310) |
| └ social | `1931:2785` | `Footer` | — | (1086, 310), gap 12; the separator is the text " / " with its spaces |
| Details ├ header | `1921:1718`, `1921:1719`, `1923:2150` | — **not rebuilt** | — | The artboard repeats the hero's banner because each Figma frame is standalone. On the page it is one `<header>`, already rendered by `views/home` |

## Assets

Downloaded to `public/assets/hero/`. The raster plates and the two badge icons
came from the client; the arrow, corner bracket and nav caret were exported from
the frame.

| File | Node | Native size |
|------|------|-------------|
| `hero-jacket.glb` | `902:302` | Draco glTF, 62.7k verts — supplied by the client, not a Figma export |
| `hero-wordmark.png` | `902:306` | 5028×2684 (4× the 1257×671 the frame draws). **Chrome finish** — verified against Figma's own export of the node. |
| `hero-wordmark-dark.png` | — | 5028×2684 — dark finish of the same wordmark. **Not the frame's plate**; unused. |
| `hero-logo.png` | `902:309` | 300×120 (4× the 75×30 the frame draws) |
| `hero-icon-globe.svg` | `902:315` | 37×23 |
| `hero-icon-target.svg` | `902:327` | 23×23 |
| `hero-arrow.svg` | `902:322` | 10×5.77 |
| `hero-bracket.svg` | `902:334` | 10.5×10.5 |
| `hero-caret.svg` | `902:345` | 5.2×4.5 |

Details assets live in `public/assets/details/`. The five icons came from the
client (their Figma clip IDs match nodes `1921:1780`/`1813`/`1823`/`1885`/`1894`,
so they are the right exports); `details-jacket.png` is the 2880×1600 export
behind `1919:1662`. The arrow is byte-identical to the hero's, so it moved to
`public/assets/ui/arrow-right.svg` and both sections point at the one file.

`details-jacket.png` (2880×1600, node `1919:1662`) was downloaded and then
**deleted**: the client replaced it with the hero's live model. Its only lasting
job was to tell us where the jacket belongs on this screen, which is now recorded
as `DETAILS_HEIGHT` / `DETAILS_DROP` in `hero-scene.tsx`.

| Asset | Node | Intrinsic |
|-------|------|-----------|
| `details-icon-shell.svg` | `1921:1780` | 32×32 |
| `details-icon-thermal.svg` | `1921:1813` | 32×32 |
| `details-icon-construction.svg` | `1921:1823` | 32×32 |
| `details-icon-storage.svg` | `1921:1885` | 32×32 |
| `details-icon-fit.svg` | `1921:1894` | 32×32 |

### The panels are filled — a correction

`get_design_context` reports the specification rows and the button as a border
and nothing else, and that is what was built first. It is wrong: **both carry an
opaque lattice fill.** Measured on the frame's own render, inside those boxes the
median pixel is 13 — the lattice cell value — while immediately outside it is the
product photograph. They knock the artwork out rather than sitting over it, and
that fill is what makes 40%-white body copy readable on a screen the product runs
across full-bleed.

The phase confirms each panel owns its fill rather than revealing the page's:
gap columns land at x ≡ 1 (mod 10) inside a card and x ≡ 8 inside the button —
different absolute phases, but both exactly 7px from their own inner edge.

The lesson is worth keeping: **the render is the authority on fills, the
generated code is not.** Sample inside a box and just outside it whenever a
surface is supposed to sit over artwork.

Collections assets live in `public/assets/collections/`: four garment renders and
the 13px plus glyph from `1923:2037`.

**The frame's four exports are gone.** They were ~870×1215 crops of four
different jackets (nodes `2021:65`, `2023:68`, `2024:80`, `2024:81`), each with
its own hand-measured nudge because the crops did not agree with each other. On
2026-08-27 the client supplied four colourways of a single garment instead —
1080-square, on transparency, framed identically — and the crops were deleted.
The pairing with the product names is arbitrary and the order was drawn rather
than sorted; see the deviations table.

| Asset | Source | Intrinsic |
|-------|--------|-----------|
| `collections-lime.png` | client, 2026-08-27 | 1080×1080 |
| `collections-rose.png` | client, 2026-08-27 | 1080×1080 |
| `collections-copper.png` | client, 2026-08-27 | 1080×1080 |
| `collections-cobalt.png` | client, 2026-08-27 | 1080×1080 |
| `collections-corner.svg` | `1923:2037` | 13×13 |

### The layer stack cannot be taken apart

**Superseded in practice, 2026-08-27:** the client supplied a 5.04s, 1440-square
clip of the stack (`technology-stack.mp4`), which is now scrubbed by the
section's scroll — so the layers do move, they were simply never going to move
by being cut out of the still. The still survives as the clip's poster. The
finding below still stands for the asset it is about.

The client asked whether the five materials could be separated and stacked on
scroll. **Not from this asset.** Node `1931:2756` is a single flattened render of
all five layers — verified by downloading it: one 1024×954 RGBA image, and the
layers overlap in perspective, so no crop or mask recovers an individual one
without tearing its neighbours.

What would make it possible, either of:

- **Five exports, one per layer**, each on the same 1024×954 canvas and the same
  camera, transparent elsewhere. Then each layer is its own element and scroll
  moves them together; the perspective drift from translating a
  perspective-rendered plane is small enough to read correctly at these
  distances.
- **The 3D scene as a `.glb`.** The page already carries a renderer, so the
  collapse would be a real camera-and-transform animation rather than an
  approximation.

Until then the section reproduces what the frames actually show: the stack is
static and the card walks down it.

## Deliberate deviations from the frame

| What | Frame | Shipped | Why |
|------|-------|---------|-----|
| Wordmark plate opacity (`902:306`) | 8% — peak RGB 32 | **20% — peak RGB 61** | The frame's value makes the plate a ghost against the lattice's 13. Raised on the client's call so it reads. Set in `hero-stage.tsx`; it is one constant. |
| Wordmark plate size (`902:306`) | 1257×671 | **1157×617 (92%)** | At full size and 20% the strokes crowd the edge copy: they reach x 204–1236 across the copy lines, against copy at 40–196 and 1215–**1400** — 8px clear on the left, a 21px *overlap* on the right. At 92% they span 245–1195: 49px and 20px clear. Centre unchanged. |
| Rotation timestep | Spec quotes per-frame constants | **Fixed 1/60s step, accumulator capped at 4** | Per-frame integration ties the feel to the display: 384ms to settle at 60Hz, 191ms at 120Hz. The spec's numbers only mean what they say at 60Hz. |
| Rotation damping | Spec: stiffness 0.06, damping 0.85 | **0.08 / 0.52** | Measured on this integrator: the spec's pair is 83ms/133ms but overshoots **31.7%** and springs back, and jerkiness was always the overshoot, never the speed. A critically damped pair (0.042/0.539) fixed the lurch but settled in 950ms, which read as the product lagging the hand. 0.345/0.45 tracked the cursor almost exactly; 0.12/0.505 trailed it at 100ms/350ms; **0.08/0.52 is where it ships — 150ms/517ms, still 0% overshoot** — softened on the client's call for more lag in the turn. Found by sweeping both axes: raising `k` alone makes this integrator *slower*, because critical damping forces `d` down and the low `d` discards the velocity. The bone jiggle keeps 0.15/0.75 and stays underdamped on purpose: sleeves and straps are supposed to ring. |
| Rotation input | Spec: pointer smoothed at lerp 0.12 | **Rotation reads the raw pointer; the lattice keeps the smoothed one** | Two filters in series. The pointer's own lerp is 95% settled after 391ms and the spring's travel only begins after it, so the product answered the hand about half a second late and it read as sluggishness rather than easing. The spring *is* the smoothing for rotation. The lattice still wants the eased signal and keeps it. |
| Hover authority during travel | Spec has no journey | **Muted in proportion to scroll speed, over ramps in both directions** | The arrival pose has to be deterministic — hover and the journey's turn add, and a cursor parked at the section's edge could land the details screen anywhere across a 120° spread — so hover is muted while the page travels. It used to be muted *instantly*, on any change in `journey` at all: the threshold was a ten-thousandth, a tenth of a pixel of scroll. Lenis does not stop dead, so the tail of every wheel notch re-zeroed the ramp, and a reader parked mid-travel turning the garment was fighting a value that kept collapsing and rebuilding under the turn. Now the gate reads scroll *speed* (full mute at 0.02 of the journey per 60Hz step, about 16px a frame) and moves on exponential ramps — 200ms to take authority, 500ms to give it back. |
| Pinned product (FAQ) | Frame draws a still photograph | **Same cursor response as the details screen** | The client's call, after three other settings were tried: cursor-driven body at the hero's full sweep, a constant turntable, and a held pose with the cursor reaching only the bones. It now shares one block of code with the travelling instance; the only difference is that its turn is measured from `SCROLL_TURN` — the angle the journey ends on — rather than from front-on. |
| CTA hover | Frame has no hover state | **Four corner brackets converge on hover/focus, arrow nudges 4px** | Added on the client's call. The box itself never changes — two fill attempts (solid inversion, then a 10% wash) were both rejected: nothing on this page is filled. CSS `transition-*` on token timing — ADR-0014's exception, not a spring. |
| Product rotation | Spec: press-and-drag turntable around the **vertical** axis, "not in the screen plane" | **Hover, both axes, no press** — cursor across → turntable **±24°**, cursor up/down → screen-plane roll **±12°**, tilt ±3° | Replaced by the client in two steps: first the axis, then the trigger. Absolute mapping, not accumulated: the cursor's place in the section *is* the angle, so a sweep is always reversible and cannot wind up. The sweep itself came down 40 → 24 on the client's call: the details and FAQ screens rest at `SCROLL_TURN` (40°) and hover *adds*, so ±40 put the far end of the sweep at 80° — near enough to profile that those screens were being shown the garment's back edge. ±24 lands that end at 64°, a side three-quarter that still shows the front panel. Press-and-drag survives on touch, where there is no hover to read. |
| Details product (`1919:1662`) | A still photograph of the jacket | **The hero's 3D model, travelling down from the first screen** | The client's call. One canvas and one context for the whole page: the product never changes hands, only its framing does, driven by scroll. |
| Product's landing spot | Photograph: 1137 units tall, ink top at y 91 | **960 tall, 30 units higher, 36 left** | The client's call, over three passes, after seeing it in place. The drop came down by half the height change so the top edge holds — shrinking about the centre would have pushed the collar back down and undone the lift. |
| Collections cards | Cards carry a `+` glyph | **Hover reveals SHOP NOW and lifts the price** | Added on the client's call. The frame has neither a link nor a price; the prices are placeholders. Chips and link share one absolutely-positioned band so the card's height cannot move. |
| Collections swatches (`1923:2112`) | Four cells, the second filled, on every card | **A working view switcher** | The client's note: it turns the garment. Wired to a `views` list; only one photograph per product exists so far, so the other three swatches fall back to it. |
| Product canvas bottom edge | Blocks are separate artboards; the cut is never seen | **Last 160 units masked into the page** | The canvas comes to rest over exactly the details screen, so its edge lands on the join with the next section and sliced the jacket with a hard line. Measured after: the step at the join is −0.24 against a page lattice level of 10.40. |
| FAQ product (`1925:2479`) | The details frame's photograph, mirrored | **The hero's 3D model, pinned** | The client's call. A second WebGL context, framed to the photograph's own placement: 765 units tall, centred 313 left of the frame's centre line and 200 below it. The photograph is deleted. |
| Footer sign-up (`1931:2726`) | A bordered box with "Your e-mail" and an arrow | **A real `input`, `button` and `checkbox`** | The frame draws a picture of a control; rendering it as static text would tell a screen-reader user there is nothing to fill in. **It has no endpoint yet** — submitting is prevented rather than left to reload the page. Needs wiring before launch. |
| FAQ column rule (`1925:2473`) | A rotated 112-unit line element | **A left border on the answer** | A description list's content model allows only `dt` and `dd` inside a row, so the rule cannot be an element of its own without giving up `dl`. Drawn as the answer's border with the frame's 32-unit gap split either side; the visual is identical. |
| Technology leader lines | Five separate SVG exports | **One drawn construction** | They are the same diagonal and 8-unit square with different endpoints. Derived from the same numbers that place the card, so the line cannot come loose from the card when either moves — which five fixed assets would not survive. |
| Header | Drawn at the top of each artboard | **Pinned for the whole page** | The client's call. The sticky wrapper carries zero height from `lg`, so the banner keeps the frame's coordinates and adds no flow space. |
| Image formats | — | **WebP only, AVIF disabled** | AVIF encoding from a source with alpha measured at >3m20s against WebP's 0.125s, which stopped three of four product images from ever arriving. See `next.config.ts`. |
| Details header (`1748:1102`) | Logo, nav and cart drawn again | **Not rebuilt** | Each Figma frame is a standalone artboard, so it has to carry the banner; the page has one. Rebuilding it would put a second `<header>` and a duplicate nav in the document. |
| Details type below 1024 | No frame under 1024 exists | **Headline steps 70→40px, body copy steps at `sm`** | The adaptive grid changes its base width at 640, so every type step has to fire there or the 641–1024 band renders tiny — measured at 8px before this was corrected. ADR-0030. |
| Product size (`902:302`) | 500 tall, ink centred at y 380 | **540 tall, ink centred at y 364** | Enlarged on the client's call. It had to move up 16 units as well: a 540-tall product centred at 380 reaches y 650, and the lede starts at 646. Now y 94–634 — 40 under the header, 12 above the lede. |
| Lattice pointer glow | The frames draw a flat plate, no hover state | **Page-wide 272px torch** (`--raw-size-lattice-reach: 17rem`) | Added on the client's call, then tightened from 340px on a second pass. Measured by region median at 1440×800: +10 brightness under the cursor, gone by 60px out. Sampling single pixels along one row cannot see it at all — the row lands on lattice gaps and product photography, so a point probe reads a flat zero and looks like the effect is dead. |
| Collections card fill | Card exported transparent | **Transparent — reverted to the export** | Filled first, because a transparent card let the page's own grid run through the garment and the four read as cut-outs; the client reversed that on 2026-08-27. The cards are their border and their contents now, and the page runs behind them — which also means they take the page's pointer highlight through the hole where their fill was, rather than carrying a second copy of it. |
| Collections photography | Four garments, one photograph each, cropped differently | **Four colourways of one garment, dealt in a drawn order** | Supplied 2026-08-27 and replacing the frame's four crops, which are deleted. The pairing with the product names is arbitrary — they describe four different jackets nobody has photographed yet — and only the order is deliberate, in that it was drawn rather than sorted: lime, rose, copper, cobalt. They are 1080-square on transparency, framed alike, so the per-photograph nudges the old crops needed are gone. The card's picture box became the card's own content width, square, and `object-contain`: the garment is sleeves-out and nearly as wide as it is tall, and `object-cover` in the old 237x327 portrait box cut both cuffs off. |
| Technology stack | A still render of the five layers | **The same artwork as a clip, scrubbed by the section's scroll, black ground keyed out** | The client's call. The section already pins a stage and walks a card down the layers on scroll; the clip runs on that same clock, so the picture and the specification move together and either can be held still. It starts a viewport early, so it is already alive as the screen arrives. The still is kept as the `poster`, so the box is never a hole while 12MB arrives. **`mix-blend-mode` was tried first and does nothing here**: a blend composites against the backdrop inside the nearest ancestor stacking context, and the stage is pinned with `position: sticky`, which creates one — the page's lattice is outside it. Verified by forcing the stage to `position: relative`, where the blend works, and back. The ground is keyed instead, with an SVG `feColorMatrix` writing alpha from the colour channels (equal weights, not luminance — the artwork is blue and the shell would key out with the ground). Measured on a frame: ground 0 of 765 at the median, 3 at the 95th percentile. The weight is 7 — at 2.6 the bottom two layers, whose median pixel is 0.14 of full brightness, came out a third opaque and the grid read straight through them. At 7/−0.04, 51% of the frame is fully opaque against 36%, the part-transparent band collapses from 15% to 5%, and the clear ground only moves 41% → 39%. ADR-0040. |
| Collections card tilt | The frame draws four flat cards | **The card leans towards the cursor; the garment stands off its face** | Added on the client's call. The `li` owns the lens (`perspective: 60rem`), the panel inside owns the rotation (±6.5°) and `transform-style: preserve-3d`, and the photographs sit in a layer with a constant `translateZ` of 2.5rem — so the layer's parallax is the perspective's own doing rather than a second animation kept in step with the first. The panel had to move off the `li` for it: the reveal already writes a transform there and an element has only one. `@react-spring/web` directly, mouse pointers only, silent under `prefers-reduced-motion`. ADR-0039. |
| Technology leader anchors | Five x/y points on the still, in frame units | **Fractions of the artwork, measured against the clip** — 0.600/0.145, 0.707/0.354, 0.773/0.477, 0.855/0.576, 0.822/0.740 | The frame's numbers pointed at the still Figma shipped; the clip that replaced it composes the stack differently, so every square landed on empty lattice. Re-measured against the clip's settled arrangement — the one on screen while cards two to five are up — with each point checked to sit on the layer its card names: wet outer sheet, ripstop mesh, quilted insulation, pale membrane, lining. Stated as fractions of the *drawn* artwork, which is a square as tall as its box (`object-contain`, 1:1 clip), so they hold at any canvas width. Verified in the running page: all five markers land within 0.001 of the measured fraction. Re-measure if the clip is ever re-rendered. |
| Leader square | Drawn in the rule's 25% white | **Pure white** | It is the one part of the leader that has to be *found* — it names which layer the card describes — and at a quarter opacity over an artwork this busy it read as a speck of the render. The line stays at 25%: it is the connection, not the point. |
| Product travel curve | Spec has no journey | **Ease-out (`1 − (1−t)^2.2`) for the framing, smootherstep kept for the turn** | Smootherstep has zero velocity at *both* ends, so the garment barely moved for the first stretch, hurried through the middle and then stopped dead while the reader was still scrolling — and stopping is what it looked like, because the canvas is pinned and the copy beside it keeps going. The client asked for it to always be coming down and to slow hard at the end. Now it is at 78% of the drop by halfway and still moving through the last tenth, at about a seventh of its average rate. The turn keeps smootherstep: the details screen was composed around a fixed three-quarter angle, and a pose still rotating when the screen settles reads as a mistake rather than as momentum. |
| FAQ approach | — | **A window: begins at 0.55 of a viewport above the fold, ends 0.3 below it** | It began a full viewport early and was over before the copy beside it had arrived, so it was moved later — to 0.55 — which also made it quick: the whole travel in 418px of scroll. Ending it 0.3 of a viewport *past* the screen's arrival gives the same distance 646px instead, and leaves the garment still settling while the screen is being read: two thirds in when it arrives. |
| Pinned release | — | **The product and the clip lag the page as their stage un-pins** | A pinned element's apparent velocity is zero while it sticks and the page's own the frame after — a step, and a step is what reads as something slamming into place. Both now hold back by `λ(1 − e^(−x/λ))` of the distance scrolled past the release, whose derivative at the seam is exactly 1: they start the release perfectly still and ease up to the page's speed. λ is **0.15 of a viewport**, down from 0.35 on the client's call: it is also the largest distance either can fall behind, and at a third of a viewport the product read as sliding out of its own screen while the clip hung a sheet of the stack over the section below. Verified in the running page — the clip's offset settles at 113px against a bound of 114, and is 0 at the seam. ADR-0041. |
| Clip run length | — | **Ends at 4.4s of 5.04** | Measured frame by frame, 99.1% of the clip's movement is over by 4.3s, so mapped across the whole travel the last 15% of the scroll showed a still picture — and then the stage un-pinned and the still picture flew off. Ending the run where the clip stops changing puts its own landing at the end of the pin, where the release ramp takes over. The frames past it are the same frame. |
| Hover hand-back | — | **900ms, shaped by smootherstep** | The cursor's authority returned on a straight exponential, which starts at full speed: the garment lurched towards wherever the cursor happened to be at the exact moment it finished arriving. Shaped, the hand-back begins and ends at zero rate. |
| Smooth scroll | — | **Lenis at `lerp: 0.075`, `syncTouch` on** | Wheel smoothing was already on at Lenis's default 0.1; the glide is longer now — measured, a wheel notch settles over about 29 frames against 15 — and touch is smoothed too, which it was not: `syncTouch` is off by default, so the phone scrolled natively while the desktop glided. Both are disabled under `prefers-reduced-motion`, where smoothing is motion the reader did not ask for. |
| FAQ product approach | The frame draws it in place | **Enters 110 units from the left with 28° of turn, on scroll** | Added on the client's call. Both values are deltas on the pose the screen was composed around, driven by the section's own scroll progress and nothing else — so it runs backwards when the reader does, which a timed reveal would not. They started even at 240/14 and read as a photograph being pushed in from the edge; the weight moved to the rotation on a second call, halving the travel and doubling the turn. That also feeds the sleeves, which are driven by angular velocity — twice as much of it over half the distance. |
| Frame scale | Frame is 1440×800; the page scaled it by **width** | **Scaled by whichever axis runs out first** — `min(1.111111vw, 2lvh)` | A width-only scale makes a 1.8:1 composition taller than any window wider than 1.8:1, and the bottom of it is simply cut. Measured at 1920×950 — a maximised browser on a 1080p display — the frame came out 1067 units tall in a 950-unit window: the hero's CTA and both badges sat below the fold, 45 elements crossing it, and the technology screen lost its closing note and the last card. Above 1.8:1 the height now binds, the frame is drawn at the size that fits and `mx-auto` centres it, leaving a band of the page's own lattice down each side. ADR-0035. |
| Frame canvas width | The frame is 1440 units wide | **The canvas is the window; every x is edge- or centre-relative** | Scaled to fit the height, a 90rem canvas is narrower than a wide window, and centring it left a band of bare lattice down each side — the page growing margins it was never drawn with. Full width instead, with the extra width going to the gaps between columns: the right-hand columns (details specs, FAQ rows, technology card, cart) are `right-10`, the centred pieces (wordmark plate, stack, claim, CTAs, grab area) are `left-1/2` or auto margins, and the technology leader lines are drawn from `50%` and `100%`. Every one of those resolves to the frame's own number at exactly 1440 units, so the reference render is unchanged. It also settles the scrollbar: `w-360` was 90rem = `100vw`, which counts the scrollbar the content box does not, so the canvas overhung the right edge by 15px and everything centred landed 7.5px off. Measured after, at 1585 content units: every right-hand column 41.3px clear of the edge against a 40-unit margin of 41.0, h1 centre 792.3 against a viewport centre of 792.5. ADR-0037. |
| Background lattice | One plate behind the composition | **One grid, drawn once, on whole pixels, travelling with the page** | The page and a fixed highlight layer each drew the bars, anchored to different things, so they slid across each other on every scroll and the background broke into half-cells and swimming stripes. The survivor was the fixed one, which fixed the moire and left the grid standing still behind a moving page — so the whole surface moved onto the page itself (`hero-lattice-panel`): bars on `scroll` attachment, the three highlight layers on `fixed`, bars listed first so they still quantise the light into cells. Pitch, gap and the half-gap bleed are rounded to the pixel (`round()`, `@supports`-guarded): at 1920 a 0.625rem pitch is 13.33px, and a fractional repeating gradient antialiases on a three-cell beat that reads as a ripple. Measured after: a 3000px scroll held 16.7ms median and 16.8ms worst frame. ADR-0036, ADR-0038. |
| Sleeve trail gain | Spec has no bone rig | **Three gains, one filter: `sleeveLag` 7 (hover), `travelLag` 1.5 (scroll), `dragLag` 0.63 (touch), ceiling 30°** | The gain multiplies angular *velocity*, and the three inputs deliver it at wildly different magnitudes — so one number sized for any of them is wrong for the other two. On the shared gain a normal scroll swung the deepest strap 10.5° and a wheel flick 36.6°, against 2.2° for a brisk cursor sweep, with fifty times the frame-to-frame change: the garment was being whipped by the scroll rather than turned by it. Split, and with the body now *following* the scroll's pose instead of being placed at it (`JOURNEY_FOLLOW`), the same two are 2.6° and 9.9°. A one-pole filter on the drive (`JIGGLE_DRIVE_FOLLOW`) takes the corner off what the chains chase — a third less frame-to-frame change on a sweep, a sixth on a flick. |

The plate's torch reads the **same** pointer instance the scene does, resolved
from `[data-product-region]` / `[data-pointer-frame]` rather than from whatever
element the caller happens to hold. It regressed once when each consumer named
its own element and the canvas moved out of the hero — see the changelog.

The plate is pinned **behind** the product: `z-0` against the model's `z-10`
inside a stage that carries `isolation: isolate`. The isolation matters — without
its own stacking context the model's `z-10` would compete with the frame's copy,
which is also `z-10` against the section, and the jacket would start winning
against the text. Raising the plate's opacity can never bring it over the jacket.

## Open against the design

- **The cookie banner is the starter's, and stays that way — the client's call.**
  It is not in any Figma frame, it renders in the starter's default language
  (`font-sans`, rounded corners, a shadow, a light plate) rather than the site's,
  and its "privacy policy" link points at a route that does not exist, so Next
  prefetches it and the console carries a 404 on every load. All of that is
  accepted: this is a concept, not a shipping storefront. **Do not re-flag it.**
  Before it ever goes live it needs a real privacy page and the site's own
  styling — that is a launch task, not a defect in the build.
- **Only the 1440 frame exists**, so everything below `lg` is an adaptation, not
  a design. Above 1440 the frame scales up to fill the viewport (ADR-0024). At
  and below 1024 the absolute frame is abandoned for ordinary flow — see
  ADR-0029. If tablet and mobile frames are ever drawn, they replace the
  adaptation rather than adjust it.
- **The frame is 1.8:1.** The section fills the viewport height and the extra
  height is absorbed by the gaps — pieces stay anchored to their frame edges
  (ADR-0025). The composition is never scaled to fit or cropped, since content
  sits in all four corners. A window shorter than the frame scrolls.
- **"WORLOWIDE SHIPPING"** (`902:326`) is a typo for WORLDWIDE. Transcribed as-is;
  copy is not corrected in code.
- **The product model's material is not the frame's material.** The GLB carries
  one near-black, untextured material; the frame's plate was lit and shaded
  offline and is iridescent. `hero-subject.tsx` gives it metalness, roughness and
  an environment probe to get close, but the rainbow sheen is not in the file.
  Needs either a textured/`KHR_materials_iridescence` export or a shader pass.
- **The model's pose is its rest pose.** It has a skeleton but no animation
  clips, so the arms hang differently from the frame's render.
- **The mesh is wider than the frame's flat plate was.** Its bounds are 1.34 as
  wide as tall, where the flat render measured 1.27, so it needs a wider box for
  the same height. `hero-subject.tsx` frames on height but clamps against
  `MAX_WIDTH_FRACTION`, so a wide model backs the camera off instead of being
  silently cropped at the canvas edge.
- **The plate's finish is load-bearing, and it is easy to get wrong.** Two
  finishes of the wordmark exist and they share an alpha mask, so they look
  interchangeable — they are not. Measured against Figma's export of `902:306`:

  | Artwork | Brightest / mean | At the frame's 8% over the lattice (13) |
  |---------|------------------|------------------------------------------|
  | Figma's export of `902:306` | 251 / 93.6 | — |
  | `hero-wordmark.png` (chrome) | 251.3 / 94.2 | **33** — matches the reference's measured peak of 32 |
  | `hero-wordmark-dark.png` | 20 / 9.3 | 14.6 — invisible against 13 |

  The first `Background Image.png` supplied was the dark one, which is why the
  plate read as missing. Compare **luminance**, not alpha, when checking a plate:
  alpha alone said the dark file matched.

  **Verified against the frame.** Rebuilding the background exactly as the browser
  composites it — black canvas, lattice cells, then the chrome plate at 8% — and
  sampling the plate-only band (x 100–395, y 95–335, clear of the product and the
  edge copy) gives `max 32 / p99 28 / median 13`, identical to Figma's own render
  of `902:304` in the same band. The node is still `opacity-8`; the plate carries
  an `sRGB` chunk and no embedded ICC profile, so nothing is being colour-managed
  away. At 8% this plate is *meant* to be a ghost — peak RGB 32 on a 13 lattice.
- **Nav, cart and CTA link to `#`** — no routes exist behind them yet.
