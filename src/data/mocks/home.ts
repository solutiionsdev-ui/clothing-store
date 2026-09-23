import type { CollectionsContent } from "@/views/home/collections";
import type { DetailsContent } from "@/views/home/details";
import type { FaqContent } from "@/views/home/faq";
import type { FooterContent } from "@/views/home/footer";
import type { TechnologyContent } from "@/views/home/technology";
import type { HeroContent } from "@/views/home/hero";

/**
 * Placeholder hero content until a CMS exists.
 *
 * Copy is transcribed verbatim from Figma node 902:304. Two things are
 * deliberately left as-is and flagged for design review rather than corrected
 * here: "WORLOWIDE SHIPPING" (typo for WORLDWIDE) and the `#` hrefs, which have
 * no routes behind them yet.
 */
export const homeHero: HeroContent = {
  nav: [
    { label: "SHOP", href: "#" },
    {
      label: "COLLECTIONS",
      href: "#",
      submenu: [
        { label: "SHADOW PUFFER JACKET", href: "#" },
        { label: "TACTICAL HOODED JACKET", href: "#" },
        { label: "THERMAL BOMBER JACKET", href: "#" },
        { label: "TECH SHELL JACKET", href: "#" },
      ],
    },
    { label: "TECHNOLOGY", href: "#" },
    { label: "ABOUT", href: "#" },
  ],
  cart: { label: "CART [ 0 ]", href: "#" },
  markerStart: {
    lines: ["ENGINEERED", "FOR MOTION.", "BUILT TO ENDURE."],
  },
  markerEnd: {
    lines: ["DESIGNED", "FOR THE UNKNOWN.", "READY FOR ANYTHING."],
  },
  title: [
    "WEATHER-RESISTANT. THERMAL INSULATION.",
    "OVERSIZED FIT. LIMITED QUANTITY.",
  ],
  cta: { label: "SHOP NOW", href: "#" },
  badgeStart: {
    icon: {
      src: "/assets/hero/hero-icon-globe.svg",
      alt: "",
      width: 37,
      height: 23,
    },
    caption: "EST.2022",
    lines: [
      "BUILT ON EXPERIENCE.",
      "DRIVEN BY INNOVATION.",
      "FOCUSED ON YOU.",
    ],
  },
  badgeEnd: {
    icon: {
      src: "/assets/hero/hero-icon-target.svg",
      alt: "",
      width: 23,
      height: 23,
    },
    lines: ["WORLOWIDE SHIPPING", "FAST & SECURE DELIVERY"],
  },
  subject: {
    src: "/assets/hero/hero-jacket.glb",
    label: "Oversized weather-resistant thermal jacket, iridescent black",
  },
};

/**
 * Placeholder details content until a CMS exists.
 *
 * Copy is transcribed verbatim from Figma node 1748:1102. The `#` href has no
 * route behind it yet — flagged, not invented.
 *
 * The standfirst is stored in sentence case exactly as the frame stores it; the
 * frame uppercases it in CSS, and so do we (`details-intro.tsx`).
 */
export const homeDetails: DetailsContent = {
  heading: "DETAILS MATTER.",
  lede: "A technical outer layer made for movement, changing weather and everything that happens beyond the expected.",
  cta: { label: "EXPLORE THE JACKET", href: "#" },
  features: [
    {
      index: "01",
      icon: {
        src: "/assets/details/details-icon-shell.svg",
        alt: "",
        width: 32,
        height: 32,
      },
      title: "WEATHER-RESISTANT SHELL",
      body: "WATER-REPELLENT OUTER SHELL PROTECTS AGAINST WIND AND RAIN.",
    },
    {
      index: "02",
      icon: {
        src: "/assets/details/details-icon-thermal.svg",
        alt: "",
        width: 32,
        height: 32,
      },
      title: "THERMAL INSULATION",
      body: "ADVANCED PADDING TRAPS HEAT AND KEEPS YOU WARM WITHOUT UNNECESSARY WEIGHT.",
    },
    {
      index: "03",
      icon: {
        src: "/assets/details/details-icon-construction.svg",
        alt: "",
        width: 32,
        height: 32,
      },
      title: "REINFORCED CONSTRUCTION",
      body: "DURABLE STITCHING AND STRUCTURAL PANELS FOR ADDED STRENGTH.",
    },
    {
      index: "04",
      icon: {
        src: "/assets/details/details-icon-storage.svg",
        alt: "",
        width: 32,
        height: 32,
      },
      title: "FUNCTIONAL STORAGE",
      body: "MULTIPLE ZIPPERED POCKETS INSIDE AND OUTSIDE TO CARRY ESSENTIALS.",
    },
    {
      index: "05",
      icon: {
        src: "/assets/details/details-icon-fit.svg",
        alt: "",
        width: 32,
        height: 32,
      },
      title: "OVERSIZED FIT",
      body: "RELAXED SILHOUETTE FOR MOVEMENT, LAYERING AND EVERYDAY COMFORT.",
    },
  ],
};

/**
 * Placeholder collections content until a CMS exists.
 *
 * Copy is transcribed verbatim from Figma node 1748:1152. **The prices are
 * not** — the frame has none, and these figures were invented to carry the
 * hover state the client asked for. They need replacing with real ones.
 *
 * Each product has **one** photograph so far. The frame's four swatches switch
 * between four views of the garment, so `views` is a list and the remaining
 * three angles per product are still to be supplied; until they are, the other
 * swatches fall back to the only view there is.
 *
 * **The photographs are four colourways of one garment**, supplied 2026-08-27,
 * and they were dealt to the four products in a drawn order — lime, rose,
 * copper, cobalt — rather than matched to the names, which describe four
 * different jackets nobody has photographed yet. Treat the pairing as arbitrary
 * until real product shots arrive; only the order is deliberate, and only in
 * that it is not sorted.
 *
 * They are square (1080x1080), lit on transparency and framed alike, so the
 * per-photograph `nudgeX`/`nudgeY` the old crops needed are gone: there is
 * nothing left to line up by hand.
 */
export const homeCollections: CollectionsContent = {
  heading: "COLLECTIONS.",
  lede: "Technical jackets for changing weather, movement and everyday use.",
  products: [
    {
      index: "01",
      name: "SHADOW PUFFER JACKET",
      price: "$480",
      views: [
        {
          src: "/assets/collections/collections-lime.png",
          alt: "",
          width: 1080,
          height: 1080,
        },
      ],
      swatches: 4,
      defaultView: 1,
      tags: ["OVERSIZED FIT", "LIMITED QUANTITY"],
      href: "#",
    },
    {
      index: "02",
      name: "TACTICAL HOODED JACKET",
      price: "$395",
      views: [
        {
          src: "/assets/collections/collections-rose.png",
          alt: "",
          width: 1080,
          height: 1080,
        },
      ],
      swatches: 4,
      defaultView: 1,
      tags: ["LAYERING PIECE", "UTILITY"],
      href: "#",
    },
    {
      index: "03",
      name: "THERMAL BOMBER JACKET",
      price: "$340",
      views: [
        {
          src: "/assets/collections/collections-copper.png",
          alt: "",
          width: 1080,
          height: 1080,
        },
      ],
      swatches: 4,
      defaultView: 1,
      tags: ["THERMAL INSULATION", "WINDPROOF"],
      href: "#",
    },
    {
      index: "04",
      name: "TECH SHELL JACKET",
      price: "$520",
      views: [
        {
          src: "/assets/collections/collections-cobalt.png",
          alt: "",
          width: 1080,
          height: 1080,
        },
      ],
      swatches: 4,
      defaultView: 1,
      tags: ["WATER-RESISTANT", "BREATHABLE"],
      href: "#",
    },
  ],
  cta: { label: "VIEW ALL JACKETS", href: "#" },
};
/**
 * Placeholder technology content until a CMS exists.
 *
 * Copy is transcribed verbatim from Figma nodes 1748:1155, 1924:2259, 1924:2285,
 * 1924:2311 and 1924:2337 — one frame per layer.
 *
 * The card coordinates are the frames' own. Each card is hand-placed against
 * the layer it describes and the leader line is drawn to a point on that layer,
 * so this is art direction rather than layout that could be derived:
 * `cardSideY` is where the line meets the card's left edge (its own centre
 * line, which is why it is not `cardTop` plus a constant — the cards are two or
 * three lines tall).
 *
 * **`anchorFx`/`anchorFy` are not the frame's**, and could not be: the still
 * those numbers were read off has been replaced by a clip that composes the
 * stack differently. They are fractions of the artwork, measured against the
 * clip's own settled arrangement — the one on screen for cards two to five —
 * with each point checked to land on the layer its card describes: the wet
 * outer sheet, the ripstop mesh, the quilted insulation, the pale membrane and
 * the lining at the bottom. Re-measure them if the clip is ever re-rendered.
 */
export const homeTechnology: TechnologyContent = {
  heading: ["TECHNOLOGY", "ENGINEERED TO ENDURE"],
  lede: [
    "Every detail has a purpose.",
    "From the protective outer shell to the insulation inside, the jacket is designed to perform without compromising its form.",
  ],
  stack: {
    // The poster still. The scrubbed frames are addressed by index, not named
    // here — see `TechnologyReel` and ADR-0046.
    src: "/assets/technology/technology-stack.webp",
    alt: "The jacket's five material layers, separated and stacked",
    width: 1024,
    height: 954,
  },
  layers: [
    {
      index: "01",
      title: "OUTER SHELL",
      body: "Durable outer layer that repels water and protects against wind and rain.",
      icon: { src: "/assets/technology/technology-icon-01.svg", alt: "", width: 32, height: 32 },
      cardTop: 136,
      cardSideY: 197,
      anchorFx: 0.6,
      anchorFy: 0.145,
    },
    {
      index: "02",
      title: "RIPSTOP PROTECTION",
      body: "Tear-resistant layer adds durability and prevents wear.",
      icon: { src: "/assets/technology/technology-icon-02.svg", alt: "", width: 32, height: 32 },
      cardTop: 236,
      cardSideY: 287,
      anchorFx: 0.707,
      anchorFy: 0.354,
    },
    {
      index: "03",
      title: "THERMAL INSULATION",
      body: "Advanced padding traps heat and keeps you warm without unnecessary weight.",
      icon: { src: "/assets/technology/technology-icon-03.svg", alt: "", width: 32, height: 32 },
      cardTop: 370,
      cardSideY: 431,
      anchorFx: 0.773,
      anchorFy: 0.477,
    },
    {
      index: "04",
      title: "BREATHABLE MEMBRANE",
      body: "Allows moisture to escape while blocking wind and water from outside.",
      icon: { src: "/assets/technology/technology-icon-04.svg", alt: "", width: 32, height: 32 },
      cardTop: 492,
      cardSideY: 553,
      anchorFx: 0.855,
      anchorFy: 0.576,
    },
    {
      index: "05",
      title: "COMFORT LINING",
      body: "Soft inner layer for all-day comfort and easy layering.",
      icon: { src: "/assets/technology/technology-icon-05.svg", alt: "", width: 32, height: 32 },
      cardTop: 658,
      cardSideY: 709,
      anchorFx: 0.822,
      anchorFy: 0.74,
    },
  ],
};

/**
 * Placeholder FAQ content until a CMS exists.
 *
 * Copy is transcribed verbatim from Figma node 1748:1158.
 *
 * The product is the hero's own model on this screen too, on the client's call,
 * pinned where the frame's photograph sat. That photograph — the same export the
 * details frame used before the 3D model replaced it there — has been deleted.
 */
export const homeFaq: FaqContent = {
  heading: "NEED TO KNOW.",
  subject: {
    src: "/assets/hero/hero-jacket.glb",
    label: "Oversized weather-resistant thermal jacket, iridescent black",
  },
  entries: [
    {
      index: "01",
      question: "HOW DO I CHOOSE THE RIGHT SIZE?",
      answer:
        "Check our size guide for measurements and fit information. The jackets feature an oversized silhouette for comfortable layering.",
    },
    {
      index: "02",
      question: "WHAT MATERIALS ARE USED IN THE JACKETS?",
      questionWidth: 195,
      answer:
        "We use technical fabrics, ripstop weave and advanced insulation for durability, protection and comfort.",
    },
    {
      index: "03",
      question: "HOW SHOULD I CARE FOR MY JACKET?",
      answer:
        "Follow the care instructions provided. Avoid harsh detergents and excessive heat to preserve the materials.",
    },
    {
      index: "04",
      question: "DO YOU SHIP INTERNATIONALLY?",
      answer:
        "Yes. We offer worldwide shipping with secure delivery and tracking on every order.",
    },
    {
      index: "05",
      question: "CAN I RETURN OR EXCHANGE MY ORDER?",
      answer:
        "Yes. Unworn jackets can be returned or exchanged within the specified return period.",
    },
  ],
};

/**
 * Placeholder footer content until a CMS exists.
 *
 * Copy is transcribed verbatim from Figma node 1748:1161. Every `href` is `#` —
 * none of these routes exist yet, and the sign-up form has no endpoint behind
 * it; both are flagged rather than invented.
 */
export const homeFooter: FooterContent = {
  columns: [
    {
      heading: { label: "SHOP", href: "#" },
      links: [
        { label: "CORE", href: "#" },
        { label: "TECH", href: "#" },
        { label: "LIMITED", href: "#" },
      ],
    },
    {
      heading: { label: "TECHNOLOGY", href: "#" },
      links: [
        { label: "MATERIALS", href: "#" },
        { label: "CONSTRUCTION", href: "#" },
      ],
    },
    { heading: { label: "ABOUT", href: "#" } },
    {
      heading: { label: "SUPPORT", href: "#" },
      links: [
        { label: "PRIVACY POLICY", href: "#" },
        { label: "Terms & Conditions", href: "#" },
        { label: "SIZE GUIDE", href: "#" },
        { label: "SHIPPING & RETURNS", href: "#" },
        { label: "FAQ", href: "#" },
      ],
    },
  ],
  newsletter: {
    heading: "STAY AHEAD OF THE DROP.",
    placeholder: "Your e-mail",
    consent: "I AGREE TO RECEIVE UPDATES.",
  },
  copyright: "© 2026 YOUR ONLINE STORE. ALL RIGHTS RESERVED.",
  social: [
    { label: "INSTAGRAM", href: "#" },
    { label: "YOUTUBE", href: "#" },
    { label: "TIK-TOK", href: "#" },
  ],
};
