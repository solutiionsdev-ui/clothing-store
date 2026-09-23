"use client";

import { useEffect, useRef, useState } from "react";

import { observeReveal } from "@/lib/animation/reveal";
import { tie } from "@/lib/text/tie";

/**
 * The width from which a column is wide enough to carry a bound pair without
 * leaving the line above it short. Tailwind's `sm`, written once here because
 * CSS cannot hand a breakpoint to a string.
 */
const WIDE_QUERY = "(min-width: 640px)";

/** The longest run a binding may produce on a narrow column. */
const NARROW_PAIR = 20;
import { useScrambleText } from "@/hooks/use-scramble-text";

export interface ScrambleTextProps {
  /** The real label. Must be a plain string — it is decoded character by character. */
  children: string;
  className?: string;
  /** Milliseconds between substitution steps. */
  stepMs?: number;
  /** Step ceiling — longer labels resolve several characters per step. */
  maxSteps?: number;
  /** Glyph pool the scramble draws from. */
  characters?: string;
  /**
   * Decode once, this many milliseconds after the trigger. Stagger it across a
   * group to get a cascade. Omit for hover/focus only.
   */
  revealDelay?: number;
  /**
   * Wait until the label scrolls into view instead of decoding on mount.
   *
   * Above the fold the two are the same thing, so the hero leaves this off. A
   * section further down the page needs it: decoding on mount there means the
   * effect has finished long before anyone arrives, and the reader sees only
   * the resolved text.
   */
  revealInView?: boolean;
  /**
   * Bind the small words to what follows them, so no line ends on a preposition
   * or an article.
   *
   * **Decided here rather than by the caller, and that is the point.** The
   * binding is a non-breaking space *in the text*, so which pairs are worth
   * binding depends on how wide the column is — and this is the only place the
   * text passes through that runs on the client, where the width is knowable.
   * A server section can ask for the treatment without becoming a client
   * component to get it.
   */
  tieProse?: boolean;
}

/**
 * A label that decodes from random glyphs — on hover, on focus, and once on
 * arrival: on mount by default, or on scrolling into view with `revealInView`.
 *
 * The scrambled glyphs are `aria-hidden` and the real label is kept in a
 * visually-hidden copy, so the accessible name stays stable while the visible
 * text is churning — a screen reader must never be handed `X#@%R`. The effect
 * also triggers on `focus`, so it is not mouse-only.
 *
 * Monospace by design: the character count never changes, so nothing reflows —
 * including the wrap points of a label that spans more than one line.
 *
 * On mount it renders the real label, not a scramble: a random first paint
 * would not match the server's and would break hydration. Blocks that decode on
 * arrival are faded in by a spring, so the resolved text is never on screen
 * before its own decode starts.
 */
export const ScrambleText = ({
  children,
  className,
  stepMs,
  maxSteps,
  characters,
  revealDelay,
  revealInView = false,
  tieProse = false,
}: ScrambleTextProps) => {
  // True for the server pass and the first client render, so hydration agrees;
  // a narrow viewport corrects it on the effect that follows.
  const [wide, setWide] = useState(true);
  useEffect(() => {
    if (!tieProse) return;
    const query = window.matchMedia(WIDE_QUERY);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [tieProse]);

  const text = tieProse
    ? tie(children, wide ? undefined : NARROW_PAIR)
    : children;

  const { display, scramble } = useScrambleText({
    text,
    stepMs,
    maxSteps,
    characters,
  });

  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // **`revealInView` is enough on its own.** It used to need a `revealDelay`
    // beside it or this returned before doing anything — so a label asking to
    // decode on arrival, and only that, silently never decoded. Nothing warned;
    // the text simply appeared. Three headings on the page were written that
    // way, the technology one among them. A delay is a refinement of when, not
    // permission to run at all.
    if (revealDelay === undefined && !revealInView) return;
    const delay = revealDelay ?? 0;

    if (!revealInView) {
      const timeout = window.setTimeout(scramble, delay);
      return () => window.clearTimeout(timeout);
    }

    const element = ref.current;
    if (!element) return;

    let timeout = 0;
    // The shared rule, so a label and the box it sits in arrive together — and
    // so a label resting near the bottom of the page still decodes.
    const stop = observeReveal(element, () => {
      timeout = window.setTimeout(scramble, delay);
    });

    return () => {
      stop();
      window.clearTimeout(timeout);
    };
  }, [revealDelay, revealInView, scramble]);

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={scramble}
      onFocus={scramble}
    >
      <span aria-hidden>{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
};
