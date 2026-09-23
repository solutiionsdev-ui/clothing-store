/**
 * When a below-the-fold reveal is allowed to start.
 *
 * An `IntersectionObserver` with no margin fires the instant one pixel of the
 * element crosses the viewport's bottom edge. For a reveal that is too early:
 * the spring has a delay, the spring itself takes time, and on a normal scroll
 * the whole animation is over before the element is anywhere near read. What
 * the reader sees is a card that was simply already there.
 *
 * Holding the trigger back means the element is properly on screen before
 * anything starts.
 */
export const REVEAL_ROOT_MARGIN = "0px 0px -64px 0px";

/**
 * Watch an element and call back once it should reveal.
 *
 * **Two observers, whichever fires first**, and that is the whole point of this
 * helper. A hold-back alone has a failure mode that bit this project three
 * times: anything anchored near the bottom of a viewport-tall section — or of
 * the page — can come to rest *closer* to the bottom edge than the margin is
 * deep, and then it never reveals at all. The footer's copyright sits 40px clear
 * at rest against a 64px band, and simply never appeared.
 *
 * So: one observer with the hold-back, for the ordinary case of something
 * scrolling up into view, and one with no margin at full ratio, for anything
 * that is completely on screen and therefore has no business still being
 * hidden. Neither can be tightened into the other — a margin small enough to
 * clear every bottom anchor is too small to stop early reveals, which is the
 * trade this sidesteps.
 *
 * Returns a teardown; the callback fires at most once.
 */
export const observeReveal = (
  element: Element,
  onReveal: () => void,
): (() => void) => {
  let fired = false;
  const observers: IntersectionObserver[] = [];

  const fire = () => {
    if (fired) return;
    fired = true;
    for (const observer of observers) observer.disconnect();
    onReveal();
  };

  const watch = (options: IntersectionObserverInit) => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fire();
    }, options);
    observer.observe(element);
    observers.push(observer);
  };

  watch({ rootMargin: REVEAL_ROOT_MARGIN });
  watch({ threshold: 1 });

  return () => {
    for (const observer of observers) observer.disconnect();
  };
};
