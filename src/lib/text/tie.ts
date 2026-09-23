/**
 * Bind the small words to what follows them.
 *
 * A line that ends on "and", "to" or "the" leaves the reader holding a word
 * that means nothing on its own until the next line arrives. In a proportional
 * face it is a nuisance; in this one it is louder, because the type is
 * monospaced and every such word is a visible stub of identical cells at the
 * edge of the column. Measured at 390 the page had 23 of them.
 *
 * The fix is the typesetter's, not the layout's: a non-breaking space after the
 * word, so it travels with the one it belongs to. Nothing here changes what the
 * text says, and a monospaced face means the glued pair occupies exactly the
 * cells it did before — no reflow beyond the wrap point that was the point.
 *
 * **Only function words.** Articles, conjunctions, prepositions and the short
 * copulas — the words that are grammar rather than content. "FIT" is three
 * letters too and belongs at the end of a line as much as anywhere else.
 *
 * A word already carrying sentence punctuation is left alone: the break after
 * it is a pause the reader wants.
 */
const TIED = new Set([
  "a", "an", "the",
  "and", "or", "but", "as", "if", "so",
  "of", "to", "in", "on", "at", "by", "for", "with", "from", "into",
  "over", "under", "per", "via", "no", "not",
  "without", "within", "onto", "upon", "against", "across", "around",
  "after", "before", "through", "during", "between",
  "is", "are", "was", "be", "we", "it", "its",
  "my", "our", "your", "their", "his", "her", "i",
  "can", "may", "do", "does", "did", "has", "have", "had", "will",
  "&",
]);

const bare = (word: string) => word.toLowerCase().replace(/[^a-z&]/g, "");

/**
 * @param maxPair - the longest run, in characters, a binding may produce. A
 * narrow column cannot afford a long one: gluing "without compromising" costs
 * twenty characters of a line that holds twenty-nine, and the line above it
 * ends short — which reads worse than the hanging word the binding was there
 * to prevent. A wide column has the room and takes no ceiling.
 */
export const tie = (text: string, maxPair = Infinity): string => {
  const parts = text.split(/([ \t]+)/);
  const out = parts.slice();
  for (let i = 0; i < parts.length; i += 2) {
    const word = parts[i];
    const gap = parts[i + 1];
    const next = parts[i + 2];
    if (!gap || !next) continue;
    if (/[.,;:!?]$/.test(word)) continue;
    const key = bare(word);
    if (!key || !TIED.has(key)) continue;
    // **No chains on a narrow column.** A function word bound to another
    // function word runs three and four words into one token — "can be
    // returned" — and a token that long carries the whole phrase down a line.
    // Where there is no ceiling there is room for the chain, and breaking it
    // would change lines the wide layouts have already been read against.
    if (maxPair !== Infinity && TIED.has(bare(next))) continue;
    if (word.length + 1 + next.length > maxPair) continue;
    out[i] = `${word} `;
    out[i + 1] = "";
  }
  return out.join("");
};

/**
 * Break a line only where one sentence ends and the next begins.
 *
 * The hero's claim is two sentences to a line. Left to wrap where it liked, it
 * split "WEATHER-RESISTANT. THERMAL / INSULATION." on a phone — a break in the
 * middle of the second sentence, with the first one's full stop stranded
 * mid-line. The only break that reads is the one the copy already has, so every
 * other space is made non-breaking and the full stop is left as the sole hinge.
 */
export const keepSentences = (text: string): string =>
  text.replace(/(\S+)([ \t]+)/g, (whole, word: string) =>
    /[.,;:!?]$/.test(word) ? whole : `${word}\u00A0`,
  );
