"use client";

import { Spring } from "@/components/animation/springs/spring";
import { ScrambleText } from "@/components/ui/scramble-text";

import { HeroBadgeIcon } from "./hero-badge-icon";
import { HERO_REVEAL } from "./hero.motion";
import type { HeroBadgeContent } from "./hero.types";

export interface HeroBadgeProps extends HeroBadgeContent {
  /** `start` pins to the left margin, `end` to the right. */
  align: "start" | "end";
}

/**
 * Offsets are measured from the card's padding box, so each one is the Figma
 * canvas value minus the card origin minus its 1px border.
 */
const GEOMETRY = {
  start: {
    card: "lg:left-10 lg:w-[max(16.4375rem,263px)]",
    media:
      "lg:top-3.5 lg:left-[max(1.1875rem,19px)] lg:w-[max(3.1875rem,51px)]",
    rule: "lg:left-[max(5.625rem,90px)]",
    copy: "lg:top-3.75 lg:left-[max(6.875rem,110px)] lg:w-[max(8.25rem,132px)]",
  },
  end: {
    card: "lg:right-10 lg:w-[max(13.875rem,222px)]",
    media: "lg:top-5.25 lg:left-[max(1.3125rem,21px)]",
    rule: "lg:left-[max(4.125rem,66px)]",
    copy: "lg:top-3.25 lg:left-[max(5.5rem,88px)] lg:w-[max(7.0625rem,113px)]",
  },
} as const;

/* **Every frame coordinate above is `lg:`-gated, and that is the whole fix.**
   The card is 68 units tall and its copy 132 wide because the frame says so —
   at 1440. Below it the same box has to hold type that no longer shrinks, and
   the copy ran straight out of the bottom of the card. Here the badge is an
   ordinary row instead: an icon column, the frame's own rule as a divider, and
   copy that takes the width that is left and sets the card's height by
   wrapping. Both cards stretch to the taller of the two, so they stay equal. */

/**
 * Bordered corner card (Figma 902:310 / 902:323).
 *
 * The right-hand card has no caption and lets its second line wrap inside the
 * fixed copy width, exactly as the frame does.
 */
export const HeroBadge = ({ align, icon, caption, lines }: HeroBadgeProps) => {
  const geometry = GEOMETRY[align];
  const reveal =
    align === "start" ? HERO_REVEAL.badgeStart : HERO_REVEAL.badgeEnd;

  return (
    <Spring
      tag="div"
      mode="once"
      from={{ opacity: 0, y: 12 }}
      to={{ opacity: 1, y: 0 }}
      delayIn={align === "start" ? 300 : 360}
      className={`relative flex w-full items-stretch gap-4 border border-hero-rule p-4 text-hero-content md:flex-1 lg:absolute lg:bottom-10 lg:z-10 lg:block lg:h-[max(4.25rem,68px)] lg:gap-0 lg:p-0 lg:flex-none ${geometry.card}`}
    >
      <div
        // **One width for both cards below the frame.** The column is
        // content-sized, and only one of the two carries a caption under its
        // mark — so the icons sat at different widths and the rule beside them
        // landed at a different place in each card. In the frame that cannot
        // happen: both columns are placed on their own measured coordinates.
        // Here they are given the same box instead, wide enough for the caption
        // at its largest (86px at the tablet's type), and the rule lands on one
        // line down the pair.
        className={`flex shrink-0 flex-col items-center justify-center gap-2 max-lg:w-24 lg:absolute lg:justify-start ${geometry.media}`}
      >
        {/* The frame carries exactly one of each mark, and which idle suits a
            glyph is a property of the glyph, not of the corner it sits in — so
            this is keyed off the card, not read from content. */}
        <HeroBadgeIcon
          icon={icon}
          motion={align === "start" ? "globe" : "reticle"}
        />
        {caption ? (
          <p className="text-hero-chip leading-hero-caption tracking-hero-caption sm:text-hero-body lg:text-hero-caption">
            <ScrambleText revealDelay={reveal}>
              {caption}
            </ScrambleText>
          </p>
        ) : null}
      </div>

      <span
        aria-hidden
        className={`w-px shrink-0 self-stretch bg-hero-rule lg:absolute lg:top-0 lg:h-16.5 lg:self-auto ${geometry.rule}`}
      />

      <p
        // **Neither bound nor balanced — these are written lines.** A binding
          // dragged "BY INNOVATION." onto its own line and left "DRIVEN" alone
          // above it. The balancer fixed that and introduced its own: given two
          // line sets of equal longest line it stranded "FAST &". Plain
          // wrapping picks the better of the two here, so it is left alone.
          className={`min-w-px flex-1 self-center text-hero-chip leading-hero-caption tracking-hero-caption sm:text-hero-body lg:absolute lg:flex-none lg:self-auto lg:text-hero-caption ${geometry.copy}`}
      >
        {lines.map((line, index) => (
          <ScrambleText
            key={line}
            className="block"
            revealDelay={reveal + (index + 1) * HERO_REVEAL.badgeStep}
          >
            {line}
          </ScrambleText>
        ))}
      </p>
    </Spring>
  );
};
