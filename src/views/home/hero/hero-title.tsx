"use client";

import { Spring } from "@/components/animation/springs/spring";
import { ScrambleText } from "@/components/ui/scramble-text";
import { keepSentences } from "@/lib/text/tie";

import { HERO_REVEAL } from "./hero.motion";

export interface HeroTitleProps {
  id: string;
  /** One entry per rendered line — the frame breaks these by hand. */
  lines: string[];
}

/**
 * The hero lede (Figma 902:308), and the page's only `h1`.
 *
 * Each line is a separate element so the frame's hand-set breaks survive
 * regardless of how the face measures — the block is never left to wrap.
 *
 * Anchored to the bottom, not the top: in the frame it sits 118px above the
 * base, just clear of the CTA, and that relationship is what has to hold when
 * the section is taller than 800 units.
 *
 * The spring fades the block in while the glyphs are still resolving, so the
 * finished sentence is never briefly on screen before its own decode starts.
 */
export const HeroTitle = ({ id, lines }: HeroTitleProps) => (
  <Spring
    tag="h1"
    id={id}
    mode="once"
    from={{ opacity: 0 }}
    to={{ opacity: 1 }}
    className="flex flex-col text-center text-hero-body leading-hero-display text-hero-content lg:absolute lg:inset-x-0 lg:bottom-29.5 lg:z-10 sm:text-hero-lede"
  >
    {lines.map((line, index) => (
      <ScrambleText
        key={line}
        className="block"
        revealDelay={HERO_REVEAL.title + index * HERO_REVEAL.titleStep}
      >
        {keepSentences(line)}
      </ScrambleText>
    ))}
  </Spring>
);
