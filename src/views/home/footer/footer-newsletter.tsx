"use client";

import Image from "next/image";
import { useId } from "react";

import { ScrambleText } from "@/components/ui/scramble-text";

import type { FooterNewsletter } from "./footer.types";

export interface FooterNewsletterProps {
  content: FooterNewsletter;
}

/**
 * The newsletter sign-up (Figma 1931:2755).
 *
 * **Built as a real form, and deliberately so.** The frame draws a bordered box
 * with "Your e-mail" in it, an arrow, and a small square beside a consent line —
 * a picture of a control. Rendering that as static text would put a lie in the
 * accessibility tree: a reader would be told there is nothing to fill in.
 * So it is an `input`, a submit `button` and a `checkbox`, labelled properly,
 * with the frame's text as the input's placeholder.
 *
 * **Below the frame the consent line gets its own air.** The frame's 12 units
 * were drawn under a 13px line; here that line is 18px, and the same 12 units
 * left it sitting on the field's border. 24 below `lg`, the frame's own value
 * at it.
 *
 * **Its spacing is floored at the frame value.** The type inside stopped
 * shrinking below 1024, so spacing that kept shrinking read as cramped — the
 * consent line ended up sitting almost on the field. Each gap and the field's
 * own padding now floor at exactly what the 1440 frame draws, so at 1440, where
 * a rem *is* a px, the floor is a no-op and the frame is untouched, and below it
 * the block keeps the air the design gives it. The floor must equal the frame
 * value, never exceed it: `max()` takes the larger, so a floor set above the
 * frame bites at 1440 too.
 *
 * **It has nowhere to send anything yet.** There is no newsletter endpoint, so
 * submitting is prevented rather than left to reload the page with the address
 * in the query string, which is what a form with no action does. Flagged in
 * DESIGN-MAP.md: this needs wiring before it ships.
 */
export const FooterNewsletterForm = ({ content }: FooterNewsletterProps) => {
  const emailId = useId();
  const consentId = useId();

  return (
    <form
      className="flex w-full flex-col gap-6 lg:gap-[max(0.75rem,12px)]"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex w-full flex-col gap-[max(1.25rem,20px)]">
        <label
          htmlFor={emailId}
          className="text-hero-body leading-hero-display text-hero-content"
        >
          <ScrambleText tieProse revealInView revealDelay={120}>
            {content.heading}
          </ScrambleText>
        </label>

        {/* The padding lives on the *input*, not on this box. On the box it was
            dead space: the field itself resolved to 15 units tall, so on a phone
            most of what looks like the field did not focus it. */}
        <div className="flex items-center justify-between gap-4 border border-hero-content pr-[max(1rem,16px)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-hero-content">
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            placeholder={content.placeholder}
            className="min-w-px flex-1 bg-transparent px-[max(1rem,16px)] py-[max(0.875rem,14px)] text-hero-body leading-hero-display text-hero-content uppercase placeholder:text-hero-content focus:outline-none lg:text-hero-chip"
          />
          <button
            type="submit"
            className="shrink-0 cursor-pointer max-lg:tap-area max-lg:[--tap-y:1rem] max-lg:[--tap-x:1rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content"
          >
            <span className="sr-only">Subscribe</span>
            <Image
              src="/assets/ui/arrow-right.svg"
              alt=""
              width={10}
              height={6}
              aria-hidden
              className="h-1.5 w-2.5"
            />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-[max(0.5rem,8px)]">
        <input
          id={consentId}
          type="checkbox"
          name="consent"
          // `-webkit-appearance` as well as the standard property: without the
          // prefixed one Safari keeps drawing its own control, which is a
          // filled white box and reads as a stray square rather than a
          // checkbox. The rest is the site's own language — a hairline that
          // fills when set, and brightens under the pointer like the
          // collections swatches.
          className="size-2.5 shrink-0 cursor-pointer appearance-none border border-hero-rule transition duration-[var(--duration-fast)] ease-entrance max-lg:tap-area max-lg:[--tap-y:0.75rem] max-lg:[--tap-x:0.75rem] [-webkit-appearance:none] checked:bg-hero-content hover:border-hero-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-content"
        />
        <label
          htmlFor={consentId}
          className="min-w-px flex-1 text-hero-body leading-hero-display text-hero-content-faint uppercase [text-box:trim-both_cap_alphabetic] lg:w-[max(11.875rem,190px)] lg:flex-none lg:text-hero-fine"
        >
          <ScrambleText tieProse revealInView revealDelay={180}>
            {content.consent}
          </ScrambleText>
        </label>
      </div>
    </form>
  );
};
