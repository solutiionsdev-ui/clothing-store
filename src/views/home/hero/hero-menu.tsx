"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ScrambleText } from "@/components/ui/scramble-text";

import type { HeroImage, HeroLink, HeroNavItem } from "./hero.types";

export interface HeroMenuProps {
  logo: HeroImage;
  nav: HeroNavItem[];
  cart: HeroLink;
  /** The logo's own box, so the panel's copy sits exactly over the page's. */
  logoClassName: string;
}

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content";

const TRANSITION = "transition duration-[var(--duration-fast)] ease-entrance";

/**
 * The burger, and the panel it opens — below the frame breakpoint only.
 *
 * **The frame's header does not survive a narrow screen.** It centres four nav
 * items on the canvas with the logo and the cart against the margins; wrapped
 * into flow that became a second row of four labels squeezed edge to edge, with
 * a hover submenu that a finger cannot reach. So below `lg` the row collapses
 * to the logo and this control, and everything it carried moves into a panel.
 *
 * **The panel draws its own header rather than sitting under the page's.**
 * Measuring the sticky band and offsetting by it would tie this component to
 * another one's padding; covering the screen and repeating the logo in the same
 * box cannot drift. The burger becomes the close control in place, so the thing
 * that opened the panel is the thing that shuts it.
 *
 * The submenu is listed open. It is a disclosure on desktop because hover has
 * somewhere to put it; here there is room on the screen, and a second tap to
 * reach four links is a cost with nothing bought.
 */
export const HeroMenu = ({ logo, nav, cart, logoClassName }: HeroMenuProps) => {
  const [open, setOpen] = useState(false);

  // The page behind a full-screen panel must not scroll under it. On `html`
  // rather than `body`: the lattice's fixed layers resolve against the
  // viewport, and locking `body` alone leaves the scroll chained to it.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const bar = `block h-px w-full bg-hero-content ${TRANSITION}`;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className={`relative z-[70] flex h-6 w-7 shrink-0 cursor-pointer flex-col justify-between py-1 tap-area [--tap-x:0.75rem] [--tap-y:0.75rem] ${FOCUS_RING}`}
      >
        <span
          className={`${bar} ${open ? "translate-y-[7px] rotate-45" : ""}`}
        />
        <span className={`${bar} ${open ? "opacity-0" : ""}`} />
        <span
          className={`${bar} ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </button>

      <div
        // Held in the tree so it can fade, and `invisible` when shut so nothing
        // inside it is clickable or tab-reachable.
        className={`hero-lattice-panel fixed inset-0 z-[60] flex flex-col px-5 pt-5 pb-10 ${TRANSITION} ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          tabIndex={open ? undefined : -1}
          className={`${logoClassName} ${FOCUS_RING}`}
        >
          <Image
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            className="h-full w-full object-contain"
          />
        </Link>

        <nav aria-label="Primary" className="mt-10 flex-1 overflow-y-auto">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li
                key={item.label}
                className="border-t border-hero-rule py-5 last:border-b"
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? undefined : -1}
                  className={`block text-hero-title leading-hero-display text-hero-content ${FOCUS_RING}`}
                >
                  <ScrambleText revealDelay={open ? 0 : undefined}>
                    {item.label}
                  </ScrambleText>
                </Link>

                {item.submenu?.length ? (
                  <ul className="mt-4 flex flex-col gap-3 pl-5">
                    {item.submenu.map((entry) => (
                      <li key={entry.label}>
                        <Link
                          href={entry.href}
                          onClick={() => setOpen(false)}
                          tabIndex={open ? undefined : -1}
                          className={`block text-hero-body leading-hero-display text-hero-content-muted ${TRANSITION} hover:text-hero-content ${FOCUS_RING}`}
                        >
                          {entry.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href={cart.href}
          onClick={() => setOpen(false)}
          tabIndex={open ? undefined : -1}
          className={`mt-10 flex h-13 items-center justify-center border border-hero-content text-hero-body leading-hero-display text-hero-content ${FOCUS_RING}`}
        >
          <ScrambleText revealDelay={open ? 240 : undefined}>
            {cart.label}
          </ScrambleText>
        </Link>
      </div>
    </>
  );
};
