"use client";

import { Inview } from "@/components/animation/springs/in-view";
import { ScrambleText } from "@/components/ui/scramble-text";

import { DETAILS_REVEAL } from "./details.motion";

export interface DetailsIntroProps {
  id: string;
  heading: string;
  lede: string;
}

/**
 * Headline and standfirst (Figma 1921:1779).
 *
 * The headline is set at 70px on a 344-unit column, which is exactly wide
 * enough for "DETAILS" and forces the break before "MATTER." — the frame breaks
 * it there on purpose, and the width is what holds it. It steps down to 40px
 * on a phone, where 70px would fill the screen edge to edge. That step fires
 * at `sm`, not `lg`: the adaptive grid changes its base width at 640, and a
 * type step has to land exactly there or the band above it is left tiny.
 *
 * The standfirst is stored in sentence case and uppercased in CSS, which is how
 * the frame carries it. That is not cosmetic here: it keeps the readable text
 * in the DOM, so a screen reader is handed a sentence rather than shouting.
 *
 * `text-box: trim-both cap alphabetic` is the frame's own setting, and it is
 * load-bearing rather than a nicety: at leading 0.8 the two lines occupy a
 * 112px box, but the frame measures the headline at 95 — it trims the space
 * above the capitals and below the baseline. Without it the 36px gap below
 * measures from the wrong edge and the standfirst sits 17px low. Browsers
 * without `text-box` support fall back to the untrimmed box, which is the same
 * 17px — a slightly loose gap, not a broken layout.
 */
export const DetailsIntro = ({ id, heading, lede }: DetailsIntroProps) => (
  <div className="flex flex-col gap-6 lg:absolute lg:top-30.5 lg:left-10 lg:z-10 lg:w-86 lg:gap-9">
    <Inview
      tag="h2"
      id={id}
      mode="once"
      from={{ opacity: 0, y: 20 }}
      to={{ opacity: 1, y: 0 }}
      className="text-hero-display-compact leading-hero-headline tracking-hero-display text-hero-content [text-box:trim-both_cap_alphabetic] sm:text-hero-display-tablet lg:text-hero-display"
    >
      <ScrambleText tieProse revealInView revealDelay={DETAILS_REVEAL.heading}>
        {heading}
      </ScrambleText>
    </Inview>

    <Inview
      tag="p"
      mode="once"
      from={{ opacity: 0 }}
      to={{ opacity: 1 }}
      delayIn={DETAILS_REVEAL.lede}
      className="text-hero-body leading-hero-prose text-hero-content-muted uppercase max-sm:prose-even sm:text-hero-lede"
    >
      <ScrambleText tieProse revealInView revealDelay={DETAILS_REVEAL.lede}>
        {lede}
      </ScrambleText>
    </Inview>
  </div>
);
