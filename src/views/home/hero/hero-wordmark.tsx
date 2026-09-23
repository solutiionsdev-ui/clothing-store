"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { Spring } from "@/components/animation/springs/spring";
import { subscribeToTicker } from "@/lib/animation/ticker";

import { acquireHeroPointer } from "./hero-pointer";
import type { HeroImage } from "./hero.types";

export interface HeroWordmarkProps {
  plate: HeroImage;
  /** Resting opacity of the plate. */
  opacity: number;
}

/** Radius of the revealed disc, px. Sized to sit in the lattice's 340px family. */
const REVEAL_RADIUS = 260;

/**
 * The disc, as a share of the plate's longer side.
 *
 * On the frame's own plate — 289 units across a 1440 screen — the 260px radius
 * is a torch. In the phone's product box the same disc is wider than the plate
 * it is meant to be moving over, so everything is lit at once and there is no
 * light to see. Capped against the box, the aperture stays a *part* of the
 * plate at every size, which is the whole illusion.
 */
const REVEAL_SHARE = 0.42;

/**
 * The sheen: a band of the plate at full strength, travelling across it.
 *
 * The plate's artwork is chromed lettering, and chrome is only chrome when
 * something moves over it. On the frame that is the cursor. Below it there is
 * no cursor, so the same aperture is driven across the mark on its own —
 * a slanted band rather than the pointer's disc, because a sweep is what reads
 * as a highlight travelling over metal, while a spot reads as a torch.
 *
 * `SWEEP_S` is the crossing; the rest of `SWEEP_CYCLE_S` is the pause between
 * passes. A sheen that never stops stops being an event.
 */
const SWEEP_S = 2.6;
const SWEEP_CYCLE_S = 7.4;
/** The band's width, as a share of the plate. */
const SWEEP_BAND = 0.42;
/** How bright the band lifts the mark under it. */
const SWEEP_STRENGTH = 1;

/**
 * What the band does to the copy it carries.
 *
 * Lifting the plate from its resting fifth to full opacity is the whole trick
 * on the frame, where the mark is 1157px of chromed lettering. At a phone's
 * size the same lift moved the mark's own pixels by ten levels out of 255 —
 * measured — because the artwork under the band is dark to begin with. The
 * band brightens what it carries, so it reads as light *on* the metal rather
 * than as the metal briefly becoming less transparent.
 */
const SWEEP_FILTER = "brightness(2.6) contrast(1.1)";

/** The band's own shape — slanted, soft on both edges. */
const SWEEP_MASK =
  "linear-gradient(100deg, transparent 0%, rgb(0 0 0 / 0.35) 32%, #000 50%, rgb(0 0 0 / 0.35) 68%, transparent 100%)";

/** The mark's resting opacity swings by this much while the sheen runs. */

/**
 * The plate's own breath while the torch drifts, as a share of its resting
 * opacity, and the period it takes.
 *
 * **The travelling light is not enough on its own, and it is worth saying why.**
 * The artwork is mostly transparent: lighting an empty pixel changes nothing, so
 * on a phone — where the box crops the plate to the claws either side of the
 * product — the aperture passing over it moved the picture by two to four levels
 * out of 255. Measured, not guessed. What does read at that size is the plate
 * itself rising and falling, because that acts on every mark it has at once.
 * The two run on different periods, so the pair never pulses together and the
 * backdrop keeps drifting rather than blinking.
 */
const PLATE_BREATH_LOW = 0.8;
const PLATE_BREATH_HIGH = 1.7;
const PLATE_BREATH_S = 6.7;

/** Touch has no cursor to follow, so the drift is stepped at 30fps, not 60. */
const DRIFT_FRAME_MS = 1000 / 30;

/** The cursor's aperture — a soft disc, centred on the pointer. */
const DISC_MASK =
  "radial-gradient(circle closest-side, #000 0%, rgba(0,0,0,0.75) 45%, transparent 100%)";

/**
 * How much larger than its own canvas the mark is drawn below the frame.
 *
 * The supplied plate is 5028×2684 and the artwork inside it is 4639 wide —
 * 3.9% of transparent margin at each side. Fitted by its canvas, the lettering
 * therefore stopped ~15px short of the screen at both ends and read as a small
 * object floating in a wide box. Scaled by the margin, the *ink* reaches the
 * edge instead, which is what "full width" was supposed to mean, and nothing
 * visible is cropped: what overhangs is the empty margin.
 *
 * Both copies — the plate and the one the sheen carries — take it, or the band
 * would reveal a differently-sized mark.
 */
const INK_SCALE = 5028 / 4639;

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const FRAME_QUERY = "(min-width: 1024px) and (min-aspect-ratio: 1/1)";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The wordmark plate, with a torch that lifts it to full opacity under the
 * cursor and leaves the rest at rest.
 *
 * Built as a **moving window over a second copy** rather than a mask that
 * follows the cursor. A `mask-position` animated per frame repaints the whole
 * plate — around 2.8M device pixels here — every frame. This way the only thing
 * that changes is a `transform` on two small boxes, which the compositor
 * handles without a repaint: the window translates to the cursor and the copy
 * inside it translates back by the same amount, so the copy stays pinned to the
 * plate underneath while the aperture slides over it.
 *
 * The soft edge is a static radial mask on the window, so it never re-rasterises
 * either. Without WebGL or with reduced motion the base plate is untouched — the
 * torch is an enhancement, never the thing that makes the wordmark visible.
 */
export const HeroWordmark = ({ plate, opacity }: HeroWordmarkProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLImageElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const aperture = windowRef.current;
    const inner = innerRef.current;
    const base = baseRef.current;
    if (!box || !aperture || !inner || !base) return;
    if (prefersReducedMotion()) return;

    // The same instance the scene uses — `acquireHeroPointer` resolves the pair
    // from anywhere inside the travel region, so this cannot drift apart from
    // the canvas the way it did when each consumer named its own element.
    const { pointer, release } = acquireHeroPointer(box);

    let visible = false;
    let radius = REVEAL_RADIUS;
    let plateW = 0;
    let plateH = 0;
    let band = 0;

    // **The torch drives itself where there is no hand to drive it.**
    // The plate is lit through a moving aperture, and until now the only thing
    // that could move it was a cursor — so on a phone or a tablet the wordmark
    // sat behind the product at its resting 20% and never did anything. The
    // same aperture, walked along a slow two-period figure, gives that screen
    // the light without inventing a second mechanism: it is still one transform
    // on two small boxes, still no repaint. Reduced motion is handled above,
    // where the whole effect stands down.
    const hoverQuery = window.matchMedia(HOVER_QUERY);
    const frameQuery = window.matchMedia(FRAME_QUERY);
    let drifting = !hoverQuery.matches || !frameQuery.matches;
    const syncMode = () => {
      drifting = !hoverQuery.matches || !frameQuery.matches;
      if (plateW) applyShape();
      if (!drifting) base.style.opacity = String(opacity);
    };
    hoverQuery.addEventListener("change", syncMode);
    frameQuery.addEventListener("change", syncMode);

    // The copy inside the aperture has to be the size of the plate, not of the
    // aperture it lives in, or `object-cover` would frame a different crop and
    // the torch would reveal the wrong part of the wordmark.
    const syncSize = () => {
      const rect = box.getBoundingClientRect();
      plateW = rect.width;
      plateH = rect.height;
      inner.style.width = `${rect.width}px`;
      inner.style.height = `${rect.height}px`;
      radius = Math.min(
        REVEAL_RADIUS,
        Math.max(rect.width, rect.height) * REVEAL_SHARE,
      );
      applyShape();
    };

    // The aperture is a disc for the cursor and a band for the sweep, and the
    // mode can change under a rotation — so the shape is applied from one
    // place that both the resize and the media listeners call.
    const applyShape = () => {
      if (drifting) {
        band = Math.max(64, plateW * SWEEP_BAND);
        aperture.style.width = `${band}px`;
        aperture.style.height = `${plateH}px`;
        aperture.style.maskImage = SWEEP_MASK;
        aperture.style.webkitMaskImage = SWEEP_MASK;
        inner.style.filter = SWEEP_FILTER;
        return;
      }
      aperture.style.width = `${radius * 2}px`;
      aperture.style.height = `${radius * 2}px`;
      aperture.style.maskImage = DISC_MASK;
      aperture.style.webkitMaskImage = DISC_MASK;
      inner.style.filter = "";
    };
    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(box);

    const place = (x: number, y: number, opacity: number) => {
      aperture.style.transform = `translate3d(${x - radius}px, ${y - radius}px, 0)`;
      inner.style.transform = `translate3d(${radius - x}px, ${radius - y}px, 0)`;
      aperture.style.opacity = String(opacity);
    };

    const unsubscribe = subscribeToTicker(
      (time) => {
        if (drifting) {
          if (!plateW || !plateH) return;
          const cycle = (time / 1000) % SWEEP_CYCLE_S;
          const swell =
            (PLATE_BREATH_LOW + PLATE_BREATH_HIGH) / 2 +
            ((PLATE_BREATH_HIGH - PLATE_BREATH_LOW) / 2) *
              Math.sin((time / 1000 / PLATE_BREATH_S) * Math.PI * 2);
          base.style.opacity = String(opacity * swell);

          if (cycle > SWEEP_S) {
            if (visible) {
              visible = false;
              aperture.style.opacity = "0";
            }
            return;
          }

          // Left of the plate to right of it, so the band enters and leaves
          // rather than appearing on the mark and vanishing off it.
          const p = cycle / SWEEP_S;
          const left = -band + p * (plateW + band * 2);
          visible = true;
          aperture.style.transform = `translate3d(${left}px, 0, 0)`;
          inner.style.transform = `translate3d(${-left}px, 0, 0)`;
          aperture.style.opacity = String(SWEEP_STRENGTH);
          return;
        }

        const state = pointer.state;
        const shown = state.engaged && state.intensity > 0.001;

        if (shown !== visible) {
          visible = shown;
          if (!shown) aperture.style.opacity = "0";
        }
        if (!shown) return;

        // The plate's own box, so the cursor can be expressed in its coordinates.
        // `pointer.frame` is whatever the pointer measured against — the canvas,
        // not this section — so the conversion has to go through it.
        const rect = box.getBoundingClientRect();
        const frameRect = pointer.frame.getBoundingClientRect();
        const x = state.x + frameRect.left - rect.left;
        const y = state.y + frameRect.top - rect.top;

        place(x, y, state.intensity);
      },
      () => (drifting ? DRIFT_FRAME_MS : 0),
    );

    return () => {
      base.style.opacity = String(opacity);
      unsubscribe();
      resizeObserver.disconnect();
      hoverQuery.removeEventListener("change", syncMode);
      frameQuery.removeEventListener("change", syncMode);
      release();
    };
  }, [opacity]);

  return (
    <Spring
      tag="div"
      mode="once"
      from={{ opacity: 0 }}
      to={{ opacity: 1 }}
      // **Whole, and as wide as the screen allows.** In the frame the mark is
      // nearly twice the product's width, so the garment stands *in front of*
      // it. Below the frame it was confined to the product's own box and
      // `object-cover` cropped its ends off at both sides — the marks that
      // reach past the jacket are exactly the part that makes it read as a
      // backdrop. Contained, it is never cut; bled past the section's margins,
      // it takes the full width of the screen, which is the largest it can be
      // and still show its ends.
      style={{ "--ink-scale": INK_SCALE } as CSSProperties}
      // **Centred by auto margins, not by a left coordinate and not by a
      // transform.** The frame's x of 142 against a 1157-wide plate is the
      // centre line of a 1440 canvas to half a unit; on a wider canvas only
      // "centred" still means centred. Auto margins because the spring owns
      // this element's `transform` and `-translate-x-1/2` would be overwritten.
      className="absolute inset-0 z-0 max-lg:-inset-x-5 lg:inset-x-0 lg:top-1/2 lg:bottom-auto lg:mx-auto lg:-mt-72.25 lg:h-154.25 lg:w-289.25"
    >
      <div ref={boxRef} className="relative h-full w-full overflow-hidden">
        <Image
          ref={baseRef}
          src={plate.src}
          alt={plate.alt}
          width={plate.width}
          height={plate.height}
          priority
          sizes="87vw"
          className="h-full w-full object-cover max-lg:scale-[var(--ink-scale)] max-lg:object-contain"
          style={{ opacity }}
        />

        <div
          ref={windowRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 opacity-0"
          style={{
            // Sized by the effect against the plate it sits on — see
            // `REVEAL_SHARE`. These are the frame's values, for the first paint.
            width: REVEAL_RADIUS * 2,
            height: REVEAL_RADIUS * 2,
            // Static — it never re-rasterises, only the box it sits on moves.
            maskImage: DISC_MASK,
            WebkitMaskImage: DISC_MASK,
            willChange: "transform",
          }}
        >
          <div ref={innerRef} className="absolute top-0 left-0">
            <Image
              src={plate.src}
              alt=""
              width={plate.width}
              height={plate.height}
              priority
              sizes="87vw"
              aria-hidden
              className="max-w-none object-cover max-lg:scale-[var(--ink-scale)] max-lg:object-contain"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </div>
    </Spring>
  );
};
