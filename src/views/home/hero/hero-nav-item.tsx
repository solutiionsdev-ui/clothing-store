"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ScrambleText } from "@/components/ui/scramble-text";

import type { HeroNavItem } from "./hero.types";

export interface HeroNavItemProps extends HeroNavItem {
  /** Delay for the label's decode, in ms after mount. */
  revealDelay: number;
  /** Extra classes for the label — the frame's own type sizes. */
  labelClassName: string;
  /** Classes for the caret glyph's placement. */
  caretClassName: string;
}

const TRANSITION = "transition duration-[var(--duration-fast)] ease-entrance";

/**
 * How long the panel survives the pointer leaving it.
 *
 * A hover menu that closes the instant the cursor is off the label cannot be
 * used: between the two there is a gap, and crossing it is a `pointerleave`.
 * The gap itself is bridged below, so this is the second line of defence — it
 * forgives a cursor that clips a corner on its way down, which is what a hand
 * actually does.
 */
const CLOSE_DELAY_MS = 220;

/**
 * How long a tap suppresses hover afterwards, for devices that have both.
 * Long enough to cover the compatibility mouse events a tap trails behind it,
 * short enough that a hand moving from screen to trackpad is not locked out.
 */
const TOUCH_GRACE_MS = 700;

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * One primary-nav entry, with the submenu the frame's caret implies.
 *
 * **The caret is a promise the frame makes and never keeps** — it draws the
 * glyph next to COLLECTIONS and stops there. The panel is built on the client's
 * call, listing what the collections screen actually holds, so the two cannot
 * describe different ranges.
 *
 * Opened by hover or by activation, and closed by Escape, blur, or a click
 * outside.
 * Hover alone would put the whole submenu out of reach of a keyboard and of
 * touch, where there is no hover to give: the button is a real
 * `aria-expanded` control and the panel is a list of links, so it works with a
 * pointer, a finger and a tab key alike.
 *
 * **Hover is for devices that have one, and that is load-bearing.** A finger
 * used to send `pointerenter` (open) and then the `click` that follows it
 * (toggle → closed): the panel opened and shut inside a single tap and the menu
 * could not be used on a phone at all.
 *
 * Filtering on `pointerType === "touch"` does **not** fix it, and it is worth
 * knowing why — it was tried and measured. After a tap Chrome also emits the
 * legacy compatibility mouse events, and those carry `pointerType: "mouse"`, so
 * they sail through that check: the first tap still opened and closed, and only
 * the second one stuck, because by then the pointer already counted as "over".
 *
 * The signal that actually answers the question is the device's own — a media
 * query for a hover-capable fine pointer. Hybrids (a touch laptop) match it and
 * are still tapped sometimes, so a tap additionally suppresses hover for a
 * moment afterwards.
 */
export const HeroNavEntry = ({
  label,
  href,
  submenu,
  revealDelay,
  labelClassName,
  caretClassName,
}: HeroNavItemProps) => {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const lastTouch = useRef(0);
  /** False until the client has been asked, so SSR and hydration agree. */
  const [hoverable, setHoverable] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(HOVER_QUERY);
    const sync = () => setHoverable(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current === null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(
      () => setOpen(false),
      CLOSE_DELAY_MS,
    );
  };

  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelClose();
        setOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        cancelClose();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!submenu?.length) {
    return (
      <Link href={href} className={labelClassName}>
        <ScrambleText revealDelay={revealDelay}>{label}</ScrambleText>
      </Link>
    );
  }

  return (
    <div
      ref={wrapper}
      className="relative"
      onTouchStart={() => {
        lastTouch.current = Date.now();
      }}
      onPointerEnter={() => {
        if (!hoverable) return;
        if (Date.now() - lastTouch.current < TOUCH_GRACE_MS) return;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={() => {
        if (!hoverable) return;
        if (Date.now() - lastTouch.current < TOUCH_GRACE_MS) return;
        scheduleClose();
      }}
      // **Focus does not open it, activation does.** Tapping a button focuses it
      // and then clicks it, and `focus` arrives first — so opening on focus and
      // toggling on click cancelled each other out inside a single tap. Traced:
      // `aria-expanded` went true at 155ms and false at 157ms. It is also the
      // wrong pattern for a disclosure button, which is expected to respond to
      // Enter or Space, not to merely being tabbed to. Blur still closes it, so
      // the group cannot be left hanging open behind a keyboard.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          cancelClose();
          setOpen((value) => !value);
        }}
        className={`cursor-pointer ${labelClassName}`}
      >
        <ScrambleText revealDelay={revealDelay}>{label}</ScrambleText>
      </button>

      <Image
        src="/assets/hero/hero-caret.svg"
        alt=""
        width={6}
        height={5}
        aria-hidden
        className={`pointer-events-none absolute ${caretClassName} ${TRANSITION} ${
          open ? "rotate-180" : ""
        }`}
      />

      {/* **The 16 units between label and panel are padding on this box, not a
          margin on the panel.** As a margin they were dead space: the pointer
          crossed them on its way down, that counts as leaving the wrapper, and
          the menu closed before it could be reached. As padding they belong to
          an element that is part of the hover target, so the run from label to
          link is continuous. The gap looks identical either way. */}
      <div
        className={`absolute top-full left-0 pt-4 ${
          open ? "visible" : "invisible"
        }`}
      >
        <ul
          id={panelId}
          // Held in the tree rather than unmounted so the panel can fade, and
          // the wrapper's `invisible` so a closed one is neither clickable nor
          // tab-reachable — `opacity-0` alone would leave both.
          className={`hero-lattice-panel flex w-max min-w-56 flex-col gap-3 border border-hero-rule p-4 ${TRANSITION} ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
          {submenu.map((entry) => (
            <li key={entry.label}>
              <Link
                href={entry.href}
                tabIndex={open ? undefined : -1}
                className={`block whitespace-nowrap text-hero-body leading-hero-display text-hero-content-muted hover:text-hero-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content ${TRANSITION}`}
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
