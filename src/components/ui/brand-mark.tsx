import { brandName, brandWordmark } from "@/lib/brand";

export interface BrandMarkProps {
  /** One line (header, footer) or two (hero backdrop, preloader). */
  variant?: "inline" | "stacked";
  /**
   * Hide it from assistive tech — for the hero backdrop and the preloader,
   * where the name is not what the element is for.
   */
  decorative?: boolean;
  className?: string;
}

/** The viewBox's units — one line of 100-unit type. */
const FONT_SIZE = 100;
/** Width allowed per character. The mono face's advance is a little under this,
 * so `textLength` only ever adds spacing and never squeezes glyphs together. */
const CHAR_ADVANCE = 64;
const LINE_HEIGHT = 112;
/** Cap height of the uppercase lines, so the box hugs the letters. */
const CAP_HEIGHT = 72;

/**
 * The site's name as a text logo — a placeholder until real artwork exists.
 *
 * An inline SVG, so it scales to whatever box it is given the way an image
 * would: size it with a height (`h-4 w-auto`) or fill a box (`h-full w-full`).
 * The longest line sets the measure; shorter lines centre under it.
 * Colour comes from `currentColor`, the face from `font-mono`.
 */
export const BrandMark = ({
  variant = "stacked",
  decorative = false,
  className = "",
}: BrandMarkProps) => {
  const lines: readonly string[] = brandWordmark[variant];
  const width = Math.max(...lines.map((line) => line.length)) * CHAR_ADVANCE;
  const height = (lines.length - 1) * LINE_HEIGHT + CAP_HEIGHT;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      fill="currentColor"
      className={`font-mono ${className}`}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": brandName })}
    >
      {lines.map((line, index) => (
        <text
          key={line}
          x={width / 2}
          y={index * LINE_HEIGHT + CAP_HEIGHT}
          fontSize={FONT_SIZE}
          textAnchor="middle"
          // Only the longest line is stretched to the measure; shorter ones
          // keep their natural spacing and centre under it.
          {...(line.length * CHAR_ADVANCE === width && {
            textLength: width,
            lengthAdjust: "spacing",
          })}
        >
          {line}
        </text>
      ))}
    </svg>
  );
};
