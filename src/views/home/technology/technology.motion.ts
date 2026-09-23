/**
 * Motion constants for the technology section.
 */

/**
 * How much scroll each layer after the first is given, as a share of the
 * viewport.
 *
 * The section pins its stage and walks the card down the stack, so the region
 * has to be tall enough to contain that walk: one viewport for the stage itself
 * plus this much per remaining layer.
 *
 * **0.4, down from 0.7 in two steps on the client's call** — the cards were
 * changing too slowly for the scroll they cost. Five layers now take 1.6
 * viewports of scrolling where they took 2.8, and the whole section 2.6 where
 * it took 3.8. This is close to the floor: below roughly 0.35 the stack starts
 * to skip a card under a trackpad flick, because a single inertial scroll
 * covers more than one step.
 *
 * Kept here because it appears in two places that must agree: the region's
 * height in CSS and the progress arithmetic in the component.
 */
export const LAYER_STEP = 0.4;

/** Region height, in viewport units, for `n` layers. */
export const regionHeight = (layers: number) => 1 + (layers - 1) * LAYER_STEP;
