"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ScrambleText } from "@/components/ui/scramble-text";
import { subscribeToTicker } from "@/lib/animation/ticker";
import { REVEAL_ROOT_MARGIN } from "@/lib/animation/reveal";

import type { TechnologyLayer } from "./technology.types";

export interface TechnologyStackProps {
  layers: TechnologyLayer[];
}

/** Frame units → rem against the 1440 base, where the root font-size is 16. */
const units = (value: number) => `${value / 16}rem`;

/**
 * Where the two ends of a leader line live.
 *
 * The card is pinned to the **right margin** and the artwork is centred on the
 * canvas, so neither end has a fixed frame x — a line drawn to one would come
 * away from both. Each end is written as the thing it actually is:
 *
 * - the card's left edge is `100% − (40 margin + 417 card)` = `100% − 457`;
 * - the anchor is a fraction of the artwork, and the artwork is a square as
 *   wide as its box is tall, centred: `50% + (fx − 0.5) × 619`.
 *
 * **619 and 136 are the box, and they have to be kept in step with it.** The
 * clip sits in `lg:top-34 lg:h-154.75` and is `object-contain` at 1:1, so what
 * is actually drawn is a square the height of the box — not the box's own
 * 665-unit width. Anchors are stated against the drawing, so this is the
 * conversion between the two.
 */
/** Distance from the canvas's right edge to the card's left edge, frame units. */
const CARD_INSET = 457;
/** The drawn artwork: a square as tall as its box (`lg:h-154.75`), frame units. */
const ARTWORK = 619;
/** The box's top edge on the stage (`lg:top-34`), frame units. */
const ARTWORK_TOP = 136;
/** Side of the square the leader line plants on the layer, frame units. */
const MARKER = 8;

const TRANSITION = "transition duration-[var(--duration-normal)] ease-entrance";

/**
 * The leader line: a hairline from the card to a small filled square on the
 * layer it describes (Figma "Union", one per frame).
 *
 * Drawn rather than exported. The frame ships five separate SVGs because in
 * Figma a shape is a shape, but they are one construction — a diagonal and an
 * 8-unit square — whose only variables are the two endpoints. Deriving it from
 * the same numbers that place the card means the line cannot come loose from
 * the card when either moves, which five fixed assets would not survive.
 *
 * **The square is its own element, not a `rect` in the same viewBox.** The line
 * box is stretched to fit between two ends that are now `%`-anchored, and
 * `preserveAspectRatio="none"` stretches everything in it — which leaves the
 * diagonal correct and the marker a rectangle. The line keeps the SVG because
 * that is what a stretched box does well; the square keeps its shape because it
 * is a plain box sized in frame units.
 *
 * **The square is drawn in the page's own white, not the rule's 25%.** It is
 * the one part of this that has to be *found* — it names which layer the card
 * is describing — and at a quarter opacity over an artwork this busy it read as
 * a speck of the render rather than as a mark on it. The line stays at 25%: it
 * is the connection, not the point.
 */
const Leader = ({
  layer,
  active,
}: {
  layer: TechnologyLayer;
  active: boolean;
}) => {
  const { anchorFx, anchorFy, cardSideY } = layer;
  const offset = (anchorFx - 0.5) * ARTWORK;
  const anchorY = ARTWORK_TOP + anchorFy * ARTWORK;
  const descending = anchorY < cardSideY;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 text-hero-rule ${TRANSITION} ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute"
        style={{
          left: `calc(50% + ${units(offset)})`,
          top: units(Math.min(anchorY, cardSideY)),
          width: `calc(50% - ${units(CARD_INSET + offset)})`,
          height: `max(1px, ${units(Math.abs(cardSideY - anchorY))})`,
        }}
      >
        <line
          x1={0}
          y1={descending ? 0 : 100}
          x2={100}
          y2={descending ? 100 : 0}
          stroke="currentColor"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <span
        className="absolute block bg-hero-content"
        style={{
          left: `calc(50% + ${units(offset - MARKER / 2)})`,
          top: units(anchorY - MARKER / 2),
          width: units(MARKER),
          height: units(MARKER),
        }}
      />
    </div>
  );
};

/**
 * The exploded stack, and the card that walks down it as the section scrolls.
 *
 * **The stack is one flattened image.** Figma ships the five materials as a
 * single 1024×954 render (node 1931:2756), so they cannot be moved
 * independently — separating them needs five exports, one per layer, on the
 * same canvas and the same camera. Recorded in DESIGN-MAP.md.
 *
 * The frames are five states of one composition: the stack never moves, and a
 * single card steps down it, each with a leader line to its own layer. Verified
 * against the renders rather than assumed — in state 4 the only card borders on
 * the right column are the one card's own top and bottom, so the cards do not
 * accumulate.
 *
 * All five cards are rendered and cross-faded rather than swapped: the markup
 * never changes, so there is nothing to re-layout on a scroll frame, and a
 * screen reader is handed all five specifications regardless of scroll
 * position — which a scroll-gated one would not be.
 *
 * Progress is read once per frame from the shared ticker, and state is written
 * only when the active layer actually changes, so scrolling costs one rect read
 * and no renders in between.
 */
export const TechnologyStack = ({ layers }: TechnologyStackProps) => {
  const regionRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [entered, setEntered] = useState(false);

  // The entrance is carried by the **cards themselves**, not by a wrapper. An
  // `Inview` writes a transform, and a transformed element becomes the
  // containing block for its absolutely positioned descendants — wrapping these
  // cards would silently re-base every one of them off the frame's coordinates.
  // The cards have no absolute descendants of their own, so moving them is safe.
  useEffect(() => {
    const stage = regionRef.current?.parentElement;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setEntered(true);
      },
      { rootMargin: REVEAL_ROOT_MARGIN },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const region = regionRef.current?.closest("section");
    if (!(region instanceof HTMLElement)) return;

    let current = 0;
    return subscribeToTicker(
      () => {
        const travel = region.offsetHeight - window.innerHeight;
        if (travel <= 0) return;
        const progress = Math.min(
          1,
          Math.max(0, -region.getBoundingClientRect().top / travel),
        );
        // Equal bands, one per layer; the last one runs to the end.
        const next = Math.min(
          layers.length - 1,
          Math.floor(progress * layers.length),
        );
        if (next === current) return;
        current = next;
        setActive(next);
      },
      () => 0,
    );
  }, [layers.length]);

  return (
    // Not a list: these are five states of one description, only ever one of
    // them on screen, and `display: contents` on an `li` — the only way to let
    // the cards position against the stage — drops the item out of the
    // accessibility tree in some engines. Five headings in the outline is the
    // honest structure, and every card stays readable whatever the scroll.
    <div ref={regionRef}>
      {layers.map((layer, index) => (
        <div key={layer.index}>
          <Leader layer={layer} active={entered && index === active} />

          <div
            // `right-10`: the frame's x of 983 plus the card's 417 is 1400, the
            // 40-unit margin, and only the margin still means that on a canvas
            // wider than 1440 units. The leader lines are derived from the same
            // two numbers — see `CARD_INSET`.
            className={`hero-lattice-panel absolute right-10 flex w-104.25 gap-12 border border-hero-rule p-4 ${TRANSITION} ${
              entered ? "translate-y-0" : "translate-y-4"
            } ${entered && index === active ? "opacity-100" : "opacity-0"}`}
            style={{ top: units(layer.cardTop) }}
          >
            <div className="flex flex-col items-start justify-between self-stretch">
              <span
                aria-hidden
                className="text-hero-body leading-hero-display text-hero-content-faint"
              >
                {layer.index}
              </span>
              <Image
                src={layer.icon.src}
                alt={layer.icon.alt}
                width={layer.icon.width}
                height={layer.icon.height}
                aria-hidden
                className="size-8 shrink-0 mb-[calc(var(--text-hero-body)*0.155)]"
              />
            </div>

            <div className="flex min-w-px flex-1 flex-col gap-3">
              <h3 className="text-hero-body leading-hero-display text-hero-content">
                {/* Re-decodes each time this layer becomes the active one —
                    the card is the only thing that moves, so the decode is what
                    marks the step. */}
                <ScrambleText
                  tieProse
                  key={entered && index === active ? "on" : "off"}
                  revealDelay={entered && index === active ? 0 : undefined}
                >
                  {layer.title}
                </ScrambleText>
              </h3>
              <p className="text-hero-body leading-hero-prose text-hero-content-muted uppercase">
                <ScrambleText
                  tieProse
                  key={entered && index === active ? "on" : "off"}
                  revealDelay={entered && index === active ? 90 : undefined}
                >
                  {layer.body}
                </ScrambleText>
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
