import { HeroWordmark } from "./hero-wordmark";
import type { HeroImage } from "./hero.types";

export interface HeroStageProps {
  backdrop: HeroImage;
}

/**
 * Wordmark plate opacity.
 *
 * **A deliberate deviation from the frame**, which draws it at 8% (Figma
 * 902:306) — a ghost peaking at RGB 32 against the lattice's 13. Raised to 20%
 * on the client's call so the wordmark actually reads; its brightest strokes now
 * land around 63. Recorded in DESIGN-MAP.md.
 *
 * The number only means anything alongside the right artwork: this depends on
 * the plate being the *chrome* export, whose strokes peak at RGB 251. The dark
 * variant of the same wordmark (`hero-wordmark-dark.png`) peaks at 20 and is
 * invisible at any of these values. If the plate ever looks like it vanished,
 * check which file is wired up before touching this number.
 */
const BACKDROP_OPACITY = 0.2;

/**
 * The product's box below the frame breakpoint.
 *
 * Only the aspect: the two places that need it sit in different coordinate
 * systems — this box is in the section's flow, inside its own side padding,
 * while `ProductStage` overlays it absolutely and adds its own inset. What has
 * to agree is the shape, and that is what is shared.
 */
/**
 * The product's box below the frame.
 *
 * **4:3 on a phone, not square.** A square box is 350 units tall at 390 wide —
 * two fifths of the screen — and with the markers above it and the claim, the
 * button and two badges under it the hero ran 90px past the fold. The garment
 * is framed to the box's height, so the box is the only lever that moves that
 * number without shrinking the type around it.
 */
export const PRODUCT_BOX = "aspect-4/3 md:aspect-16/9";

/**
 * The backdrop plate, and the space the product occupies (Figma 902:306 /
 * 902:302).
 *
 * The **product itself is not rendered here any more** — it belongs to
 * `ProductStage`, one screen up, because it travels into the details section and
 * a canvas cannot escape the section it sits in. What is left is the wordmark
 * plate and, below `lg`, the box that reserves the product's space in the flow.
 *
 * The plate is not centred on the frame — it sits 19.5px below centre — so it is
 * pinned to the centre line by half its own height plus that nudge.
 *
 * Resized off the frame's value on the client's call to stop it crowding the
 * edge copy: **92%** (1157×617, same centre). At full size its strokes reached
 * x 204–1236 across the copy lines, against copy at x 40–196 and 1215–1400 — 8px
 * of clearance on the left and a 21px *overlap* on the right. At 92% it spans
 * 245–1195: 49px and 20px clear.
 *
 * The plate stays **behind** the product: it is `z-0` here and the canvas is
 * `z-10` on the region, so raising its opacity can never bring it over the
 * jacket. The canvas is cleared to alpha 0, so the plate shows through wherever
 * the product and the lattice do not cover.
 */
export const HeroStage = ({ backdrop }: HeroStageProps) => (
  <div
    // `data-hero-stage` is how the product canvas finds this box. Below the
    // frame the canvas is positioned against the travel region while this box
    // reserves the space inside the hero's column, so anything placed above it
    // — the markers — would slide out from under the product unless the canvas
    // is told where the box actually ended up. See `product-stage.tsx`.
    data-hero-stage
    className={`pointer-events-none relative z-0 w-full lg:absolute lg:inset-0 lg:aspect-auto lg:w-auto ${PRODUCT_BOX}`}
  >
    <HeroWordmark plate={backdrop} opacity={BACKDROP_OPACITY} />
  </div>
);
