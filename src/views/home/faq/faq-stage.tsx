"use client";

import dynamic from "next/dynamic";

import { NearViewport } from "@/components/common/near-viewport";

import type { FaqModel } from "./faq.types";

export interface FaqStageProps {
  subject: FaqModel;
}

/**
 * three.js and the model are the heaviest thing on the page and nothing on this
 * screen depends on them, so the renderer stays split out and never reaches the
 * server bundle.
 *
 * This exists as a client leaf only because `dynamic(..., { ssr: false })` is
 * not allowed inside a Server Component — the same reason `ProductStage` owns
 * the hero's mount rather than the section itself.
 */
const HeroScene = dynamic(
  () => import("../hero/hero-scene").then((m) => m.HeroScene),
  { ssr: false },
);

/**
 * Where the product sits on this screen, in frame units.
 *
 * Read off the photograph it replaces rather than chosen: the frame pushed a
 * 2880×1600 picture through a 1006×780 window at (-93, 208), which put the
 * jacket's ink 765 units tall with its centre 313 left of the frame's centre
 * line and 200 below it — cropped by the left and bottom edges, which is the
 * composition. Checked against the render: the ink's top edge landed on 217 in
 * both. Lifted 60 units from there on the client's call.
 */
// `turn` is left off on purpose: the scene defaults it to the angle the
// travelling instance comes to rest in on the details screen, so both
// screens show the garment from the same three-quarter angle and the two
// cannot drift apart if that angle is ever retuned.
/**
 * **The approach, on the client's call.** The garment enters from further off
 * the left edge and gives up a little turn as the screen arrives, both driven
 * by scroll position alone — so it runs backwards when the reader scrolls back,
 * which a timed reveal would not.
 *
 * **The turn carries the approach; the slide only sets it up.** The two started
 * even — 240 units of travel against 14 degrees — and read as a photograph
 * being pushed in from the edge. On the client's call the weight has moved to
 * the rotation: 28 degrees on top of the pose the screen was composed around,
 * against 110 units of shift. The garment now turns into its final pose more
 * than it arrives at it, which is also what gives the sleeves something to
 * trail — the bones are driven by angular velocity, and there is twice as much
 * of it over half the distance.
 *
 * 110 units is an eighth of the product's own height: enough that the collar
 * crosses a visible distance rather than shuffling, and short enough that the
 * jacket never reads as sliding in from off-screen — at rest it already runs
 * off that edge, so the whole travel happens with most of it in frame.
 */
const STILL = {
  height: 765,
  offsetX: -285,
  offsetY: -140,
  entrance: { shiftX: -110, turn: (-28 * Math.PI) / 180 },
};

/**
 * **Frame only.** In the frame the product runs off the bottom-left corner
 * *behind* the questions — it is the screen's ground. Below it there is no
 * corner to run off: the stage became a full-width photograph of the same
 * jacket the page has already shown twice, stacked above the list, and read as
 * a repeat rather than as a backdrop. `hidden` also means the box never lays
 * out, so the reveal never fires and the second WebGL context is never built.
 */
export const FaqStage = ({ subject }: FaqStageProps) => (
  // `data-pointer-frame` marks the box coordinates are measured against; the
  // section carries `data-product-region`, which is what `acquireHeroPointer`
  // resolves from, so this screen gets its own pointer rather than reaching for
  // the hero's — they are different canvases on different parts of the page.
  <div
    data-pointer-frame
    // **The bottom fade is back, and the reasoning that removed it was wrong.**
    // It was dropped on the arithmetic that the model comes to rest at 756
    // against a section `min-h-200` holds at 800 — true at 1440×800 and only
    // there. The section takes the *larger* of `h-lvh` and 800 units, and those
    // two scale differently: the units track the root font-size, the viewport
    // height does not. Change the aspect ratio and the clearance goes. Measured
    // on 1920×900 the garment was cut dead flat by the section's bottom edge.
    // The curve is `hero-stage-mask`'s, which holds full density through the
    // first third of its travel, so the ghosting that removing it was meant to
    // cure stays out of the body of the garment.
    className="pointer-events-none relative isolate hidden aspect-4/5 w-full overflow-hidden sm:aspect-4/3 lg:absolute lg:block lg:inset-0 lg:z-0 lg:aspect-auto lg:hero-stage-mask"
  >
    {/* Built only once this screen is near. The scene's cost is not its frame
        loop — that is already gated — it is *construction*: a second WebGL
        context, seven shader programs and nine texture uploads, which used to be
        charged to the first paint for a product seven screens further down. */}
    <NearViewport className="absolute inset-0">
      <HeroScene src={subject.src} label={subject.label} still={STILL} />
    </NearViewport>
  </div>
);
