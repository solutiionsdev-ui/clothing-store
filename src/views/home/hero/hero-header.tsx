"use client";

import Link from "next/link";

import { Spring } from "@/components/animation/springs/spring";
import { BrandMark } from "@/components/ui/brand-mark";
import { ScrambleText } from "@/components/ui/scramble-text";

import { HeroMenu } from "./hero-menu";
import { HeroNavEntry } from "./hero-nav-item";

import { HERO_REVEAL } from "./hero.motion";
import type { HeroLink, HeroNavItem } from "./hero.types";

export interface HeroHeaderProps {
  nav: HeroNavItem[];
  cart: HeroLink;
}

/** The logo's box — the frame's 30px row at `lg`, a 44px tap target below it.
 * The text mark is sized by its own height inside it (`LOGO_MARK`). */
const LOGO_BOX = "flex h-11 items-center lg:h-7.5";

/** The text logo's cap height — larger below the frame, where the header has
 * room for it. */
export const LOGO_MARK = "h-4 w-auto lg:h-3.5";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content";

/**
 * Frame header (Figma 902:309 / 902:341 / 1923:2152).
 *
 * The three groups are pinned independently rather than distributed: the frame
 * centres the nav on the canvas while the logo and cart sit against the 40px
 * margins, which a `justify-between` row cannot reproduce.
 */
export const HeroHeader = ({ nav, cart }: HeroHeaderProps) => (
  <Spring
    tag="header"
    mode="once"
    from={{ opacity: 0, y: -8 }}
    to={{ opacity: 1, y: 0 }}
    // Below the frame breakpoint this is ordinary flow and wraps: the nav is
    // full-width so it drops to its own line under the logo and cart, while DOM
    // order stays logo → nav → cart for reading. At `lg` it becomes the frame's
    // own canvas again and the three groups position against it.
    className="relative z-20 flex flex-wrap items-center gap-y-3 px-5 pt-5 pb-4 font-mono text-hero-content lg:absolute lg:inset-x-0 lg:top-0 lg:block lg:h-13.5 lg:px-0 lg:pt-0 lg:pb-0"
  >
    <Link
      href="/"
      className={`${LOGO_BOX} order-1 max-lg:tap-area lg:absolute lg:top-6 lg:left-10 ${FOCUS_RING}`}
    >
      <BrandMark variant="inline" className={LOGO_MARK} />
    </Link>

    <nav
      aria-label="Primary"
      className="order-3 hidden w-full lg:absolute lg:block lg:top-6 lg:left-1/2 lg:w-auto lg:-translate-x-1/2"
    >
      <ul className="flex items-start justify-between gap-3 lg:justify-start lg:gap-16">
        {nav.map((item, index) => (
          // A submenu item reserves the width of its caret box (113px offset +
          // the 6px glyph). The caret is positioned out of flow to match the
          // frame exactly, so without this the row would centre 12px narrow.
          <li
            key={item.label}
            className={`relative ${item.submenu ? "lg:w-29.75" : ""}`}
          >
            <HeroNavEntry
              {...item}
              revealDelay={index * HERO_REVEAL.navStep}
              labelClassName={`block text-hero-caption leading-hero-display whitespace-nowrap max-lg:tap-area sm:text-hero-body ${FOCUS_RING}`}
              caretClassName="top-1 -right-2 h-1.25 w-1.5 -scale-y-100 lg:right-auto lg:left-28.25"
            />
          </li>
        ))}
      </ul>
    </nav>

    <Link
      href={cart.href}
      // `right-10`, not the frame's own x of 1302: the two are the same thing
      // at 1440 units — the label ends flush on the 40-unit margin — and only
      // the margin still means that on a canvas that is wider.
      className={`order-2 ml-auto hidden text-hero-caption lg:block leading-hero-display whitespace-nowrap max-lg:tap-area lg:absolute lg:top-6 lg:right-10 lg:ml-0 sm:text-hero-body ${FOCUS_RING}`}
    >
      <ScrambleText revealDelay={HERO_REVEAL.cart}>{cart.label}</ScrambleText>
    </Link>

    <div className="order-2 ml-auto lg:hidden">
      <HeroMenu
        nav={nav}
        cart={cart}
        logoClassName={LOGO_BOX}
        logoMarkClassName={LOGO_MARK}
      />
    </div>
  </Spring>
);
