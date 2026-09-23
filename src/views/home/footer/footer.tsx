import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { Inview } from "@/components/animation/springs/in-view";
import { ScrambleText } from "@/components/ui/scramble-text";

import { FooterNewsletterForm } from "./footer-newsletter";
import type { FooterContent } from "./footer.types";

export interface FooterProps {
  content: FooterContent;
}

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content";

/**
 * Footer — Figma file WINXFW2nTM7zYwd5dGgm1T, node 1748:1161, the concept's
 * last block.
 *
 * A Server Component; the sign-up form and the reveals are client leaves.
 *
 * **350 units tall, not 800.** Every other frame in this file is a full
 * 1440×800 artboard, but this one's content stops at 326 and Figma renders the
 * node itself at 350 — so the footer is given its own height rather than a
 * screen's worth of empty lattice below it.
 *
 * **A `footer` landmark, and the columns are a `nav`.** This is the one block
 * where the frame's own header is absent, so nothing is skipped here; the
 * banner at the top of the page and this landmark are the page's two.
 *
 * The logo is the same asset the header uses, drawn larger — 99×40 against the
 * header's 75×30.
 */
export const Footer = ({ content }: FooterProps) => (
  <footer className="relative w-full font-mono text-hero-content lg:h-87.5">
    {/* **Shorter below the frame, and the notice sits on the edge.** The
          column's own rhythm was 40 between every part and 64 of padding at
          both ends, which on a phone left the closing line floating in the
          middle of an empty half-screen. 32 between parts, 48 above, and below
          it the same 20 the block already holds at its sides — so the notice
          closes the page against the block's own margin rather than hovering
          above it. */}
    <div className="flex flex-col gap-10 px-5 py-16 max-lg:gap-8 max-lg:pt-12 max-lg:pb-5 lg:block lg:gap-0 lg:px-0 lg:py-0">
      <Link
        href="/"
        className={`block h-13 w-32.5 lg:absolute lg:top-6 lg:left-10 lg:h-10 lg:w-24.75 ${FOCUS_RING}`}
      >
        <Image
          src={content.logo.src}
          alt={content.logo.alt}
          width={content.logo.width}
          height={content.logo.height}
          className="h-full w-full object-contain"
        />
      </Link>

      <nav
        aria-label="Footer"
        className="lg:absolute lg:top-6 lg:left-74.25 lg:z-10"
      >
        <ul className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:flex lg:gap-12">
          {content.columns.map((column) => (
            <li key={column.heading.label} className="lg:w-30 lg:last:w-auto">
              <Inview
                tag="div"
                mode="once"
                from={{ opacity: 0, y: 12 }}
                to={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5"
              >
                <Link
                  href={column.heading.href}
                  className={`block text-hero-body leading-hero-display text-hero-content max-lg:tap-area max-lg:[--tap-y:0.5rem] ${FOCUS_RING}`}
                >
                  <ScrambleText revealInView tieProse>
                    {column.heading.label}
                  </ScrambleText>
                </Link>

                {column.links ? (
                  <ul className="flex flex-col gap-3 max-lg:gap-4">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className={`block text-hero-body leading-hero-display text-hero-content-muted uppercase transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-hero-content max-lg:tap-area max-lg:[--tap-y:0.5rem] lg:whitespace-nowrap ${FOCUS_RING}`}
                        >
                          <ScrambleText tieProse revealInView revealDelay={80}>
                            {link.label}
                          </ScrambleText>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Inview>
            </li>
          ))}
        </ul>
      </nav>

      {/* **Anchored to the right margin, not to a left coordinate.** Its width
          has a floor now — the type inside stopped shrinking below 1024, so the
          box could not either — and a floored width hung off a fixed left edge
          runs past the screen: measured at 1024 it ended 42px beyond. The frame
          puts its right edge on the same 40-unit margin the rule above uses, so
          anchoring there is both faithful and safe. Same fix, same reason, as
          the social row below. */}
      <Inview
        tag="div"
        mode="once"
        from={{ opacity: 0, y: 12 }}
        to={{ opacity: 1, y: 0 }}
        delayIn={120}
        className="w-full max-lg:mt-6 lg:absolute lg:top-6 lg:right-10 lg:z-10 lg:w-[max(15.3125rem,245px)]"
      >
        <FooterNewsletterForm content={content.newsletter} />
      </Inview>

      {/* The frame's rule, drawn rather than exported — a 1px line at 25%. */}
      <div
        aria-hidden
        className="h-px w-full bg-hero-rule lg:absolute lg:top-71.5 lg:inset-x-10 lg:w-auto"
      />

      {/* **On a phone the order is inverted, and the legal line is quieter.**
          Stacked, it read copyright-then-links: the page ended on the two
          things a reader might actually press, announced by the one they never
          will, and the notice itself took two lines of body type to say
          nothing. The links come first now and the notice sits last at the chip
          size, where it fits on one line and reads as the footnote it is. From
          `sm` both go back to being ends of the same row.

          **The closing line is a row, not a stack.** Below the frame the
          copyright and the social links each took a full turn of the column,
          which left the footer trailing off in two half-empty lines — and put
          the social links in the bottom-left corner, underneath the cookie
          control that lives there. The frame already draws them as one line
          ending against opposite margins; this is that line, allowed to wrap
          onto two only where there is genuinely no room. `lg:contents` hands
          both back to their frame coordinates. */}
      <div className="flex flex-col-reverse gap-5 max-lg:-mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:contents">
        <Inview
          tag="p"
          mode="once"
          from={{ opacity: 0 }}
          to={{ opacity: 1 }}
          delayIn={200}
          className="text-hero-chip leading-hero-display text-hero-content-faint sm:text-hero-body lg:absolute lg:top-77.5 lg:left-10 lg:whitespace-nowrap"
        >
          <ScrambleText tieProse revealInView revealDelay={200}>
            {content.copyright}
          </ScrambleText>
        </Inview>

        {/* Anchored to the **right** margin, not to a left coordinate. The frame
          ends this row flush with the rule above it, and the frame's own left
          value only lands there for one exact set of glyph widths — a space
          more or less in a separator and it drifts off the line. Pinning it to
          the same 40-unit margin the rule uses makes that impossible. */}
        <Inview
          tag="ul"
          mode="once"
          from={{ opacity: 0 }}
          to={{ opacity: 1 }}
          delayIn={240}
          className="flex flex-wrap items-center gap-3 text-hero-body leading-hero-display text-hero-content-faint lg:absolute lg:top-77.5 lg:right-10 lg:flex-nowrap lg:whitespace-nowrap"
        >
          {content.social.map((link, index) => (
            <Fragment key={link.label}>
              {/* The frame's separator is the text " / " — spaces included. On a
                monospaced face those two spaces are 19 units of the row's
                width, and dropping them pulled the whole row 16 left. */}
              {index > 0 ? (
                <li aria-hidden className="whitespace-pre">
                  {" / "}
                </li>
              ) : null}
              <li>
                <Link
                  href={link.href}
                  className={`block transition-colors duration-[var(--duration-fast)] ease-entrance max-lg:tap-area hover:text-hero-content ${FOCUS_RING}`}
                >
                  {link.label}
                </Link>
              </li>
            </Fragment>
          ))}
        </Inview>
      </div>
    </div>
  </footer>
);
