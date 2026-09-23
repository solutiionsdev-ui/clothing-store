"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface NearViewportProps {
  children: ReactNode;
  /**
   * How far ahead to mount, as a share of the viewport's height. The default
   * gives whatever is inside more than a screen of scrolling to build itself in.
   */
  lead?: number;
  className?: string;
}

/**
 * Ceiling on the idle wait. A page that never goes idle must still get its
 * product — a second is far inside the runway `lead` buys.
 */
const IDLE_TIMEOUT_MS = 1000;

/**
 * Run `task` when the main thread is next idle, falling back to a macrotask
 * where `requestIdleCallback` is missing (Safari < 17). Returns a canceller.
 *
 * **Why the mount is deferred at all.** Building a WebGL context is ~100ms of
 * synchronous main-thread work — context creation, the PMREM environment
 * prefilter, the first shader compile. Measured on an M1 at 1440x900, the FAQ
 * product's mount dropped a single 117ms frame, and it landed *during a scroll*
 * because that is when the observer fires. `lead` already buys two screens of
 * runway before anything has to be on screen, so there is no reason to spend
 * that budget inside the frame that happened to cross the trigger line.
 */
const whenIdle = (task: () => void): (() => void) => {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(task, 0);
  return () => clearTimeout(id);
};

/**
 * Mounts its children only once they are near the viewport, and never unmounts
 * them again.
 *
 * **For work that is expensive to *build*, not merely to run.** A render loop
 * can be gated after the fact — start it when the section arrives, stop it when
 * it leaves — but a WebGL context cannot: creating it compiles every shader
 * program and uploads every texture, and that bill is paid the moment the
 * component mounts, wherever the reader happens to be. The FAQ's product sits
 * seven screens down and was charging its share of that to the first paint.
 *
 * `lead` is generous on purpose. The point is not to build late, it is to build
 * *off-screen*: two screens of scrolling is far more than the model needs to
 * decode and warm. Measured on a first traversal, the product is already fully
 * faded in on arrival at any ordinary reading pace, and a seven-screens-per-
 * second flick costs a 200ms fade of a background element rather than a stall.
 *
 * Never unmounts, because tearing a scene down and rebuilding it on the way back
 * up would pay the same bill twice for no gain.
 */
export const NearViewport = ({
  children,
  lead = 2,
  className,
}: NearViewportProps) => {
  const anchor = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = anchor.current;
    if (!node || near) return;

    // No `IntersectionObserver` is a very old browser or a test runner; mount
    // rather than leave a hole where the product should be.
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    let cancelIdle: (() => void) | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        // Off the scroll frame that tripped the trigger — see `whenIdle`.
        cancelIdle = whenIdle(() => {
          cancelIdle = null;
          setNear(true);
        });
      },
      { rootMargin: `${Math.round(lead * 100)}% 0px` },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelIdle?.();
    };
  }, [lead, near]);

  return (
    <div ref={anchor} className={className}>
      {near ? children : null}
    </div>
  );
};
