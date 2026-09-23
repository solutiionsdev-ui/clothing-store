"use client";

import Image from "next/image";

import { Spring } from "@/components/animation/springs/spring";
import { ScrambleText } from "@/components/ui/scramble-text";

import { HERO_REVEAL } from "./hero.motion";
import type { HeroMarkerContent } from "./hero.types";

export interface HeroMarkerProps extends HeroMarkerContent {
  /** `start` pins to the left margin, `end` mirrors the block to the right. */
  align: "start" | "end";
}

const BRACKET = "/assets/hero/hero-bracket.svg";

const GEOMETRY = {
  start: {
    block: "items-start lg:left-10 lg:w-39",
    line: "text-left",
    cornerTop: "",
    cornerBottom: "-scale-y-100",
  },
  end: {
    block: "items-end lg:right-10 lg:w-46.25",
    line: "text-right",
    cornerTop: "-scale-x-100",
    cornerBottom: "-scale-100",
  },
} as const;

/**
 * Bracketed edge statement (Figma 902:333 / 902:337).
 *
 * The frame mirrors one block onto the right edge, so the corner glyph is a
 * single asset flipped per position rather than four separate exports.
 */
export const HeroMarker = ({ align, lines }: HeroMarkerProps) => {
  const geometry = GEOMETRY[align];

  return (
    <div
      className={`flex flex-1 flex-col gap-4 text-hero-content lg:absolute lg:top-1/2 lg:z-10 lg:flex-none lg:-translate-y-1/2 lg:gap-6 ${geometry.block}`}
    >
      <Spring
        tag="div"
        mode="once"
        from={{ opacity: 0 }}
        to={{ opacity: 1 }}
        delayIn={120}
        className={`size-2 sm:size-2.75 ${geometry.cornerTop}`}
      >
        <Image
          src={BRACKET}
          alt=""
          width={11}
          height={11}
          priority
          aria-hidden
        />
      </Spring>

      <p
        className={`w-full text-hero-chip leading-hero-display sm:text-hero-body md:text-hero-lede lg:text-hero-body ${geometry.line}`}
      >
        {lines.map((line, index) => (
          <ScrambleText
            key={line}
            className="block"
            revealDelay={HERO_REVEAL.marker + index * HERO_REVEAL.markerStep}
          >
            {line}
          </ScrambleText>
        ))}
      </p>

      <Spring
        tag="div"
        mode="once"
        from={{ opacity: 0 }}
        to={{ opacity: 1 }}
        delayIn={120}
        className={`size-2 sm:size-2.75 ${geometry.cornerBottom}`}
      >
        <Image
          src={BRACKET}
          alt=""
          width={11}
          height={11}
          priority
          aria-hidden
        />
      </Spring>
    </div>
  );
};
