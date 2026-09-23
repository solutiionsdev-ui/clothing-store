"use client";

import Image from "next/image";
import Link from "next/link";

import { ScrambleText } from "@/components/ui/scramble-text";

export interface FrameButtonProps {
  label: string;
  href: string;
  /** Passed to the label's decode — see `ScrambleText`. */
  revealDelay?: number;
  /** Decode when the button scrolls into view rather than on mount. */
  revealInView?: boolean;
}

/**
 * The four corner brackets that converge on hover.
 *
 * Drawn with two borders each rather than an SVG asset: the shape is two
 * hairlines, an asset would need flipping per corner, and a border cannot
 * disagree with the box it sits beside about what 1px means.
 *
 * `-top-3`/`-left-3` is 12px out against a 10px glyph, so each bracket clears
 * the box's own corner by 2px — they read as a separate frame closing in, not
 * as a thickening of the border. The hidden state sits 4px further out again.
 */
const CORNERS = [
  "-top-3 -left-3 border-t border-l -translate-x-1 -translate-y-1",
  "-top-3 -right-3 border-t border-r translate-x-1 -translate-y-1",
  "-bottom-3 -left-3 border-b border-l -translate-x-1 translate-y-1",
  "-bottom-3 -right-3 border-b border-r translate-x-1 translate-y-1",
];

/**
 * The bordered button both frames draw — hero "SHOP NOW" (Figma 902:320) and
 * details "EXPLORE THE JACKET" (1909:1657).
 *
 * The two are the same control at the same size: 20px label, 20px of side
 * padding, a 32px gap to the arrow and a 46px box. Only the label length and
 * where it is pinned differ, so **positioning lives with the caller** and this
 * component owns nothing but the box.
 *
 * The box is an **opaque lattice panel** — the fill both frames put behind it,
 * and what keeps the label readable where the product runs behind it on the
 * second screen. That is the frame's own background, not a wash: see
 * `hero-lattice-panel`, which also carries the pointer highlight so the button's
 * cells light up with everything else.
 *
 * Hover adds nothing to it — the hover is structural, never a fill. Two earlier attempts filled the box — a
 * solid white inversion, then a 10% wash — and both were rejected for the same
 * reason, which is worth stating so it is not tried a third time: nothing on
 * this page is filled. Every surface is near-black and every edge is a
 * hairline, so any wash reads as a muddy grey rectangle borrowed from a
 * different site. So the box does not change at all. Instead four corner
 * brackets converge on it — the same glyph the hero's edge statements are
 * bracketed with, and the same gesture as its reticle badge: a target being
 * acquired. The arrow nudges 4px, and the label decodes on its own, because
 * `ScrambleText` already fires on `mouseenter` and `focus`.
 *
 * The brackets are then the focus indicator, so the default outline is dropped
 * to avoid drawing two rings; it comes back under `forced-colors`, where a
 * palette we do not control is substituted and four hairlines are not something
 * to stake keyboard access on.
 *
 * These are CSS `transition-*` on token timing, the narrow exception ADR-0014
 * carves out of the springs-only rule: a two-state opacity change plus a few-px
 * decorative offset, no physics worth simulating.
 */
export const FrameButton = ({
  label,
  href,
  revealDelay,
  revealInView,
}: FrameButtonProps) => (
  <Link
    href={href}
    className="hero-lattice-panel group relative flex h-10 items-center gap-6 border border-hero-content px-4 text-hero-body leading-hero-display whitespace-nowrap text-hero-content sm:h-11.5 sm:gap-6 sm:px-5 sm:text-hero-lede lg:gap-8 focus-visible:outline-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2"
  >
    {CORNERS.map((corner) => (
      <span
        key={corner}
        aria-hidden
        className={`pointer-events-none absolute size-2.5 border-hero-content opacity-0 transition duration-[var(--duration-normal)] ease-entrance group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${corner}`}
      />
    ))}

    <ScrambleText revealDelay={revealDelay} revealInView={revealInView}>
      {label}
    </ScrambleText>
    <Image
      // Both axes pinned, and `h-auto` is specifically wrong here. In dev,
      // `next/image` warns that one dimension was modified without the other —
      // it compares the *rounded* rendered box against these props, and under
      // the adaptive rem grid a 10×6 mark lands on 10.83×6.48 at phone widths,
      // where the width rounds to 11 and the height still reads 6. A square
      // mark can never trip it, which is why the brackets and corners do not.
      // The warning is a false positive: the ratio is right to 0.2%, and the
      // check is compiled out of production. `h-auto` silences nothing and
      // actively distorts — this file's SVG is intrinsically 10×5.76, so auto
      // resolves the height against *that* and squashes the arrow by 4%
      // (measured 9.98×5.75 against the correct 9.98×5.98).
      src="/assets/ui/arrow-right.svg"
      alt=""
      width={10}
      height={6}
      aria-hidden
      className="h-1.5 w-2.5 shrink-0 transition-transform duration-[var(--duration-normal)] ease-entrance group-hover:translate-x-1 group-focus-visible:translate-x-1"
    />
  </Link>
);
