import type { CSSProperties, ReactNode } from 'react';

/**
 * A block that arrives, rather than appearing — with no JavaScript at all.
 *
 * ## Two failed attempts, and why this is the third
 *
 * **`whileInView` with `initial={{ opacity: 0 }}`.** `motion` serialises
 * `initial` into the server-rendered inline style, so every section below the
 * fold shipped as `opacity: 0` and stayed there until hydration. The first
 * full-page screenshot of the rebuilt homepage came back with four of six
 * sections blank. A marketing page whose content needs a bundle to become
 * visible is blank for exactly the people on the worst connections.
 *
 * **An IntersectionObserver that marks the element hidden in a layout
 * effect.** Better — nothing hides without something able to un-hide it — but
 * Chromium's full-page capture expands the layout viewport instead of
 * scrolling, so the observer never fires and the screenshots were still
 * blank. Evidence that cannot be photographed is evidence that cannot be
 * reviewed.
 *
 * **`animation-timeline: view()`.** Elegant and zero-JS — and a page whose
 * scrollport equals its own height has a zero-length scroll range, which makes
 * the timeline inactive and freezes the animation on its first frame. Blank a
 * third time, in exactly the situation the phase requires evidence from.
 *
 * **This one: a plain entry animation on load.** It plays where anyone can
 * actually see it, and below the fold it has finished long before it is
 * scrolled to. What is lost is a fade synchronised to scroll position; what is
 * gained is content that is visible in every browser, with or without
 * JavaScript, in a screenshot, and on a page that does not scroll.
 *
 * `delay` staggers siblings. Keep it small — past ~0.2s the reader notices
 * they are waiting for a page that has already arrived.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** Seconds of visual offset between siblings. Kept small — 0.05 to 0.12. */
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  return (
    <Tag
      data-reveal=""
      className={className}
      style={
        delay
          ? ({ ['--wariba-reveal-delay' as string]: `${delay * 1000}ms` } as CSSProperties)
          : undefined
      }
    >
      {children}
    </Tag>
  );
}
