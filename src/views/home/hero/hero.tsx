import { HeroBadge } from "./hero-badge";
import { HeroCta } from "./hero-cta";
import { HeroMarker } from "./hero-marker";
import { HeroStage } from "./hero-stage";
import { HeroTitle } from "./hero-title";
import type { HeroContent } from "./hero.types";

export interface HeroProps {
  content: HeroContent;
}

const TITLE_ID = "hero-title";

/**
 * Hero section — Figma file WINXFW2nTM7zYwd5dGgm1T, node 902:304 (1440×800).
 *
 * A Server Component: every animated piece is a client leaf.
 *
 * Horizontal offsets are the frame's own canvas coordinates on the spacing scale
 * (`n px` → `n/4`), and the root font-size tracks the viewport off the 1440 base,
 * so the composition stays proportional at any width.
 *
 * Vertically the section fills the viewport (`h-lvh`, floored at the frame's own
 * 800-unit height — a floor that can no longer bind, now that the root scale is
 * capped by the window's height as well as its width, but which costs nothing
 * and still states the intent) and each piece is anchored to the edge the frame anchors it
 * to: header to the top, lede/CTA/badges to the bottom, markers and the plate to
 * the centre. The product itself is not in this section — it travels into the
 * details screen, so it belongs to `ProductStage` one level up. At 1440×800 every anchor resolves to its exact frame
 * coordinate; on a taller window the gaps breathe instead of the composition
 * being stretched or cropped — it has content in all four corners, so neither
 * would survive. The lattice behind it belongs to the page (see `views/home`).
 */
export const Hero = ({ content }: HeroProps) => (
  <section
    aria-labelledby={TITLE_ID}
    // The 5rem is the header's own height below the frame — a 44px logo in a
    // 20/16 band — and it is subtracted because the header is in flow there,
    // so the screen the hero gets is what is left under it.
    className="relative flex min-h-[calc(100svh-5rem)] w-full flex-col justify-between gap-4 px-5 pt-6 pb-10 font-mono sm:gap-6 sm:pb-16 text-hero-content lg:block lg:h-lvh lg:min-h-200 lg:gap-0 lg:px-0 lg:pt-0 lg:pb-0"
  >
    {/* **This screen fills the viewport, and it is the one that can.** Nothing
        inside it is anchored to the top: the markers and the product are
        centred, the title, the CTA and the badges hang off the bottom. So the
        extra height a screen taller than 1.8:1 brings simply widens the space
        between the centred product and the copy under it, which is where it is
        least visible — rather than being parked as a margin above and below.

        The other screens cannot do this: they carry pairs that must stay level
        with each other, one anchored to the top and one to the bottom, and those
        drift apart by exactly the slack. Those get a fixed 800-unit box and a
        section cut to match, so the space between blocks stays what it is at
        1440. See `collections.tsx`. */}
    <div className="max-lg:contents lg:absolute lg:inset-0">
      {/* `lg:contents` dissolves these wrappers at the frame breakpoint, so the
          pieces go back to positioning themselves against the section. Below it
          they are ordinary flow, which is the only thing that survives a 360px
          viewport.

          **The markers open the screen here, rather than following the
          product.** In the frame they flank it, one against each margin at the
          screen's middle. Stacked into a column they landed under it instead,
          on top of the claim, the button and the two badges — four blocks of
          copy in a row with the whole picture above them. Leading with them
          splits the reading in two: what the garment is, then the garment. */}
      <div className="flex gap-4 lg:contents">
        <HeroMarker align="start" lines={content.markerStart.lines} />
        <HeroMarker align="end" lines={content.markerEnd.lines} />
      </div>

      <HeroStage backdrop={content.backdrop} />

      {/* **The claim and its button are one thing, and the screen is divided
          between four, not five.** Below the frame the hero is a column: the
          product's box, the two markers under it, this pair, and the badges on
          the bottom margin. The section is a screen tall — the header's 72px
          taken off, since it is in flow here — and `justify-between` hands the
          leftover height to the three gaps between them rather than leaving it
          all under the badges, which is what pushed the product to the top of
          the screen and bunched everything else against the fold. At `lg` the
          wrapper dissolves and both go back to their frame coordinates. */}
      <div className="flex flex-col items-center gap-6 lg:contents">
        <HeroTitle id={TITLE_ID} lines={content.title} />
        <HeroCta label={content.cta.label} href={content.cta.href} />
      </div>

      {/* **A pair, read as one thing, sitting on the block's own edge.** On a
          phone the column has no slack to hand out, so every gap in it was the
          same 16 and the two cards read as two more items in a list instead of
          as the screen's footnote. They are closer to each other than to
          anything else now, further below the button, and the block's bottom
          margin is cut back towards the order of its top — which is what puts
          them against the edge rather than floating above it.

          **A grid, so the pair is the same height on either axis.** Side by side
          a flex row stretched them to match; stacked, a flex column stretches
          the *width* and leaves each card as tall as its own copy — 78 against
          60 on a phone, which is the one thing these two must never be. Equal
          rows are the grid's own answer and hold in both directions. */}
      <div className="grid auto-rows-fr grid-cols-1 gap-2 max-sm:mt-6 sm:gap-3 md:grid-cols-2 md:gap-4 lg:contents">
        <HeroBadge
          align="start"
          icon={content.badgeStart.icon}
          caption={content.badgeStart.caption}
          lines={content.badgeStart.lines}
        />
        <HeroBadge
          align="end"
          icon={content.badgeEnd.icon}
          caption={content.badgeEnd.caption}
          lines={content.badgeEnd.lines}
        />
      </div>
    </div>
  </section>
);
