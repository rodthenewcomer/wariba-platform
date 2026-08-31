'use client';

import { useEffect, useRef, useState } from 'react';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import type { Section07Surface } from './primitives';

/**
 * Drives Section 07's self-playing demo, and gets out of the way the moment
 * a visitor touches it.
 *
 * Three rules, in priority order:
 *
 * 1. **User control always wins.** Any interaction — a tab, a time range, a
 *    journal row — sets `hasInteracted` for the rest of the session. Once
 *    set, nothing here schedules another rotation.
 * 2. **Reduced motion means no autoplay at all**, not a shorter one. The
 *    section opens on Trader Hub and stays there until touched.
 * 3. **Off-screen means paused, not stopped.** An `IntersectionObserver`
 *    gates the rotation timer so it never advances a section nobody is
 *    looking at, and resumes it if the visitor scrolls back — but only if
 *    they still haven't interacted.
 */

const ORDER: readonly Section07Surface[] = ['hub', 'analytics', 'journal'];
/** Analytics runs longer — it has the richest chart animation to let play out. */
const DURATION_MS: Record<Section07Surface, number> = {
  hub: 3500,
  analytics: 5000,
  journal: 4500,
};

export function useSurfaceRotation() {
  const reduced = useHydratedReducedMotion();
  const [surface, setSurface] = useState<Section07Surface>('hub');
  const [inView, setInView] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || hasInteracted || !inView) return;
    const timer = window.setTimeout(() => {
      setSurface((current) => {
        const index = ORDER.indexOf(current);
        return ORDER[(index + 1) % ORDER.length]!;
      });
    }, DURATION_MS[surface]);
    return () => window.clearTimeout(timer);
  }, [surface, reduced, hasInteracted, inView]);

  function selectSurface(next: Section07Surface) {
    setHasInteracted(true);
    setSurface(next);
  }

  /** For interactions that don't change the surface — a range button, a trade row. */
  function markInteracted() {
    setHasInteracted(true);
  }

  return {
    sectionRef,
    surface,
    selectSurface,
    markInteracted,
    reduced,
    isAutoPlaying: !hasInteracted,
  };
}
