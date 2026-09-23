"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  Bone,
  Box3,
  Color,
  DirectionalLight,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { subscribeToTicker } from "@/lib/animation/ticker";

import { acquireHeroPointer } from "./hero-pointer";

/**
 * Fixed framing, in frame units, instead of the scroll journey.
 *
 * `height` is the silhouette's height; the offsets are measured from the
 * canvas's own centre, positive `y` being up — the same convention
 * `SUBJECT_RISE` uses.
 */
export interface HeroSceneStill {
  height: number;
  offsetX: number;
  offsetY: number;
  /**
   * Turntable angle to hold, in radians. Defaults to `SCROLL_TURN` — the pose
   * the travelling instance comes to rest in on the details screen — so the two
   * screens show the garment from the same three-quarter angle rather than one
   * of them reverting to the model's front-on default.
   */
  turn?: number;
  /**
   * Where the product comes *from* as its screen scrolls into view.
   *
   * A pinned instance has no journey, and without one it is simply present the
   * moment its screen is: the copy beside it reveals line by line and the
   * garment is already sitting there, which reads as a background plate rather
   * than as part of the composition. This gives it an approach — an offset and
   * an angle it starts at and gives up as the screen arrives, driven by scroll
   * position and nothing else, so it runs backwards when the reader does.
   *
   * Both values are **deltas on the rest pose**, not absolute: the pose the
   * screen was composed around stays the single source of that framing, and
   * this can only say how far off it the product begins.
   */
  entrance?: {
    /** Extra x offset at the start, frame units. Negative enters from the left. */
    shiftX: number;
    /** Extra turntable angle at the start, radians. */
    turn: number;
  };
}

export interface HeroSceneProps {
  /** Path to the `.glb`. */
  src: string;
  /** Describes the product — a canvas has no `alt`. */
  label: string;
  /**
   * Pin the product instead of letting it travel.
   *
   * The hero's instance walks the product from one screen to the next, which
   * needs a region with the hero inside it to measure against. An instance that
   * is simply *placed* — the FAQ screen's — has no journey and no hero to read,
   * so it is given its framing outright and the scroll plumbing stands down.
   */
  still?: HeroSceneStill;
}

/* ── Framing ─────────────────────────────────────────────────────────────── */

/** The frame's design width. Everything below is in its units. */
const FRAME_WIDTH = 1440;
/**
 * The frame's design height — and the axis the scale is read off.
 *
 * **The canvas is no longer 1440 units wide.** The page scales the frame by
 * whichever axis runs out first and then lets the canvas fill the window
 * (ADR-0035, ADR-0037), so on a screen wider than 1.8:1 the canvas is wider
 * than 1440 units while a unit is smaller than `width / 1440`. Taking the scale
 * from the width therefore grew the product with the window instead of with the
 * composition — measured, 11% oversized at 1920x950, in a frame whose type and
 * margins had just been scaled *down* by the same 11%.
 *
 * The height is the axis that still means what it says: every frame screen is
 * `h-200`, exactly 800 units, so `boxHeight / 800` is the frame unit itself.
 */
const FRAME_HEIGHT = 800;
/** Silhouette height, in frame units. */
const SUBJECT_HEIGHT = 570;
/** How far above the section's centre line the silhouette sits, frame units. */
const SUBJECT_RISE = 36;
/**
 * Share of a boxed canvas the silhouette fills, when there is no frame.
 *
 * **Two numbers, because the two axes bind on different screens.** On a tablet
 * the box is 16:9 and the garment nearly square, so its height is what runs
 * out; on a phone the box is 4:3 and the sleeves reach the sides first. Filling
 * more of the height therefore grows the product on a tablet and changes
 * nothing on a phone, which is exactly the ask — and keeping the width share
 * where it is means the phone's sleeves keep the clearance they were given.
 */
const BOXED_FILL_Y = 0.97;
const BOXED_FILL_X = 0.93;

/**
 * How far down the box the product sits, as a share of its height.
 *
 * The model's own box hangs lower than the garment does — the straps run past
 * the hem — so centring the box leaves the silhouette high: measured 3px of
 * clearance above the collar against 38 below the hem. That asymmetry is what
 * stopped the height share from being raised at all. Dropping it by a fortieth
 * of the box hands the collar the room the hem was wasting.
 */
const BOXED_DROP = 0.025;

/**
 * Where the product ends up on the second screen, in the same frame units.
 *
 * Read off the frame's own photograph rather than invented. In node 1919:1662
 * the picture is pushed through a 1494×1160 window at 220.86%×158.1%, and the
 * jacket's ink inside that lands at x 0.5–1448.7, y 90.8–1227.9 — so 1137 units
 * tall, centred 259 below the frame's own centre line and cropped by the bottom
 * edge. Those two numbers are the whole target: the product grows 2.1× and sinks
 * until only its upper two thirds are in frame, which is exactly what the
 * photograph did.
 */
/**
 * Trimmed from the photograph's own 1137 on the client's call — 1137 → 1050 →
 * 960 → 880 → 765 — each time with the drop reduced by half the difference so
 * the **top edge stays put**. Shrinking about the centre would push the collar
 * back down and undo the lift asked for alongside the first trim.
 *
 * 765 is the FAQ screen's own height, and deliberately so: at 880 the garment
 * ran under the spec column, and the client asked for this screen to sit the
 * way that one does.
 *
 * The horizontal shift stays at −36 because that is not a taste value — it is
 * measured. The copy ends at 384 units and the spec column starts at 983, so
 * the free corridor between them is centred on 683, against a frame centre of
 * 720. The product is already centred in the space it has; only its size was
 * ever the problem.
 */
const DETAILS_HEIGHT = 795;
/**
 * Nudged left of the photograph's own centre, and dropped, on the client's call.
 *
 * 92 is measured, not guessed: with the canvas differenced out of the frame so
 * only the product is left, this screen's product centred on 0.530 of its
 * section against the FAQ's 0.592 — and the client asked for the two to sit
 * alike. 140 is the FAQ's own `offsetY`, so the two screens now hold the product
 * at exactly the same height and exactly the same size — 765 units both.
 *
 * They still do not *look* identical, and cannot: the FAQ sits the garment far
 * enough left that it runs off the frame, and a cropped object reads larger than
 * the same object whole. This screen cannot follow it there, because where the
 * FAQ has a two-line heading it has a four-line lede, and the product would bury
 * it. Measured, that is the only remaining difference between them.
 *
 * The earlier value came from measurement too: 0.062 of a screen looks like 50
 * frame units — but the garment is
 * cropped by the section's bottom edge, so dropping it pushes part of it out of
 * frame and the *visible* centre moves less than the model does. Measured, 50
 * units bought 0.039. The rest was scaled off that actual response rather than
 * off the arithmetic: 42 + 50 + 29.
 */
const DETAILS_DROP = 140;
const DETAILS_SHIFT_X = -92;

/**
 * The turn the product makes on its way to the details screen.
 *
 * The travel would read as a zoom without it. Its *velocity* is fed to the bone
 * jiggle along with everything else, so the sleeves and straps trail the whole
 * way down — that trailing is the difference between a transform and something
 * that looks like it has mass.
 *
 * **40°, not the 24° it started at.** The point of the number is where the
 * product comes to *rest*: at 24° the details screen still read as very nearly
 * front-on, and a garment shown flat hides its own shape. Two-fifths of a right
 * angle is the three-quarter view — enough that the sleeve, the shoulder and
 * the depth of the body all resolve, without turning so far that the front
 * panel and the chest mark start to foreshorten away.
 */
const SCROLL_TURN = MathUtils.degToRad(40);

/** Smootherstep — zero velocity at both ends, so neither screen is left twitching. */
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * The curve the product's *framing* travels on — where it sits and how big it
 * is, as opposed to how far it has turned.
 *
 * **Smootherstep was wrong for this half.** Zero velocity at both ends means the
 * garment barely moves for the first stretch of the journey, hurries through the
 * middle, and then stops dead while the reader is still scrolling — and stopping
 * is what it looks like, because the canvas is pinned and the copy beside it
 * keeps going. The client's note was exactly that: it should always be coming
 * down, just slowing hard towards the end.
 *
 * So: full speed from the first pixel of scroll and a long decelerating tail.
 * At the halfway point it has covered 78% of the drop; over the last tenth of
 * the journey it is still moving, at about a seventh of its average rate.
 *
 * The **turn** keeps smootherstep. That one does have to arrive still: the
 * details screen was composed around a fixed three-quarter angle, and a pose
 * that is still rotating when the screen settles reads as a mistake rather than
 * as momentum.
 */
const DRIFT_TAIL = 2.2;
const drift = (t: number) => 1 - Math.pow(1 - t, DRIFT_TAIL);

/* ── Motion (the spec's numbers) ─────────────────────────────────────────── */

/**
 * Hover rotation, mapped to the cursor's **position** rather than accumulated
 * from its movement.
 *
 * Accumulating would wind up: sweep the cursor back and forth and the product
 * drifts further every pass with no way back. An absolute mapping is always
 * reversible — the cursor's place in the section *is* the angle — and it still
 * produces angular velocity, so the sleeves and straps trail exactly as before.
 */
/**
 * **24°, down from 40, and the ceiling is set by the screens that start already
 * turned.** On the hero the product rests front-on, so this is a symmetric
 * ±24°. On the details screen and behind the FAQ it rests at `SCROLL_TURN`
 * instead, and hover adds to that — so the far end of the sweep reaches
 * 40 + 24 = 64°, a side three-quarter that still shows the front panel and the
 * chest mark. At the old ±40 that end was 80°, near enough to profile that
 * those two screens were being shown the garment's back edge-on.
 *
 * The trim is the client's call, and it is a trim of the *sweep*, not of the
 * response: the product still answers the cursor on the next frame, it simply
 * does not travel as far. Roll and tilt come down with it in proportion —
 * they read as one gesture, and leaving either at its old span would make the
 * turn look damped rather than smaller.
 *
 * **Angular velocity falls with the span**, and the sleeves are driven by
 * velocity, so `LOOK.sleeveLag` is what puts the trailing back — see the note
 * there. Do not raise these three to get the sleeves moving again.
 */
const TURN_MAX = MathUtils.degToRad(24);
const ROLL_MAX = MathUtils.degToRad(12);
const TILT_MAX_X = MathUtils.degToRad(3);
/** Positional parallax, frame units, counter to the tilt. */
const PARALLAX = 12;
/**
 * Rotation spring.
 *
 * Every pair below was measured on this integrator, stepped at a fixed 60Hz:
 *
 * | k     | d     | 50%   | 95%    | overshoot |
 * |-------|-------|-------|--------|-----------|
 * | 0.060 | 0.850 |  83ms |  133ms | **31.7%** | the spec — this is the lurch
 * | 0.042 | 0.539 | 250ms |  950ms |      0.0% | critically damped, and *slow*
 * | 0.345 | 0.450 |  50ms |  117ms |      0.9% | tracked the cursor almost exactly
 * | 0.120 | 0.505 | 100ms |  350ms |      0.0% | trails it
 * | 0.080 | 0.520 | 150ms |  517ms |      0.0% | here — trails it further
 *
 * **Softened from 0.120/0.505 on the client's call**, half again as much lag
 * to arrive and still no overshoot: the garment leans into the turn and keeps
 * leaning after the hand has stopped, which is the weight the smaller sweep
 * above would otherwise have taken out with it.
 *
 * **Lag and dead time are not the same thing, and only one of them reads as
 * sluggish.** An earlier attempt at a softer feel ran the cursor through the
 * pointer's own lerp *before* this spring: two filters in series, and the
 * product did not begin to move for 391ms. That is dead time, and it felt
 * broken. This pair keeps a single filter, so the product answers the hand on
 * the very next frame and simply takes longer to arrive — the trailing is the
 * effect, not a delay before it starts. Do not reintroduce the smoothed pointer
 * here; soften these two numbers instead.
 *
 * Note the shape of the trade: **raising `k` alone makes this integrator
 * slower**, because critical damping forces `d` down and the low `d` throws away
 * the velocity `k` just added. The pair has to move together, which is why these
 * came out of a sweep over both rather than out of tuning one.
 */
const TILT_STIFFNESS = 0.08;
const TILT_DAMPING = 0.52;
/** Tilt is muted while the product is being turned. */
const TILT_DRAG_SCALE = 0.3;

const DRAG_DEGREES_PER_PX = 0.4;
const SPIN_FRICTION = 0.94;
const SPIN_STOP = MathUtils.degToRad(0.05);

/**
 * How long after the travel stops before the cursor has the product back.
 *
 * **The arrival pose has to be the same every time.** Hover and the journey's
 * own turn add, so a cursor parked at the edge of the section while the reader
 * scrolls would land the details screen anywhere across a 120° spread — and at
 * the far end of it the garment arrives showing its back, which is not a
 * composition anyone chose. Muting hover while the page is travelling makes the
 * entry deterministic: whatever the cursor is doing, the product comes to rest
 * at exactly `SCROLL_TURN`, which is the framing the details screen was built
 * around. The cursor takes over again once the page is still, so nothing is
 * lost — only the moment of arrival is fixed.
 *
 * Time, not distance: a distance-based gate hands authority back over the last
 * stretch of the travel, which is precisely the stretch that decides the pose.
 *
 * **900ms, and shaped rather than linear.** The value is passed through
 * smootherstep where it is used, so the hand-back begins and ends at zero rate.
 * Straight, it started at full speed the instant the page stopped — the garment
 * lurched towards wherever the cursor happened to be, right at the moment it
 * had finished arriving, which is a large part of what read as the product
 * planting itself at the end of the journey.
 */
const TRAVEL_SETTLE_MS = 900;
/**
 * How long it takes to *lose* that authority once the page starts moving.
 *
 * **The mute used to be instantaneous, and that was the stutter.** Any change
 * in `journey` at all — the threshold was a ten-thousandth, a tenth of a pixel
 * of scroll — dropped the cursor's authority to zero outright, and it then
 * climbed back over half a second. Lenis does not stop dead: a wheel notch
 * leaves a tail of ever-smaller deltas, and each one re-zeroed the ramp. So a
 * reader parked mid-travel, turning the garment with the cursor, was fighting a
 * value that kept collapsing and rebuilding underneath the turn — the product
 * lurched back towards its scroll pose and crept out again, over and over.
 *
 * Both directions are ramps now, and the fall is the faster of the two: it has
 * to be quick enough that a genuine scroll still owns the pose, slow enough
 * that it cannot read as a snap.
 */
const TRAVEL_MUTE_MS = 200;
/**
 * Scroll speed at which the cursor is fully muted — journey per 60Hz step.
 *
 * **Speed, not the mere fact of movement.** 0.02 of the journey per step is
 * about 16px of scroll a frame on an 800-unit screen: a deliberate scroll, not
 * a nudge and not the tail of one. Below it the reader keeps a proportional
 * share of the turn, which is what makes a slow, aimed scroll feel like their
 * own hand rather than like the page taking the model away.
 */
const TRAVEL_MUTE_SPEED = 0.02;

/**
 * The window a pinned screen's product approaches over, in viewport heights,
 * measured by where the section's top edge is.
 *
 * `START` is how far below the fold the section's top still is when the product
 * begins to move; `END` is where it finishes, and it is **negative** — the
 * section has climbed past the top of the window by then.
 *
 * **The window is longer than the screen's own arrival on purpose.** Ending it
 * at 0 — the moment the screen is fully in place — packed the whole travel into
 * just over half a viewport of scrolling, which is quick enough to read as a
 * transition playing rather than as the object being carried in. Running it a
 * third of a viewport past means the garment is still settling while the screen
 * is being read: 0.85 of a viewport of scroll for the same distance, and it is
 * two thirds of the way in when the screen arrives.
 */
const ENTRANCE_START = 0.55;
const ENTRANCE_END = -0.3;

/**
 * How far the product lags the page once its canvas stops being pinned, in
 * viewport heights.
 *
 * **The hard stop at the end of the journey is a stopped *canvas*, not a
 * stopped product.** The travel eases out to nothing, which is right; but the
 * moment the region runs out the sticky box releases and the whole canvas
 * begins moving at the page's own speed. The product's apparent velocity goes
 * from about zero to a full page-speed in one frame, and that step is what
 * reads as the garment planting itself.
 *
 * So the product is given somewhere to go: as the canvas leaves, it holds back
 * by `λ(1 − e^(−x/λ))` of the distance travelled, where x is how far past the
 * release the page has scrolled. The derivative of that at x = 0 is exactly 1,
 * so the product starts the release perfectly still relative to the viewport
 * and eases up to the page's speed over the following λ. There is no step left
 * to feel — the lag is a first-order filter on the canvas's own motion.
 *
 * **λ is both the ramp's time constant and the largest distance the product
 * can fall behind**, which is what makes it the only number here worth tuning:
 * at a third of a viewport the garment sank far enough to read as sliding out
 * of its own screen. 0.15 keeps the derivative at the seam exactly 1 — the step
 * is still gone — and bounds the lag at 114px on a 760-tall window, which is a
 * held breath rather than a drop.
 */
const RELEASE_LAG = 0.15;

/**
 * How fast the body takes up the pose the scroll asks for, per physics step.
 *
 * **The journey used to be applied outright**, every frame, at whatever rate
 * the scroll happened to move — and the sleeves are driven by the body's
 * angular velocity, so they were driven by the scroll's velocity directly. A
 * wheel flick is not a smooth signal: measured on this rig at 60px a frame the
 * drive spiked hard enough to throw the deepest strap 36.6 degrees, against 2.2
 * for a brisk cursor sweep, with fifty times the frame-to-frame change. That is
 * the "something strange on scroll" — the garment was being whipped, not turned.
 *
 * A follower fixes it at the source: the body chases the scroll's pose instead
 * of being placed at it, so its velocity is bounded by the distance still to go
 * and falls smoothly to zero at the end. 0.12 settles in about a third of a
 * second, which is short enough that the pose still reads as scroll-locked.
 */
const JOURNEY_FOLLOW = 0.12;
/**
 * Low-pass on the bone drive, per physics step.
 *
 * The drive is a *velocity*, and velocities are the roughest signal in the
 * scene: a pointer sample lands, the spring answers with a step change, and the
 * bones are handed a discontinuity to chase. Filtering the drive rather than
 * softening the bone spring keeps the chain's own ring — which is the effect —
 * and takes the corner off what feeds it. Measured, it drops the frame-to-frame
 * change on a fast sweep by a third and on a scroll flick by a factor of six.
 */
const JIGGLE_DRIVE_FOLLOW = 0.18;

const IDLE_PERIOD_S = 7;
const IDLE_ROTATION = MathUtils.degToRad(1.5);
/** Idle bob, frame units. */
const IDLE_RISE = 4;

/**
 * Physics timestep.
 *
 * The springs advance a fixed amount per *step*, so they have to be stepped a
 * fixed number of times per second or the feel tracks the display instead of the
 * clock. Left per-frame, the same constants settle in 384ms at 60Hz and **191ms
 * at 120Hz** — which is exactly the "twitchy" a ProMotion screen reports. The
 * step count is capped so a long stall cannot spiral.
 */
const PHYSICS_STEP_MS = 1000 / 60;
const MAX_PHYSICS_STEPS = 4;

/**
 * Jiggle, applied down each bone chain.
 *
 * Deliberately left underdamped where the body's spring is not: at 0.15/0.75 a
 * chain overshoots ~26% and rings out over a few swings, which is what a sleeve
 * and a hanging strap actually do. Critically damping these would kill the
 * effect they exist for.
 */
const JIGGLE_STIFFNESS = 0.15;
const JIGGLE_DAMPING = 0.75;
/** Cords and straps lag noticeably more than the body. */
const JIGGLE_STRAP_SCALE = 1.6;
/** How much further each step down a chain trails than the one above it. */
const JIGGLE_DEPTH_GAIN = 0.4;

/* ── Budget ──────────────────────────────────────────────────────────────── */

/**
 * Device tier. Read **once**, at construction.
 *
 * A device does not change tier mid-session, and rebuilding buffers on a resize
 * costs more than the mismatch is worth. Everything that has to differ by device
 * — the pixel-ratio ceiling, the frame budget, whether a resize is even listened
 * for — reads from this one value, so the three can never drift apart.
 *
 * The coarse-pointer clause is what catches tablets and large phones, which a
 * width test alone puts on the desktop tier.
 */
type SceneTier = "mobile" | "tablet" | "desktop";

const readTier = (): SceneTier => {
  if (typeof window === "undefined") return "desktop";
  const coarse = window.matchMedia(
    "(hover: none) and (pointer: coarse)",
  ).matches;
  if (!coarse) return "desktop";
  return window.innerWidth < 768 ? "mobile" : "tablet";
};

/**
 * Pixel-ratio ceilings, and the steps each tier may fall back through when it
 * cannot hold its frame budget.
 *
 * **A 3× phone renders nine times the fragments of a 1× screen**, and this scene
 * is fill-bound: one full-screen lit, iridescent, clearcoated garment. The old
 * ceiling was a flat 2 on every device, so a modern phone was drawing four times
 * what it needed to. Mobile stops at 1.0 rather than the 0.85 that soft sprites
 * can take — the jacket has hard silhouette edges and a zip, and those alias
 * visibly below 1.
 */
const RATIO_STEPS: Record<SceneTier, readonly number[]> = {
  mobile: [1, 0.85, 0.75],
  tablet: [1.25, 1, 0.85],
  desktop: [1.5, 1.25, 1],
};

/**
 * Frame budget per tier, in ms between renders — 0 means every tick.
 *
 * The garment turns slowly and its springs settle in a third of a second; at 30
 * frames a second on a phone that is genuinely hard to see, and halving the
 * frame count is the single biggest saving available there. The physics is
 * **not** throttled with it: it is stepped on its own fixed clock inside the
 * frame, precisely so the feel cannot follow the display.
 *
 * Note the ticker skips while `time - last <= budget`, so `1000/30` lands nearer
 * 26fps than 30 on a 120Hz panel. It errs cheap, which is the right direction.
 */
const FRAME_BUDGET: Record<SceneTier, number> = {
  mobile: 1000 / 30,
  tablet: 1000 / 45,
  desktop: 0,
};
/** Cell pitch. The buffer is snapped to this so boxes land on whole pixels. */
const CELL = 50;
const RESIZE_DEBOUNCE_MS = 150;
/** Below this the interactive layer is dimmed — never the physics. */
const FPS_FLOOR = 50;

/**
 * The shell's look, frozen from the dev tuner that produced it.
 *
 * The GLB ships one near-black, fully rough, untextured material; the frame's
 * product is a lacquered, iridescent shell. Reaching that needs a **physical**
 * material — `MeshStandardMaterial` has no iridescence layer at all, and the
 * oil-slick sheen in the reference is exactly that layer.
 *
 * Derived by measuring the frame's own product plate: median luminance 0.055,
 * median saturation 0.86, and 69% of lit pixels in the 195–270° azure band. Two
 * things follow and are easy to get wrong. **The blue is the light, not the
 * material** — a neutral environment cannot make two thirds of an image one hue,
 * so the key light carries it and the environment is turned well down. And **the
 * film must stay thin**: 120–360nm is the blue/violet part of the interference
 * range; past ~450 the greens and magentas take over and the jacket goes pink.
 * The shell is not pure black because it cannot be — at RGB 14 it matched the
 * lattice behind it and the silhouette dissolved.
 */
const LOOK = {
  metalness: 0.15,
  roughness: 0.32,
  envMapIntensity: 0.45,
  iridescence: 1,
  iridescenceIOR: 1.3,
  iridescenceThin: [120, 360] as [number, number],
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  colour: 0x070a14,
  exposure: 0.95,
  environmentIntensity: 0.28,
  key: { colour: 0x2f63ff, intensity: 4.5 },
  rim: { colour: 0xffd9c0, intensity: 2.4 },
  /**
   * How hard the bones are driven by the body's angular velocity.
   *
   * **A multiplier on a velocity, so it is only meaningful next to the rotation
   * it is reading.** Two changes above cut that velocity: the hover sweep came
   * down from ±40° to ±24°, and the spring that follows the cursor was softened
   * from 0.120/0.505 to 0.080/0.520, which spreads the same travel over half
   * again as long. Multiplied out, the peak the sleeves used to see is 2.5x
   * what they see now — so 0.63 would have left the garment turning with its
   * sleeves welded on, which is the opposite of what a smaller, slower turn
   * needs. It reads as *lighter* precisely when it stops trailing.
   *
   * 6 is that 2.5x put back, and then the swing roughly doubled again on the
   * client's call. Measured on this rig at a 250ms cursor sweep: the deepest
   * strap peaks at 2.1° against 0.5° before, and a whole-section flick takes it
   * to 4.0°. That is a sleeve that visibly answers the turn and settles a beat
   * after it, still well inside the ceiling below.
   *
   * Raised from 6 to 7 alongside `JIGGLE_DRIVE_FOLLOW`, which costs about a
   * sixth of the peak; measured, the pair lands on the same 2.2° with a third
   * less frame-to-frame change than the unfiltered drive had.
   *
   * The **scroll** and **drag** terms are deliberately not scaled with it — see
   * `travelLag` and `dragLag`.
   */
  sleeveLag: 7,
  /**
   * The same multiplier for a touch drag, held at the old value.
   *
   * A finger produces angular velocity of a completely different order to a
   * cursor: `DRAG_DEGREES_PER_PX` turns a 30px/frame swipe into 12° *per step*,
   * where the hover spring peaks near 1.7°. Feeding that through a gain sized
   * for hover pins every chain against `sleeveLimitDeg` for the whole swipe and
   * releases them together — a garment made of rubber. Kept separate so the two
   * inputs can each have the response they need.
   */
  dragLag: 0.63,
  /**
   * The same multiplier for the turn the journey makes, and much smaller.
   *
   * The scroll's own pace sets this one, and a reader's flick is worth far more
   * angular velocity than a hand crossing a section: on the shared gain a
   * normal scroll already swung the deepest strap 10.5 degrees and a flick
   * 36.6 — the ceiling, held for the whole flick. At 1.5, against a follower
   * that no longer passes the scroll's velocity through raw, the same two are
   * 2.6 and 9.9 degrees: a sleeve that trails the turn rather than being thrown
   * by it.
   */
  travelLag: 1.5,
  /**
   * Ceiling on a single bone's swing, eased into with `tanh`.
   *
   * Raised with `sleeveLag` — at 22° the new gain would be shaping the top of
   * the range rather than only catching its extremes, and the point of the
   * limit is to catch a fling, not to compress ordinary movement.
   */
  sleeveLimitDeg: 30,
} as const;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isCoarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/**
 * The frame layout's own query — the same one `globals.css` gives the `lg`
 * variant, kept in step by hand because CSS cannot hand it to a script.
 */
const FRAME_QUERY = "(min-width: 1024px) and (min-aspect-ratio: 1/1)";

interface JiggleBone {
  bone: Bone;
  rest: Quaternion;
  /** Position in its chain, 0 at the root. Deeper lags more. */
  depth: number;
  scale: number;
  angle: number;
  velocity: number;
}

/**
 * The hero's WebGL layer: the interactive lattice and the product, in **one**
 * scene, on **one** canvas, driven by **one** subscription to the shared ticker.
 *
 * Keeping them together is not tidiness. Two canvases means two render loops
 * sampling the pointer at different moments, and the highlight and the product
 * visibly drift out of phase under a fast flick.
 *
 * The lattice is drawn by an orthographic pass over a full-screen quad, then the
 * product by a perspective pass on top, with `autoClear` off. The product is
 * placed by projecting the frame's own coordinates — centre `x` on the frame's
 * centre line, `SUBJECT_RISE` units above the section's — so a full-bleed canvas
 * lands it exactly where the fixed 760-unit box used to.
 *
 * **Rotation follows the cursor, with no press.** Horizontal position turns the
 * product about its vertical axis, vertical position rolls it in the screen
 * plane; both are *absolute* targets, so the cursor's place in the section is
 * the angle and a sweep can always be undone. The written spec asked for a
 * press-and-drag turntable; the client replaced it. Press-drag survives on touch
 * only, where there is no hover to read. Recorded in DESIGN-MAP.md.
 */
export const HeroScene = ({ src, label, still }: HeroSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const hit = hitRef.current;
    // The travel region spans both screens; its first section is the hero, which
    // is the journey's origin and the only place hover rotation is read from.
    const region = container?.closest("[data-product-region]");
    // Only the travelling instance needs a section to measure its journey
    // against; a pinned one never asks.
    const section = region?.querySelector("section");
    if (!container || !hit) return;
    if (!(region instanceof HTMLElement)) return;
    if (!still && !(section instanceof HTMLElement)) return;

    const reduced = prefersReducedMotion();
    const coarse = isCoarsePointer();

    /**
     * **Hover rotation belongs to the frame, and to nothing else.**
     *
     * A coarse-pointer test alone was not enough, and the gap it left is
     * exactly what a tablet shows. On a real tablet there is no hover, the
     * product rests front-on, and the composition is the one that was designed.
     * In a desktop window narrowed to a tablet's width there *is* a cursor, so
     * the same screen showed the garment turned and rolled to wherever the
     * pointer happened to be — two different pages under one layout.
     *
     * The turn is not decoration: below the frame the product sits in its own
     * box in the flow, with the copy under it, and a garment leaning out of
     * that box reads as broken rather than as responsive. So the gate is the
     * layout itself. Drag still turns it on touch — that is an interaction the
     * hand asks for, not one the page assumes.
     */
    const frameQuery = window.matchMedia(FRAME_QUERY);
    let framed = frameQuery.matches;
    const syncFramed = () => {
      framed = frameQuery.matches;
    };
    frameQuery.addEventListener("change", syncFramed);
    const tier = readTier();
    const ratios = RATIO_STEPS[tier];

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: !coarse,
        powerPreference: coarse ? "default" : "high-performance",
        stencil: false,
      });
    } catch {
      return;
    }

    let disposed = false;
    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 100);
    const pmrem = new PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const disposables: { dispose: () => void }[] = [pmrem, environment];

    renderer.setClearAlpha(0);
    renderer.autoClear = false;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = LOOK.exposure;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", label);

    scene.environment = environment;
    scene.environmentIntensity = LOOK.environmentIntensity;

    const keyLight = new DirectionalLight(
      new Color(LOOK.key.colour),
      LOOK.key.intensity,
    );
    keyLight.position.set(-2.4, 2.2, 2.6);
    const rimLight = new DirectionalLight(
      new Color(LOOK.rim.colour),
      LOOK.rim.intensity,
    );
    rimLight.position.set(2.8, 0.6, -2.2);
    scene.add(keyLight, rimLight);

    /* ── Pointer ───────────────────────────────────────────────────────── */

    // Events come from the whole region — the highlight lives on both screens —
    // while coordinates are measured against the canvas, which is pinned to the
    // viewport and so does not go stale when the page scrolls under a still
    // cursor. `acquireHeroPointer` resolves both ends itself.
    const { pointer, release: releasePointer } = acquireHeroPointer(container);
    const detachDrag = pointer.attachDragTarget(hit);

    /* ── Sizing ────────────────────────────────────────────────────────── */

    let cssWidth = 1;
    let cssHeight = 1;
    let fullBleed = true;
    /** Frame units → css px. */
    let scale = 1;

    const applySize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      // Snap to the cell pitch so a box edge never lands mid-pixel, and hold the
      // ratio to a whole number — fractional DPR is what moirés a 50/44 lattice.
      cssWidth = Math.ceil(width / CELL) * CELL;
      cssHeight = Math.ceil(height / CELL) * CELL;
      // The raw height, not the cell-snapped one: this is the frame's unit and
      // it must not inherit the buffer's rounding. See `FRAME_HEIGHT`.
      scale = height / FRAME_HEIGHT;
      // Below the frame breakpoint the canvas is the product's own box in the
      // flow, not the whole section, so the frame's coordinates mean nothing —
      // the product is framed to the box instead.
      //
      // **Asked of the frame's own query, not inferred from a width ratio.**
      // The old test — "the canvas covers 95% of the region" — was a proxy, and
      // it broke on the widest portrait tablets: at 820 the box's 20px margins
      // are 95.1% of the region, so the scene believed it was in the frame,
      // framed the product in frame units, and started running the scroll
      // journey on a layout where the second screen has no product to travel
      // to. One breakpoint either side of that number behaved differently for
      // no reason a reader could see.
      fullBleed = framed;

      const ratio = Math.min(
        ratios[Math.min(ratioStep, ratios.length - 1)],
        window.devicePixelRatio || 1,
      );
      renderer.setPixelRatio(ratio);
      renderer.setSize(cssWidth, cssHeight, false);
      renderer.domElement.style.width = `${cssWidth}px`;
      renderer.domElement.style.height = `${cssHeight}px`;
      // **Centred, because the snap above rounds *up*.** The buffer is grown to
      // the next whole cell so the lattice cannot moiré, which leaves the canvas
      // overhanging its container by up to a cell in each axis. Left at the
      // default top-left that overhang all falls off the bottom-right, and the
      // product — framed against the canvas — is pushed off the container's
      // centre by half of it. That is invisible at 1440×800, where 800 is a
      // whole number of 50-unit cells and the overhang is zero, and it is why
      // every other width drifted: measured, the product sat 9% higher in the
      // section at 1024 than at 1440. Splitting the overhang evenly puts the two
      // centres back on top of each other at every size.
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.left = "50%";
      renderer.domElement.style.top = "50%";
      renderer.domElement.style.transform = "translate(-50%, -50%)";

      camera.aspect = cssWidth / cssHeight;
      camera.updateProjectionMatrix();
      frameSubject();
      request();
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      // Rebuilding the framebuffer is the expensive half; the shader is not
      // recompiled, only its resolution uniform changes.
      resizeTimer = window.setTimeout(applySize, RESIZE_DEBOUNCE_MS);
    };

    /* ── Product ───────────────────────────────────────────────────────── */

    /** Outer pivot: the screen-plane roll, and the parallax. */
    let subject: Object3D | null = null;
    /** Inner pivot: the turntable and the tilt, so both stay in the product's own frame. */
    let spinner: Object3D | null = null;
    let modelSize: Vector3 | null = null;
    /** World units per css pixel at the product's depth. */
    let worldPerPixel = 1;

    /**
     * How far along the journey the product is: 0 with the hero at rest, 1 with
     * the details screen at rest. Below the frame breakpoint there is no journey
     * — the canvas is a box in the hero's flow and the second screen has no
     * product — so it is pinned at 0.
     */
    let journey = 0;
    let framedAt = -1;

    const readJourney = () => {
      if (!fullBleed) return 0;
      // A pinned instance has no journey, but it may have an *approach* - and
      // that is measured against its own screen rather than against a hero it
      // does not have. 0 with the screen's top edge on the fold, 1 once the
      // screen has fully arrived, which for a frame screen is one viewport of
      // scrolling.
      if (still) {
        if (!still.entrance) return 0;
        // **A window, not a lead**: it starts while the screen is still coming
        // up and finishes after it has arrived, so the garment is still
        // settling while the screen is being read. See `ENTRANCE_START`.
        const viewport = window.innerHeight || 1;
        const from = viewport * ENTRANCE_START;
        const to = viewport * ENTRANCE_END;
        const top = region.getBoundingClientRect().top;
        return Math.min(1, Math.max(0, (from - top) / (from - to)));
      }
      if (!(section instanceof HTMLElement)) return 0;
      const travel = section.offsetHeight;
      if (travel <= 0) return 0;
      // One `getBoundingClientRect` per frame, inside the ticker: the hero's own
      // top *is* the scroll position, and reading it here avoids a scroll
      // listener that would fire between frames and force extra layouts.
      const top = section.getBoundingClientRect().top;
      // Everything past the hero's own height is scroll the pinned canvas has
      // stopped absorbing — see `released`.
      released = Math.max(0, -top - travel);
      return Math.min(1, Math.max(0, -top / travel));
    };

    const frameSubject = () => {
      if (!modelSize) return;
      framedAt = journey;
      // Two curves, two jobs — see `drift`. A pinned instance's approach reads
      // as one gesture, so it keeps the symmetric one.
      const eased = still ? ease(journey) : drift(journey);
      const halfTan = Math.tan(MathUtils.degToRad(camera.fov) / 2);
      const heightUnits = still
        ? still.height
        : SUBJECT_HEIGHT + (DETAILS_HEIGHT - SUBJECT_HEIGHT) * eased;
      const riseUnits = still
        ? still.offsetY
        : SUBJECT_RISE + (-DETAILS_DROP - SUBJECT_RISE) * eased;
      const targetPx = fullBleed ? heightUnits * scale : cssHeight * BOXED_FILL_Y;

      // **Fit the tighter axis, not the height.** The frame states a silhouette
      // *height*, and boxed the product was framed to the box's height too —
      // which is the right answer for as long as the box is wider than the
      // garment. On a phone it stops being: the box is 350×262 and the jacket,
      // sleeves out, is half again as wide as it is tall, so 93% of the height
      // asked for 373px of width inside 350 and `overflow-hidden` took the
      // sleeves off at both edges. Standing the camera back far enough for
      // whichever axis binds costs nothing where the height already binds — on
      // a tablet the height still wins and the framing is unchanged.
      const forHeight = (modelSize.y * cssHeight) / (2 * targetPx * halfTan);
      const forWidth =
        (modelSize.x * cssHeight) / (2 * cssWidth * BOXED_FILL_X * halfTan);
      const distance = fullBleed ? forHeight : Math.max(forHeight, forWidth);
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      worldPerPixel = (2 * distance * halfTan) / cssHeight;
      basePositionY = fullBleed
        ? riseUnits * scale * worldPerPixel
        : -cssHeight * BOXED_DROP * worldPerPixel;
      const offsetUnits = still
        ? still.offsetX + (still.entrance?.shiftX ?? 0) * (1 - eased)
        : DETAILS_SHIFT_X * eased;
      basePositionX = fullBleed ? offsetUnits * scale * worldPerPixel : 0;
    };

    let basePositionY = 0;
    let basePositionX = 0;

    const jiggle: JiggleBone[] = [];

    const collectJiggle = (root: Object3D) => {
      // The rig names its chains; depth inside a chain is what decides how far
      // a segment lags, and straps lag further than the body.
      const chains: Record<string, RegExp> = {
        arm: /^\s*(shoulder|arm|forearm)_[LR]$/i,
        strap: /^belt-\d+_[LR]$/i,
      };
      root.traverse((child) => {
        if (!(child instanceof Bone)) return;
        const name = child.name.trim();
        const isArm = chains.arm.test(name);
        const isStrap = chains.strap.test(name);
        if (!isArm && !isStrap) return;
        let depth = 0;
        for (let node = child.parent; node; node = node.parent) {
          if (node instanceof Bone) depth += 1;
        }
        jiggle.push({
          bone: child,
          rest: child.quaternion.clone(),
          depth,
          scale: isStrap ? JIGGLE_STRAP_SCALE : 1,
          angle: 0,
          velocity: 0,
        });
      });
    };

    /* ── Loop ──────────────────────────────────────────────────────────── */

    let needsFrame = true;
    const request = () => {
      needsFrame = true;
    };

    // Hover rotation, one damped integrator per axis.
    let turnY = 0;
    let turnVelY = 0;
    let rollZ = 0;
    let rollVelZ = 0;
    let tiltX = 0;
    let tiltVelX = 0;
    /** Touch only: swipe accumulates onto the turntable, with a fling on release. */
    let spin = 0;
    let spinVelocity = 0;
    // Frame budget
    let fpsAccum = 0;
    let fpsFrames = 0;
    let fpsScale = 1;
    /** Index into PIXEL_RATIO_STEPS. Fill rate is the cheapest thing to give up. */
    let ratioStep = 0;
    let elapsed = 0;
    let lastTime = 0;
    /** 0 while the product is travelling, ramping to 1 once the page is still. */
    let travelSettle = 1;
    let lastJourney = 0;
    /**
     * How far the page has scrolled past the point the canvas stopped sticking.
     *
     * Read from the same rect the journey is: the sticky box travels for exactly
     * the hero's height — the region is the hero plus the details screen, the
     * box is one of them — so anything the hero has scrolled beyond its own
     * height is scroll the canvas is no longer absorbing.
     */
    let released = 0;

    const scratch = new Quaternion();
    const axis = new Vector3(0, 0, 1);
    let physicsAccum = 0;
    /** The journey's own turn, and the velocity the sleeves trail from it. */
    let journeyTurn = 0;
    let journeyTurnVel = 0;
    /** The pose the scroll is asking for; `journeyTurn` chases it. */
    let journeyTurnTarget = 0;
    /** False until the first frame has placed the body on its target. */
    let journeyPrimed = false;
    /** The filtered bone drive - see `JIGGLE_DRIVE_FOLLOW`. */
    let jiggleDrive = 0;

    /**
     * Sleeves and straps trail the turn. Stepped on the physics clock with
     * everything else, so the lag stays the same amount of lag on any display.
     */
    const stepJiggle = () => {
      if (!jiggle.length) return;
      // The limit is applied **per bone**, after its own scale and depth, not to
      // the shared drive. Limiting the drive instead let a deep strap multiply
      // its way past the ceiling anyway, so the number meant nothing where it
      // mattered most. `tanh` eases into it rather than clamping: a hard clamp
      // pins a chain at the maximum through a whole sweep and releases it all at
      // once.
      // **Three inputs, three gains.** They are the same quantity - angular
      // velocity - arriving at wildly different magnitudes: a cursor crossing
      // the section, a reader flicking the wheel, a thumb dragging the model.
      // One gain sized for any of them is wrong for the other two. See
      // `LOOK.sleeveLag`, `travelLag` and `dragLag`.
      const raw =
        (rollVelZ + turnVelY * 0.6) * LOOK.sleeveLag +
        journeyTurnVel * LOOK.travelLag +
        spinVelocity * LOOK.dragLag;
      // Filtered before it is handed on, so the chains chase a continuous
      // signal rather than the step changes a sampled pointer produces.
      jiggleDrive += (raw - jiggleDrive) * JIGGLE_DRIVE_FOLLOW;
      const limit = MathUtils.degToRad(LOOK.sleeveLimitDeg);
      for (const item of jiggle) {
        const rawTarget =
          -jiggleDrive * item.scale * (1 + item.depth * JIGGLE_DEPTH_GAIN);
        const target = limit > 0 ? limit * Math.tanh(rawTarget / limit) : 0;
        item.velocity =
          (item.velocity + (target - item.angle) * JIGGLE_STIFFNESS) *
          JIGGLE_DAMPING;
        item.angle += item.velocity;
        item.bone.quaternion
          .copy(item.rest)
          .multiply(scratch.setFromAxisAngle(axis, item.angle));
      }
    };

    const frame = (time: number) => {
      const delta = lastTime ? Math.min(50, time - lastTime) : 16;
      lastTime = time;
      elapsed += delta / 1000;

      const state = pointer.state;
      const dragging = state.mode === "dragging";

      // Frame budget. Pixel ratio is the only lever left and the only one that
      // ever bought frames: fill rate is what a phone runs out of, and a choppy
      // frame reads as jerky however smoothly the springs solve. The physics is
      // never throttled — it is stepped on a fixed clock precisely so it cannot
      // be. `fpsScale` is the hysteresis that stops the ratio flapping.
      fpsAccum += delta;
      fpsFrames += 1;
      if (fpsAccum >= 500) {
        const fps = (fpsFrames * 1000) / fpsAccum;
        if (fps < FPS_FLOOR) {
          fpsScale = Math.max(0.3, fpsScale - 0.15);
          if (fpsScale <= 0.55 && ratioStep < ratios.length - 1) {
            ratioStep += 1;
            applySize();
          }
        } else {
          fpsScale = Math.min(1, fpsScale + 0.1);
        }
        fpsAccum = 0;
        fpsFrames = 0;
      }

      // Re-frame only when the journey actually moved. Scroll is the only thing
      // that moves it, so this is idle for every frame the page is still.
      journey = readJourney();
      if (Math.abs(journey - framedAt) > 1e-4) {
        frameSubject();
        request();
      }

      // **Hover authority is taken and handed back continuously**, and what
      // the gate reads is the scroll's *speed* rather than the bare fact that
      // it moved. `journey` is clamped at both ends, so sitting on either
      // screen returns this to 1 and only real travel between them mutes the
      // cursor. Per 60Hz step, so the gate behaves the same on any display.
      const journeySpeed =
        Math.abs(journey - lastJourney) / Math.max(1, delta / PHYSICS_STEP_MS);
      lastJourney = journey;
      const settleTarget = 1 - Math.min(1, journeySpeed / TRAVEL_MUTE_SPEED);
      if (Math.abs(settleTarget - travelSettle) > 1e-3) {
        // Exponential, and asymmetric: the time constant is the fall's while
        // authority is being taken and the recovery's while it is given back.
        const perStep =
          PHYSICS_STEP_MS /
          (settleTarget < travelSettle ? TRAVEL_MUTE_MS : TRAVEL_SETTLE_MS);
        travelSettle +=
          (settleTarget - travelSettle) *
          (1 - Math.pow(1 - perStep, delta / PHYSICS_STEP_MS));
        request();
      } else {
        travelSettle = settleTarget;
      }

      if (subject) {
        // Touch has no hover, so a horizontal swipe still turns the product and
        // a release still throws it. On a fine pointer this stays at zero.
        if (dragging) {
          spinVelocity = MathUtils.degToRad(
            state.dragDeltaX * DRAG_DEGREES_PER_PX,
          );
          spin += spinVelocity;
          request();
        } else {
          if (state.flingX !== 0) {
            spinVelocity = MathUtils.degToRad(
              state.flingX * DRAG_DEGREES_PER_PX,
            );
            state.flingX = 0;
          }
          if (Math.abs(spinVelocity) > SPIN_STOP) {
            spin += spinVelocity;
            spinVelocity *= SPIN_FRICTION;
            request();
          } else {
            spinVelocity = 0;
          }
        }

        const mute = dragging ? TILT_DRAG_SCALE : 1;
        // Shaped, so authority is handed back at zero rate rather than at full
        // speed the instant the page stops — see `TRAVEL_SETTLE_MS`.
        const active =
          (!reduced && !coarse && framed && state.engaged
            ? state.intensity
            : 0) * ease(travelSettle);
        // Clamped: the listeners cover the whole region, so the cursor can be
        // outside the box the coordinates are measured against, and an
        // unclamped mapping would drive the turn past its own limit.
        // Raw, not smoothed: the spring below is the smoothing, and running the
        // input through the pointer's lerp first only adds 391ms of dead time.
        const clamp = (v: number) => Math.min(1, Math.max(-1, v));
        const nx = state.width ? clamp((state.rawX / state.width) * 2 - 1) : 0;
        const ny = state.height
          ? clamp((state.rawY / state.height) * 2 - 1)
          : 0;

        // Cursor across → turntable; cursor up/down → roll in the screen plane.
        // Both are targets, not increments. The pinned instance reads them the
        // same way the travelling one does — the client asked for the FAQ to
        // answer the hand exactly as the details screen does.
        const targetTurn = nx * TURN_MAX * mute * active;
        const targetRoll = -ny * ROLL_MAX * mute * active;
        const targetTilt = ny * TILT_MAX_X * mute * active;

        // Fixed timestep: the same number of steps per second on any display.
        physicsAccum = Math.min(
          physicsAccum + delta,
          PHYSICS_STEP_MS * MAX_PHYSICS_STEPS,
        );
        // **The turn the page is asking for.** A pinned instance rests at its
        // own angle and may approach it from somewhere else; a travelling one
        // turns as it goes.
        journeyTurnTarget = still
          ? (still.turn ?? SCROLL_TURN) +
            (still.entrance?.turn ?? 0) * (1 - ease(journey))
          : ease(journey) * SCROLL_TURN;
        // The first frame places the body on its target outright. Chasing it
        // from zero would open every pinned screen with a swing nobody asked
        // for - the approach is a scroll effect, not a mount effect.
        if (!journeyPrimed) {
          journeyTurn = journeyTurnTarget;
          journeyPrimed = true;
        }

        while (physicsAccum >= PHYSICS_STEP_MS) {
          physicsAccum -= PHYSICS_STEP_MS;
          turnVelY =
            (turnVelY + (targetTurn - turnY) * TILT_STIFFNESS) * TILT_DAMPING;
          rollVelZ =
            (rollVelZ + (targetRoll - rollZ) * TILT_STIFFNESS) * TILT_DAMPING;
          tiltVelX =
            (tiltVelX + (targetTilt - tiltX) * TILT_STIFFNESS) * TILT_DAMPING;
          turnY += turnVelY;
          rollZ += rollVelZ;
          tiltX += tiltVelX;
          // The body *follows* the scroll on the same clock as everything else,
          // so its velocity - which is what the sleeves trail - is bounded and
          // continuous rather than the raw scroll delta.
          journeyTurnVel = (journeyTurnTarget - journeyTurn) * JOURNEY_FOLLOW;
          journeyTurn += journeyTurnVel;
          stepJiggle();
        }
        if (Math.abs(journeyTurnTarget - journeyTurn) > 1e-5) request();
        if (
          Math.abs(turnVelY) + Math.abs(rollVelZ) + Math.abs(tiltVelX) >
          1e-5
        ) {
          request();
        }

        // Idle never stops, and adds to the rest rather than replacing it.
        const idle = Math.sin((elapsed / IDLE_PERIOD_S) * Math.PI * 2);

        // Both instances read the same follower now: the travelling product
        // turns away from front-on as it makes the journey, and the pinned one
        // holds the angle that journey ends on, approaching it from its
        // entrance if it has one. Everything the cursor does is identical.
        const baseTurn = journeyTurn;

        subject.rotation.z = rollZ;
        if (spinner) {
          spinner.rotation.y = turnY + spin + baseTurn + idle * IDLE_ROTATION;
          spinner.rotation.x = tiltX;
        }
        // **The exit ramp.** Zero at the moment the canvas releases and easing
        // up to the page's own speed over `RELEASE_LAG` — see the note there.
        // A pinned instance never releases, so it never asks.
        const lagPx = still ? 0 : cssHeight * RELEASE_LAG;
        const releaseDrop =
          lagPx > 0 ? lagPx * (1 - Math.exp(-released / lagPx)) : 0;

        subject.position.x =
          basePositionX - nx * PARALLAX * scale * worldPerPixel * active;
        subject.position.y =
          basePositionY +
          (-ny * PARALLAX * scale * active + idle * IDLE_RISE - releaseDrop) *
            worldPerPixel;
        request();
      }

      if (!needsFrame) return;
      needsFrame = false;
      renderer.clear();
      renderer.render(scene, camera);
    };

    /* ── Load ──────────────────────────────────────────────────────────── */

    const draco = new DRACOLoader().setDecoderPath("/draco/");
    const loader = new GLTFLoader().setDRACOLoader(draco);

    loader.load(
      src,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;

        model.traverse((child) => {
          if (!(child instanceof Mesh)) return;
          const source = child.material as MeshStandardMaterial;
          if (!source) return;
          // Upgrade in place. Every layer the panel can reach is switched on
          // here with a non-zero value, because three compiles a *different
          // program* when one of these crosses zero — flipping that at runtime
          // would stall a frame every time a slider passed the origin.
          child.material = new MeshPhysicalMaterial({
            color: new Color(LOOK.colour),
            map: source.map,
            normalMap: source.normalMap,
            metalness: LOOK.metalness,
            roughness: LOOK.roughness,
            envMapIntensity: LOOK.envMapIntensity,
            iridescence: LOOK.iridescence,
            iridescenceIOR: LOOK.iridescenceIOR,
            iridescenceThicknessRange: [...LOOK.iridescenceThin],
            clearcoat: LOOK.clearcoat,
            clearcoatRoughness: LOOK.clearcoatRoughness,
          });
        });

        const box = new Box3().setFromObject(model);
        const centre = box.getCenter(new Vector3());
        model.position.sub(centre);

        // Two pivots, and the nesting is load-bearing. The roll is outermost so
        // it always reads as a roll *on screen*; the turntable sits inside it,
        // in the product's own frame. Swap them and a rolled product would turn
        // about a tilted axis and the two would visibly fight.
        const spinPivot = new Object3D();
        spinPivot.add(model);
        const tiltPivot = new Object3D();
        tiltPivot.add(spinPivot);
        scene.add(tiltPivot);
        subject = tiltPivot;
        spinner = spinPivot;
        modelSize = box.getSize(new Vector3());

        if (!reduced) collectJiggle(model);

        applySize();
        // Compile before the first visible frame, not during it.
        renderer.compile(scene, camera);
        setReady(true);
        // The loading curtain waits on this rather than on a duration: it is
        // the moment the first screen actually exists. Only the travelling
        // instance fires it — a pinned one is five screens down and nothing
        // should be held back for it.
        if (!still) window.dispatchEvent(new Event("hero-scene-ready"));
        request();
      },
      undefined,
      () => {
        // A failed model must not take the rest of the frame down with it.
      },
    );

    /* ── Gates ─────────────────────────────────────────────────────────── */

    let unsubscribe: (() => void) | null = null;
    const running = () => unsubscribe !== null;

    const resume = () => {
      if (running() || document.hidden) return;
      lastTime = 0;
      unsubscribe = subscribeToTicker(frame, () => FRAME_BUDGET[tier]);
    };
    const pause = () => {
      unsubscribe?.();
      unsubscribe = null;
    };

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? resume() : pause()),
      { rootMargin: "10%" },
    );
    // The region, not the hero: the loop has to keep running for the whole
    // journey, and the hero has left the viewport before it ends.
    observer.observe(region);

    const onVisibility = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", onVisibility);
    // **`resize` is a desktop event here, `orientationchange` a touch one.**
    // iOS Safari fires `resize` every time the URL bar collapses during a
    // scroll; handling that rebuilds the WebGL framebuffer mid-scroll and reads
    // as a whole-scene flash. A coarse pointer therefore listens only for a
    // rotation, which is the one case where the canvas genuinely has to be
    // rebuilt and the one case that cannot happen mid-scroll.
    const sizeEvent = coarse ? "orientationchange" : "resize";
    window.addEventListener(sizeEvent, onResize, { passive: true });

    applySize();

    return () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(sizeEvent, onResize);
      frameQuery.removeEventListener("change", syncFramed);
      detachDrag();
      releasePointer();
      draco.dispose();
      scene.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        child.geometry?.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      disposables.forEach((d) => d.dispose());
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, [src, label, still]);

  return (
    <>
      <div
        ref={containerRef}
        // `transform-gpu backface-hidden` puts the canvas on its own compositor
        // layer. Without it, a neighbouring fixed element repainting during a
        // scroll — this page has a fixed lattice glow and a sticky header —
        // invalidates the WebGL composite on WebKit and the whole scene flickers.
        className={`pointer-events-none absolute inset-0 z-10 transform-gpu overflow-hidden backface-hidden transition-opacity duration-[var(--duration-normal)] ease-entrance ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Touch-only swipe target, over the product alone. A **pinned** instance
          gets none: it is background, and a 760-unit grab area over the FAQ
          screen would swallow taps meant for the questions underneath.

          The 760-unit box is a *frame* coordinate and only means anything on
          the frame's canvas — below `lg` it resolved to x 340..1100, which on a
          phone is a grab area sitting mostly off the right edge and nowhere
          near the jacket. There the target is simply the product box itself. */}
      <div
        ref={hitRef}
        aria-hidden
        className={
          still
            ? "hidden"
            : // Centred on the canvas rather than pinned to the frame's x of
              // 340: a 760-unit box at 340 is centred on 720, the frame's own
              // centre line, and only "centred" still lands there on a canvas
              // that is wider. Margins, not a transform - this sits beside a
              // canvas that must not be handed a new containing block.
              "pointer-events-auto absolute inset-0 z-10 touch-pan-y pointer-coarse:cursor-grab pointer-coarse:active:cursor-grabbing lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-mt-104 lg:-ml-95 lg:size-190"
        }
      />
    </>
  );
};
