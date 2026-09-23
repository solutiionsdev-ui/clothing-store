"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { PRODUCT_BOX } from "./hero/hero-stage";
import type { HeroModel } from "./hero";

export interface ProductStageProps {
  subject: HeroModel;
  /** The screens the product travels across, in order. The first is the hero. */
  children: ReactNode;
}

/**
 * three.js and the model are the heaviest thing on the page and nothing above
 * the fold depends on them, so the whole renderer is split out and never
 * reaches the server bundle.
 */
const HeroScene = dynamic(
  () => import("./hero/hero-scene").then((m) => m.HeroScene),
  { ssr: false },
);

/**
 * The region the product lives in, spanning both screens.
 *
 * There is **one** canvas and one WebGL context for the whole page. The product
 * does not hand off from a hero renderer to a details renderer — it never
 * changes hands at all; only its framing does, driven by scroll. That is the
 * only way the transition can be continuous: two canvases would mean two
 * contexts, two loads of the same model, and a cross-fade at the seam.
 *
 * **From `lg` the canvas is sticky** and the two screens are pulled back over it
 * with a negative margin. The sticky box is viewport-tall and in flow, so it
 * stays pinned for exactly the region's scroll length and the product appears to
 * hold still while the copy moves past it. The negative margin is what stops the
 * sticky box from *also* occupying a screen of its own.
 *
 * **Below `lg` there is no travel.** The canvas is absolutely positioned over
 * the hero's own product box, which is where the phone layout puts it, and the
 * details screen has no product at all — a viewport-tall jacket behind two
 * screens of stacked copy is a different design, and there is no frame for it.
 * `PRODUCT_BOX` is shared with `HeroStage` so the overlay and the space it is
 * reserving cannot drift apart.
 *
 * **The bottom edge is dissolved, not cut.** Once the canvas has finished
 * sticking it comes to rest over exactly the details screen — document 800 to
 * 1600 on a 1440×800 page — so its bottom edge lands precisely on the seam with
 * the section below, and the product, which the frame runs off the bottom of
 * that screen, was being sliced by a hard horizontal line there. In Figma the
 * two blocks are separate artboards and that cut is never seen; on a continuous
 * page it reads as a join. A mask fades the last `--hero-stage-fade` into the
 * page instead. It is a **deliberate deviation**: at rest the frame has the
 * jacket solid to the edge.
 *
 * **Stacking.** The canvas is `z-10` and so is the frames' copy, but the copy
 * comes later in the document, so it paints on top; the wordmark plate inside
 * the hero is `z-0` and stays behind. That is the same order the stage used when
 * it owned the canvas, just expressed across siblings instead of inside one
 * isolated box.
 */
export const ProductStage = ({ subject, children }: ProductStageProps) => {
  const region = useRef<HTMLDivElement>(null);

  /**
   * **Below the frame, where the product sits is decided by the hero's column
   * rather than by the top of the region.**
   *
   * The canvas is one element for two screens, so it cannot be *in* the flow.
   * Below the frame it is simply a box, and it used to be pinned to the
   * region's own top — which held only while the hero opened with the product.
   * It no longer does: the markers lead the screen now, and a canvas still
   * pinned to the top would draw the garment straight over them.
   *
   * So the offset is read from the box the hero actually reserves instead of
   * assumed — no marker height, no gap arithmetic, nothing to fall out of step
   * when the copy rewraps at some other width. The observer covers the rewrap;
   * `lg:top-*` overrides the variable wherever the frame is in charge.
   */
  useEffect(() => {
    const root = region.current;
    const box = root?.querySelector("[data-hero-stage]");
    if (!root || !(box instanceof HTMLElement)) return;

    const sync = () => {
      const offset =
        box.getBoundingClientRect().top - root.getBoundingClientRect().top;
      root.style.setProperty(
        "--hero-stage-top",
        `${Math.max(0, Math.round(offset))}px`,
      );
    };
    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(root);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div data-product-region ref={region} className="relative">
      <div
        data-pointer-frame
        // **The canvas is one frame tall, and it sticks half the slack down.**
        // Viewport-tall, it overhung the details screen — which is cut to the
        // frame's own 800 units — by the difference, and the product spilled 89px
        // up into the seam between the first and second screens at 1280×800. At
        // the frame's height it can do that nowhere: sticky clamps its bottom to
        // the region's, so on the details screen the canvas *is* the section.
        //
        // The `top` offset is what keeps the hero right. A sticky box pinned to 0
        // would sit against the top of a viewport that is taller than it; half the
        // leftover puts it back in the middle, where the hero's product belongs.
        // At 1440×800 the leftover is zero and this resolves to `top: 0`.
        className={`pointer-events-none absolute inset-x-5 top-[var(--hero-stage-top,0px)] z-10 overflow-hidden ${PRODUCT_BOX} lg:sticky lg:inset-x-0 lg:top-[calc((100lvh-50rem)/2)] lg:aspect-auto lg:h-200 lg:w-auto lg:hero-stage-mask`}
      >
        <HeroScene src={subject.src} label={subject.label} />
      </div>

      {/* Pulled back over the sticky box by exactly its height — it is one frame
        tall now, not one viewport. */}
      <div className="lg:-mt-200">{children}</div>
    </div>
  );
};
