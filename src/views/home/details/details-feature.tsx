"use client";

import Image from "next/image";

import { Inview } from "@/components/animation/springs/in-view";
import { ScrambleText } from "@/components/ui/scramble-text";

import { DETAILS_REVEAL } from "./details.motion";
import type { DetailsFeature as DetailsFeatureContent } from "./details.types";

export interface DetailsFeatureProps extends DetailsFeatureContent {
  /** Position in the list, used to stagger the reveal. */
  order: number;
}

/**
 * One numbered specification row (Figma 1921:1736 and siblings).
 *
 * The left rail is `justify-between` against a stretched cross-axis, which is
 * what pins the numeral to the top and the icon to the bottom. That is the
 * whole reason the rows are not all the same height in the frame: rows with a
 * three-line body are 122 tall and row 01, whose body fits in two, is 102 — the
 * icon simply follows the text down. Giving the rows a fixed height would break
 * that relationship the moment any copy changed length.
 *
 * The numeral is `aria-hidden`: the `ol` this sits in already carries the
 * ordering, so reading it out loud would announce every row's position twice.
 *
 * The row is an **opaque lattice panel**, not a transparent card: that is what
 * the frame draws, and on this screen it is also what makes the copy legible —
 * the product runs full-bleed behind these rows, and 40%-white prose over a lit
 * sleeve is unreadable. `hero-lattice-panel` carries the pointer highlight too,
 * so the panel's own cells light up in step with the field around it.
 *
 * Only the title decodes. The body is 60-odd characters of prose, and running
 * five of those at once turns a section of copy into noise — the effect works
 * because it is applied to labels.
 */
export const DetailsFeature = ({
  index,
  icon,
  title,
  body,
  order,
}: DetailsFeatureProps) => (
  <Inview
    tag="li"
    mode="once"
    from={{ opacity: 0, y: 16 }}
    to={{ opacity: 1, y: 0 }}
    delayIn={DETAILS_REVEAL.feature + order * DETAILS_REVEAL.featureStep}
    // **The rail is stretched by the card, and that is what puts a row's
    // icons on one line.** Two cards side by side are the same height and
    // rarely the same length of copy; anchoring each icon to its own last line
    // staggered them, and a row of marks at two different heights reads as a
    // mistake before it reads as a response to the text. Anchored to the card,
    // they share a line across the row. In the frame there is no grid and no
    // stretching — a card is exactly its own copy tall — so the icon lands on
    // the last line there, which is what the frame draws.
    className="hero-lattice-panel flex items-start gap-6 border border-hero-rule p-4 lg:gap-12"
  >
    <div className="flex flex-col items-start justify-between self-stretch">
      {/* **Flush with the mark's left edge.** The two are read as one rail
          down the side of the card, and a rail is a line you can follow — which
          means the edge that has to be straight is the one they share, not the
          gutter to the copy. */}
      <span
        aria-hidden
        className="text-hero-body leading-hero-display text-hero-content-faint"
      >
        {index}
      </span>
      <Image
        src={icon.src}
        alt={icon.alt}
        width={icon.width}
        height={icon.height}
        aria-hidden
        // **Lifted to the copy's last baseline, not to its box.** `justify-between`
        // puts the mark's box on the same line as the paragraph's, and a line box
        // runs below its own baseline by the font's descent — so the mark hung
        // 0.16em lower than the text it is meant to sit level with. Measured the
        // same at every width, 1440 included; it is a property of the component,
        // not of a breakpoint. In rem off the body size so it scales with the
        // frame rather than drifting at every width the way a pixel would.
        // **The icon carries the difference between itself and the number.**
        // Both sit in the same left column, both flush left, and the gutter a
        // reader sees is to the ink, not to the box: the number is 19.5 wide
        // and the mark 32, so the mark stood 24 from the copy where the number
        // stood 36.5. The margin puts the two on one line. At `lg` the
        // column's gutter is twice as wide and the frame's alignment stands.
        className="size-8 shrink-0 mb-[calc(var(--text-hero-body)*0.155)] max-lg:mr-3"
      />
    </div>

    <div className="flex min-w-px flex-1 flex-col gap-3">
      <h3 className="text-hero-body leading-hero-display text-hero-content">
        <ScrambleText
          tieProse
          revealInView
          revealDelay={
            DETAILS_REVEAL.feature + order * DETAILS_REVEAL.featureStep
          }
        >
          {title}
        </ScrambleText>
      </h3>
      <p className="text-hero-body leading-hero-prose text-hero-content-muted max-sm:prose-even max-lg:max-w-[42ch]">
        <ScrambleText
          tieProse
          revealInView
          revealDelay={
            DETAILS_REVEAL.feature + order * DETAILS_REVEAL.featureStep + 60
          }
        >
          {body}
        </ScrambleText>
      </p>
    </div>
  </Inview>
);
