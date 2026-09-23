"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { animated } from "@react-spring/web";

import { Inview } from "@/components/animation/springs/in-view";
import { ScrambleText } from "@/components/ui/scramble-text";
import { usePointerTilt } from "@/hooks/use-pointer-tilt";

import { COLLECTIONS_REVEAL } from "./collections.motion";
import type { CollectionsProduct } from "./collections.types";

export interface CollectionsCardProps extends CollectionsProduct {
  /** Position in the row, used to stagger the reveal. */
  order: number;
}

/** Frame units → rem against the 1440 base, where the root font-size is 16. */
const units = (value: number) => `${value / 16}rem`;

const TRANSITION = "transition duration-[var(--duration-normal)] ease-entrance";

/**
 * One product card (Figma 1923:2053 and siblings).
 *
 * The card is a fixed 446 units tall with its contents pushed apart, so the tag
 * chips sit on the bottom padding edge whether the title runs to one line or
 * two. The photographs are placed absolutely *behind* that column rather than
 * being flow items between the two: they overlap neither, and taking them out
 * of flow is what lets the title and the chips keep their own anchors.
 *
 * The title is held to 217 units — not a decoration, it is what forces the
 * frame's line break before "JACKET" on all four names. Left to the card's full
 * 297-unit column, "SHADOW PUFFER JACKET" fits on one line and the break is
 * lost. 217 is the widest of the four the frame sets; the other three do not
 * reach it, so one value reproduces every break.
 *
 * **Unfilled, back to the exported frame.** These carried the same opaque
 * lattice the details, technology and FAQ panels do — added because a
 * transparent card let the page's own grid run through the garment and the four
 * read as cut-outs. The client has reversed that: the cards are their border
 * and their contents now, and the page runs behind them. The garments are
 * lit-on-black renders, so what the grid actually shows through is their ground,
 * not the jackets.
 *
 * It also means the card no longer carries its own copy of the pointer
 * highlight — it gets the page's, through the hole where its fill used to be,
 * which is the same light from one source rather than two in phase.
 *
 * **The swatch column is a view switcher**, not decoration: it turns the
 * garment. Every view is rendered and cross-faded rather than swapped, so the
 * card never flashes an empty box while a photograph decodes and the switch
 * costs only an opacity change. One photograph per product exists so far, so
 * the other swatches currently land on it — the control is real, the pictures
 * are missing.
 *
 * **The hover state is an addition to the frame**, on the client's call: the tag
 * chips give way to a SHOP NOW link and the price lifts from 40% to full. It
 * keys off `focus-within` as well as hover, so the link is reachable by
 * keyboard instead of being a mouse-only control, and the chips and the link
 * are both absolutely positioned in one band, so the swap cannot change the
 * card's height.
 *
 * **So is the tilt**, on the same call: the card turns towards the corner the
 * cursor is in, and the garment stands off its face rather than being printed
 * on it. Three elements make that work and each has one job — the `li` owns
 * the lens (`perspective`), the panel inside it owns the rotation and
 * `preserve-3d`, and the photographs sit in a layer of their own with a
 * `translateZ`. The layer's parallax is then the perspective's own doing, not
 * a second animation kept in step with the first. See `use-pointer-tilt`.
 *
 * **The panel moved off the `li` to make room for that.** The reveal writes a
 * transform, and an element can only have one — the tilt and the entrance
 * would have overwritten each other on the same node. The `li` keeps the
 * reveal and the row's own sizing; everything the reader sees as the card is
 * one level in.
 */
export const CollectionsCard = ({
  index,
  name,
  price,
  views,
  swatches,
  defaultView,
  tags,
  href,
  order,
}: CollectionsCardProps) => {
  const [view, setView] = useState(defaultView);
  const delay = COLLECTIONS_REVEAL.card + order * COLLECTIONS_REVEAL.cardStep;
  /** Falls back to the first view for any swatch with no photograph yet. */
  const shown = Math.min(view, views.length - 1);
  const tilt = usePointerTilt();

  return (
    <Inview
      tag="li"
      mode="once"
      from={{ opacity: 0, y: 20 }}
      to={{ opacity: 1, y: 0 }}
      delayIn={delay}
      style={tilt.stage}
      className="group relative h-111.5 lg:flex-1"
    >
      <animated.div
        {...tilt.bind}
        style={tilt.surface}
        className="relative flex h-full w-full flex-col justify-between border border-hero-rule p-4"
      >
        <animated.div
          aria-hidden
          style={tilt.layer}
          className="pointer-events-none absolute inset-0"
        >
          {views.map((image, position) => (
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 46vw, 90vw"
              // **Contained in a square box, not cropped into a tall one.**
              // The photographs supplied on 2026-08-27 are 1080-square, lit on
              // transparency, with the garment sleeves-out and nearly as wide as
              // it is tall. `object-cover` in the old 237x327 portrait box threw
              // away a quarter of the width at each side — both cuffs. The box
              // is the card's own content width now and the picture is fitted
              // inside it, so the whole garment reads and its own framing, which
              // is identical across the four, is what lines them up.
              className={`absolute top-1/2 left-1/2 size-74.25 -translate-x-1/2 -translate-y-1/2 object-contain ${TRANSITION} ${
                position === shown ? "opacity-100" : "opacity-0"
              }`}
              // Margins, not a second transform — the two `-translate-*-1/2`
              // above own the transform, and a nudge written there would
              // replace the centring.
              style={{
                marginLeft: units(image.nudgeX ?? 0),
                marginTop: units(image.nudgeY ?? 0),
              }}
            />
          ))}
        </animated.div>

        <div className="relative flex w-full flex-col gap-4">
          <div className="flex w-full items-start justify-between">
            <span
              aria-hidden
              className="text-hero-body leading-hero-display text-hero-content-faint"
            >
              {index}
            </span>
            <Image
              src="/assets/collections/collections-corner.svg"
              alt=""
              width={13}
              height={13}
              aria-hidden
              className="size-3.25 shrink-0"
            />
          </div>

          <div className="flex w-full items-baseline justify-between gap-4">
            <h3 className="w-54.25 text-hero-title leading-hero-display text-hero-content">
              <ScrambleText revealInView revealDelay={delay}>
                {name}
              </ScrambleText>
            </h3>
            <span
              className={`shrink-0 text-hero-body leading-hero-display text-hero-content-muted group-focus-within:text-hero-content group-hover:text-hero-content ${TRANSITION}`}
            >
              <ScrambleText revealInView revealDelay={delay + 40}>
                {price}
              </ScrambleText>
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label={`${name} — view`}
          // `right-4`, not the frame's x of 301: the card is `flex-1` and grows
        // with the canvas (ADR-0037), and 301 is only its right margin at the
        // frame's own 331-unit width.
        className="absolute top-1/2 right-4 flex w-3 -translate-y-1/2 flex-col gap-1 max-lg:w-4 max-lg:gap-2"
        >
          {Array.from({ length: swatches }, (_, swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`View ${swatch + 1} of ${swatches}`}
              aria-pressed={swatch === view}
              onClick={() => setView(swatch)}
              // 12 units square is a cursor's target. Below the frame it is drawn
              // at 16 and hit-tested at 28×32, which the 8-unit gap has room for.
              className={`size-3 cursor-pointer max-lg:size-4 max-lg:tap-area max-lg:[--tap-y:0.3125rem] max-lg:[--tap-x:0.75rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content ${TRANSITION} ${
                swatch === view
                  ? "bg-hero-content"
                  : "border border-hero-content-muted hover:border-hero-content"
              }`}
            />
          ))}
        </div>

        {/* The chips and the link share this band, so neither can move the card. */}
        <div className="relative h-9.25">
          {/* Not `aria-hidden`: the attributes are content. They are only
           *visually* traded for the link, and a reader should still get both. */}
          {/* Traded for the link on hover — and *permanently* traded where there
              is no hover to give, which is what `(hover: none)` asks. Otherwise a
              phone shows the chips for ever and the card's actual action never
              appears at all. */}
          <ul
            className={`absolute inset-0 flex items-center gap-2 group-focus-within:opacity-0 group-hover:opacity-0 [@media(hover:none)]:opacity-0 ${TRANSITION}`}
          >
            {tags.map((tag) => (
              <li
                key={tag}
                className="flex h-full items-center border border-hero-content-muted px-3.5 text-hero-body leading-hero-display whitespace-nowrap text-hero-content-muted lg:text-hero-chip"
              >
                <ScrambleText revealInView revealDelay={delay + 80}>
                  {tag}
                </ScrambleText>
              </li>
            ))}
          </ul>

          <Link
            href={href}
            // **`pointer-events` follows the opacity, and that is a bug fix.**
            // At rest this link is invisible but was still hit-testable, so on a
            // phone — where the hover that reveals it never comes — the whole
            // chip band was an unmarked tap that navigated away. It is now inert
            // whenever it cannot be seen, and shown outright where there is no
            // hover.
            className={`absolute inset-0 flex items-center justify-between border border-hero-content px-3.5 text-hero-body leading-hero-display lg:text-hero-chip whitespace-nowrap text-hero-content pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content ${TRANSITION}`}
          >
            SHOP NOW
            <span className="sr-only">{` — ${name}, ${price}`}</span>
            <Image
              src="/assets/ui/arrow-right.svg"
              alt=""
              width={10}
              height={6}
              aria-hidden
              className="h-1.5 w-2.5 shrink-0"
            />
          </Link>
        </div>
      </animated.div>
    </Inview>
  );
};
