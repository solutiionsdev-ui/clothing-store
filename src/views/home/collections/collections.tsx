import { Inview } from "@/components/animation/springs/in-view";
import { FrameButton } from "@/components/ui/frame-button";
import { ScrambleText } from "@/components/ui/scramble-text";

import { CollectionsCard } from "./collections-card";
import { COLLECTIONS_REVEAL } from "./collections.motion";
import type { CollectionsContent } from "./collections.types";

export interface CollectionsProps {
  content: CollectionsContent;
}

const HEADING_ID = "collections-heading";

/**
 * Collections section — Figma file WINXFW2nTM7zYwd5dGgm1T, node 1748:1152
 * (1440×800), the third block of the concept.
 *
 * A Server Component; every animated piece is a client leaf.
 *
 * As with the details screen, **the frame's header is not rebuilt** — each Figma
 * frame is a standalone artboard and has to carry the banner; the page has one,
 * already rendered by `views/home`.
 *
 * The four cards are a flex row rather than four absolute boxes: the frame puts
 * them at x 40, 383, 726 and 1069 at 331 wide, which is exactly `inset-x-10`
 * with three 12-unit gaps and equal shares (4×331 + 3×12 = 1360 = 1440 − 80).
 * Expressing it as the row it is means the arithmetic cannot drift, and it is
 * also what lets the same markup become a two-column grid on a tablet and a
 * stack on a phone.
 *
 * The headline is the same 70px setting as the details screen, cap-height
 * trimmed — see `details-intro.tsx` for why that trim is load-bearing.
 */
export const Collections = ({ content }: CollectionsProps) => (
  <section
    aria-labelledby={HEADING_ID}
    className="relative flex w-full flex-col gap-10 px-5 py-16 font-mono text-hero-content lg:block lg:h-200 lg:gap-0 lg:px-0 lg:py-0"
  >
    {/* **The frame's own 800-unit box, centred in the screen.** The section is a
        viewport tall; the composition is not, and the two are only equal on a
        1.8:1 screen. Positioning the children against the *section* let all the
        leftover height fall below them — 89px of it at 1280×800 — and split the
        composition in half, because anything anchored to the top scaled with the
        frame and anything anchored to the bottom did not. Anchoring them here
        keeps every frame coordinate exact and leaves the slack where it belongs:
        half above, half below.

        `-mt-100` rather than `-translate-y-1/2` — a transform would make this a
        containing block for `background-attachment: fixed`, and the lattice
        panels inside would fall out of step with the page behind them.

        `max-lg:contents` so that below the frame this box is not in the layout
        at all and the flow column is exactly what it was. */}
    <div className="max-lg:contents lg:absolute lg:inset-x-0 lg:top-1/2 lg:-mt-100 lg:h-200">
      {/* Heading and lede are one group below the frame — they belong to each
          other, and the section's own 40-unit rhythm between them read as two
          unrelated blocks. `lg:contents` dissolves the wrapper at the frame
          breakpoint so both go back to their own frame coordinates. */}
      <div className="flex flex-col gap-4 lg:contents">
        <Inview
          tag="h2"
          id={HEADING_ID}
          mode="once"
          from={{ opacity: 0, y: 20 }}
          to={{ opacity: 1, y: 0 }}
          className="text-hero-display-compact leading-hero-headline tracking-hero-display text-hero-content [text-box:trim-both_cap_alphabetic] sm:text-hero-display-tablet lg:text-hero-display lg:absolute lg:top-32.5 lg:left-10 lg:z-10"
        >
          <ScrambleText
            tieProse
            revealInView
            revealDelay={COLLECTIONS_REVEAL.heading}
          >
            {content.heading}
          </ScrambleText>
        </Inview>

        <Inview
          tag="p"
          mode="once"
          from={{ opacity: 0 }}
          to={{ opacity: 1 }}
          delayIn={COLLECTIONS_REVEAL.lede}
          // Measured from the right edge — the frame puts this at x 1069 at
          // 285 wide, which leaves 86 units of margin, and that gap is what the
          // composition is: a lede tucked under the row's right-hand end.
          className="max-w-[36ch] text-hero-body leading-hero-prose text-hero-content-muted uppercase max-sm:prose-even sm:text-hero-lede lg:absolute lg:top-30.5 lg:right-21.5 lg:z-10 lg:w-71.25 lg:max-w-none"
        >
          <ScrambleText
            tieProse
            revealInView
            revealDelay={COLLECTIONS_REVEAL.lede}
          >
            {content.lede}
          </ScrambleText>
        </Inview>
      </div>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:absolute lg:inset-x-10 lg:top-57 lg:z-10 lg:flex">
        {content.products.map((product, index) => (
          <CollectionsCard key={product.index} order={index} {...product} />
        ))}
      </ol>

      <Inview
        tag="div"
        mode="once"
        from={{ opacity: 0, y: 12 }}
        to={{ opacity: 1, y: 0 }}
        delayIn={COLLECTIONS_REVEAL.cta}
        className="flex justify-center lg:absolute lg:bottom-10 lg:left-1/2 lg:z-10 lg:-translate-x-1/2"
      >
        <FrameButton
          label={content.cta.label}
          href={content.cta.href}
          revealInView
          revealDelay={COLLECTIONS_REVEAL.cta}
        />
      </Inview>
    </div>
  </section>
);
