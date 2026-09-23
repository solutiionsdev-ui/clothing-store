import {
  homeCollections,
  homeDetails,
  homeFaq,
  homeFooter,
  homeHero,
  homeTechnology,
} from "@/data/mocks/home";

import { Collections } from "./collections";
import { PointerField } from "@/components/common/pointer-field";

import { Details } from "./details";
import { Faq } from "./faq";
import { Footer } from "./footer";
import { Hero, HeroHeader } from "./hero";
import { ProductStage } from "./product-stage";
import { Technology } from "./technology";

/**
 * Home view — a Server Component; every animated piece below is a client leaf.
 *
 * Layout notes:
 * - The lattice and `min-h-lvh` sit on the page, not on the hero: in the frame
 *   the lattice is the canvas *behind* everything including the header
 *   (Figma 902:305), and carrying it here keeps it full-bleed and full-height
 *   whatever the viewport aspect, so no bare band is left under the frame.
 *   **One grid, and it scrolls with the page.** The lattice is drawn exactly
 *   once, here, by the same utility the opaque cards use — the page is the
 *   surface those cards are imitating, so it may as well be the same paint.
 *   The bars are `background-attachment: scroll`, so they are anchored to the
 *   document and travel with it; the highlight's three radial layers are
 *   `fixed`, so they stay under the cursor, and they are listed *after* the
 *   bars so the bars paint over them and quantise the light into cells.
 *
 *   It used to be two grids — one here on the document, one on a fixed
 *   viewport-sized layer — and they held still against each other only while
 *   the page did. Scrolling slid one across the other and the background broke
 *   into a moire of half-cells and swimming stripes. Removing the fixed copy
 *   fixed that; drawing the survivor here rather than there is what lets it
 *   move with the page instead of standing still behind it.
 * - **A frame screen is 800 frame units tall, never the viewport's height.**
 *   The two are only the same on a 1.8:1 screen. On a 1280×800 window the
 *   frame scales to 711px while `h-lvh` stays 800, and that 89px of slack
 *   splits the composition in half: everything anchored to the frame's top
 *   scales with it, everything anchored to the section's bottom does not, and
 *   they drift apart by exactly the slack. Measured there, the details CTA
 *   sat 49px below the spec column it is drawn level with at 1440.
 * - **The canvas is the window, not 90rem.** The root font-size takes the
 *   frame's scale from whichever axis runs out first (globals.css), so on a
 *   screen wider than the frame's own 1.8:1 the scale comes off the *height* —
 *   and 90rem is then narrower than the window. Held to 90rem the frame sat
 *   centred with a band of bare lattice down each side, which is the page
 *   growing margins it was never drawn with. Full width instead: the
 *   composition keeps its scale, and the extra width goes to the gaps between
 *   its columns, where it belongs.
 *
 *   **What that asks of the sections:** every horizontal coordinate in the
 *   `lg:` layout has to be anchored to an edge or to the centre, never to a
 *   left offset that only means the right margin at exactly 1440 units. The
 *   right-hand columns are `right-10`, the centred pieces are `left-1/2` or
 *   auto margins, and the leader lines in the technology stack are drawn from
 *   `50%` and `100%` rather than from frame x. At exactly 1440 units every one
 *   of those resolves to the frame's own number, so the reference render is
 *   unchanged — they only differ once the canvas is wider.
 *
 *   It also settles the scrollbar: `w-360` was 90rem = `100vw`, and `100vw`
 *   counts the scrollbar while the page's content box does not, so the canvas
 *   overhung the right edge by 15px and everything the frame centres landed
 *   7.5px right of the axis a reader sees. `w-full` is the content box.
 *   ADR-0029 for why the frame is abandoned below `lg` rather than scaled.
 * - The header lives in that canvas so it stays on the frame's margins, and is
 *   still a child of plain elements only — so it remains the page banner.
 * - `overflow-x-clip` (not `hidden` — it must not become a scroll container, or
 *   sticky positioning breaks for later sections) is the backstop against a
 *   stray full-bleed child; nothing should be relying on it to hide a spill.
 */
export const HomeView = () => (
  <div className="hero-lattice-shell relative min-h-lvh overflow-x-clip font-mono text-hero-content">
    {/* **The page's surface, as two layers rather than one painted element.**
        `hero-lattice-panel` — which this wore — paints its highlight with
        `background-attachment: fixed`, and a fixed background cannot be
        scrolled by the compositor: it is repainted every frame across the
        element's whole visible area. For a card that is a card; for the page
        shell it is the entire viewport, all the way down the document, and it
        was holding the content sections at half the display's refresh rate.
        See [[decisions-log]] ADR-0047.

        Both are `aria-hidden` decoration, and both must stay **before** the
        page's content and **in this order** — the bars paint over the light,
        which is what makes the highlight read as the grid brightening rather
        than as a lamp shining across it. */}
    <div aria-hidden className="hero-lattice-beam" />
    <div aria-hidden className="hero-lattice-bars" />

    <PointerField />

    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-hero-surface focus:px-3 focus:py-2 focus:text-hero-content"
    >
      Skip to content
    </a>

    <div className="relative w-full">
      {/* Pinned for the whole page. The wrapper is what sticks; from `lg` it
          is given **zero height** and the header inside it goes back to being
          absolutely positioned, so the banner keeps the frame's own coordinates
          and takes no space in the flow — the hero still starts at the top of
          the canvas, exactly as it did before it was pinned. Below `lg` the
          header is in flow and the wrapper simply takes its height.

          **Below `lg` it also needs a backdrop, and it belongs here rather than
          on the header.** Pinned and transparent, the whole page scrolled
          straight through the banner — spec-card copy read out from behind the
          logo and the nav, on every section. The fill is the same opaque
          lattice the cards use, so the band reads as the page's own surface
          rather than as a foreign bar. It is on the wrapper because the header
          itself is a `Spring`, and a transform makes `background-attachment:
          fixed` resolve against the element instead of the viewport, which
          would knock the lattice out of step with the page behind it. At `lg`
          the frame draws no such band, hence `max-lg:`. */}
      <div className="sticky top-0 z-50 max-lg:hero-lattice-panel max-lg:border-b max-lg:border-hero-rule lg:h-0">
        <HeroHeader
          logo={homeHero.logo}
          nav={homeHero.nav}
          cart={homeHero.cart}
        />
      </div>

      <main id="main">
        <ProductStage subject={homeHero.subject}>
          <Hero content={homeHero} />
          <Details content={homeDetails} />
        </ProductStage>

        {/* Outside the product region: the travelling jacket's journey ends
            with the details screen, and nothing here sits over it. */}
        <Collections content={homeCollections} />

        <Technology content={homeTechnology} />

        <Faq content={homeFaq} />
      </main>

      <Footer content={homeFooter} />
    </div>
  </div>
);
