"use client";

/**
 * Decode-on-demand text effect: the label is replaced with random glyphs, then
 * resolves left to right, one character per step.
 *
 * It runs on the shared rAF ticker rather than its own `setInterval`, so the
 * page keeps a single loop and the effect pauses with the tab.
 *
 * This is a **content** effect — it substitutes characters, it does not animate
 * a property — which is why it is not a `spring-text-engine` usage. See
 * `obsidian/meta/decisions-log.md` ADR-0026.
 *
 * 📖 Docs: obsidian/frontend/hooks.md
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";

/** Uppercase, digits and symbols — the set the display face actually carries. */
export const SCRAMBLE_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>";

/** Milliseconds between substitution steps. */
export const SCRAMBLE_STEP_MS = 40;

/**
 * Step ceiling. A label longer than this resolves more than one character per
 * step so the effect stays roughly as long whatever it is applied to — the tick
 * rate never changes, so every decode on the page shares one texture, which is
 * what stops a mixed cascade reading as several unrelated effects.
 */
export const SCRAMBLE_MAX_STEPS = 22;

export interface UseScrambleTextOptions {
  text: string;
  stepMs?: number;
  maxSteps?: number;
  characters?: string;
}

export interface UseScrambleTextResult {
  /** What to render. Equals `text` while idle. */
  display: string;
  /** Start (or restart) the decode. */
  scramble: () => void;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useScrambleText = ({
  text,
  stepMs = SCRAMBLE_STEP_MS,
  maxSteps = SCRAMBLE_MAX_STEPS,
  characters = SCRAMBLE_CHARACTERS,
}: UseScrambleTextOptions): UseScrambleTextResult => {
  const [display, setDisplay] = useState(text);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const stepRef = useRef(0);

  // The ticker reads the framerate live, so a `stepMs` change takes effect
  // without resubscribing. Mirrored in an effect, never during render.
  const stepMsRef = useRef(stepMs);
  useEffect(() => {
    stepMsRef.current = stepMs;
  }, [stepMs]);

  const stop = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // A label that changes mid-decode would resolve to the wrong string.
  useEffect(() => {
    stop();
    setDisplay(text);
  }, [text, stop]);

  const scramble = useCallback(() => {
    // Rapidly mutating glyphs are exactly what this setting exists to suppress.
    if (prefersReducedMotion()) return;

    stop();
    stepRef.current = 0;

    const charsPerStep = Math.max(1, Math.ceil(text.length / maxSteps));

    unsubscribeRef.current = subscribeToTicker(() => {
      const resolved = (stepRef.current += 1) * charsPerStep;

      if (resolved >= text.length) {
        setDisplay(text);
        stop();
        return;
      }

      setDisplay(
        text
          .split("")
          .map((char, index) =>
            // Whitespace is held fixed: on a monospaced face that keeps the
            // word shape and the wrap points identical on every step.
            index < resolved || char === " "
              ? char
              : characters[Math.floor(Math.random() * characters.length)],
          )
          .join(""),
      );
    }, () => stepMsRef.current);
  }, [text, characters, maxSteps, stop]);

  return { display, scramble };
};
