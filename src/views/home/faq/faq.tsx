import type { CSSProperties } from "react";

import { Inview } from "@/components/animation/springs/in-view";
import { ScrambleText } from "@/components/ui/scramble-text";

import { FaqStage } from "./faq-stage";

import type { FaqContent } from "./faq.types";

export interface FaqProps {
  content: FaqContent;
}

const HEADING_ID = "faq-heading";

/** First row's delay; the rest follow at this interval. */
const ROW_DELAY = 80;
const ROW_STEP = 90;

/**
 * FAQ section — Figma file WINXFW2nTM7zYwd5dGgm1T, node 1748:1158, the fifth
 * block of the concept.
 *
 * A Server Component; every animated piece is a client leaf.
 *
 * **A description list, not a stack of cards.** Five questions and their answers
 * is exactly what `dl`/`dt`/`dd` is for, and it is what makes the section
 * eligible for FAQ structured data later. The consequence is a strict content
 * model — inside a `dl` a row wrapper may hold only `dt` and `dd` — so the
 * frame's vertical rule between the two columns is drawn as a **border on the
 * answer** rather than as an element of its own, with the frame's 32-unit gap
 * split either side of it.
 *
 * The row height comes from the frame's rule, which is 112 units tall against
 * 80 units of copy. With the rule now a border there is nothing to drive that
 * height, so it is set explicitly — and only from `lg`, because below the frame
 * breakpoint the answers wrap to more lines and a fixed height would clip them.
 *
 * As with the other blocks, **the frame's header is not rebuilt** — each Figma
 * frame is a standalone artboard carrying it; the page has one banner.
 */
export const Faq = ({ content }: FaqProps) => (
  <section
    aria-labelledby={HEADING_ID}
    data-product-region
    className="relative flex w-full flex-col gap-10 overflow-hidden px-5 py-16 font-mono text-hero-content lg:block lg:h-200 lg:gap-0 lg:px-0 lg:py-0"
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
      {/* The frame runs the product off the bottom-left, mirrored — the same
          photograph the details frame used, flipped so the jacket faces into the
          page. The inner percentages are its crop, verbatim. */}
      <FaqStage subject={content.subject} />

      <Inview
        tag="h2"
        id={HEADING_ID}
        mode="once"
        from={{ opacity: 0, y: 20 }}
        to={{ opacity: 1, y: 0 }}
        className="text-hero-display-compact leading-hero-headline tracking-hero-display text-hero-content [text-box:trim-both_cap_alphabetic] sm:text-hero-display-tablet lg:text-hero-display lg:absolute lg:top-34 lg:left-10 lg:z-10 lg:w-64.5"
      >
        <ScrambleText revealInView tieProse>
          {content.heading}
        </ScrambleText>
      </Inview>

      {/* Right margin, not the frame's x of 726: 726 + 674 = 1400. See the
          note on the canvas in `views/home`. */}
      <dl className="flex flex-col gap-3 lg:absolute lg:top-34 lg:right-10 lg:z-10 lg:w-168.5">
        {content.entries.map((entry, index) => (
          <Inview
            tag="div"
            key={entry.index}
            mode="once"
            from={{ opacity: 0, y: 16 }}
            to={{ opacity: 1, y: 0 }}
            delayIn={ROW_DELAY + index * ROW_STEP}
            className="hero-lattice-panel flex flex-col gap-4 border border-hero-rule p-4 lg:h-28.5 lg:flex-row lg:items-center lg:gap-0 lg:px-4 lg:py-0"
          >
            {/* **Reversed below the frame, not reordered in the DOM.** The frame puts
                the index under the question because the two sit in a column beside
                the answer; read top to bottom on a narrow screen that is index-last,
                which is backwards — the number introduces the row. The markup keeps
                question first, where a reader needs it, and the column flips. */}
            <dt className="flex shrink-0 flex-col-reverse gap-4 lg:flex-col lg:w-48.75 lg:justify-center lg:gap-8">
              {/* **The frame's measured width, and only there.** Each
                  question carries the width the frame wraps it to — 175 units
                  by default — and that width is a fact about a 1440 screen
                  where the question sits in a 195-unit column beside its
                  answer. Below the frame the row is the full width of the
                  card and there is nothing to wrap around, so the same cap
                  broke a question that fits comfortably on one line into
                  three. Carried as a variable, applied at `lg`. */}
              <span
                className="block text-hero-body leading-hero-display text-hero-content max-sm:prose-even lg:max-w-[var(--faq-question)]"
                style={
                  {
                    "--faq-question": `${(entry.questionWidth ?? 175) / 16}rem`,
                  } as CSSProperties
                }
              >
                {/* No binding here, deliberately: this is a heading, and the
                    balancer below the frame can only even the two lines if it
                    is free to break between "OR" and what follows it. Ties are
                    for prose, where a hanging preposition has a line of running
                    text under it rather than the end of the question. */}
                <ScrambleText
                  revealInView
                  revealDelay={ROW_DELAY + index * ROW_STEP}
                >
                  {entry.question}
                </ScrambleText>
              </span>
              <span
                aria-hidden
                className="text-hero-body leading-hero-display whitespace-nowrap text-hero-content-faint"
              >
                {entry.index}
              </span>
            </dt>

            {/* The frame's vertical rule, drawn as this cell's own left border so
                the description list's content model stays intact. */}
            {/* Full row height, not the copy's 80 — the border *is* the frame's
                rule, and the rule runs the whole way down. The copy is centred
                inside it, which is where the frame's own 80-unit block sits. */}
            {/* **Top-aligned, not centred, and the padding is measured.** The
                frame centres the answer in its own 112-unit box while the
                question sits in a `justify-center` column beside it, so their
                first lines never met — the answer began 0.77rem above the
                question at every width, 1440 included. Aligning to the top and
                padding by the measured difference puts the two first lines on
                one line. In rem so it holds at every scale. */}
            <dd className="min-w-px text-hero-body leading-hero-prose text-hero-content-muted uppercase max-sm:prose-even lg:ml-8 lg:flex lg:h-28 lg:flex-1 lg:items-start lg:border-l lg:border-hero-rule lg:pt-[0.92rem] lg:pl-8">
              <ScrambleText
                tieProse
                revealInView
                revealDelay={ROW_DELAY + index * ROW_STEP + 60}
              >
                {entry.answer}
              </ScrambleText>
            </dd>
          </Inview>
        ))}
      </dl>
    </div>
  </section>
);
