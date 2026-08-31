'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';

/**
 * One master timeline for the whole section, instead of four cards each
 * deciding for themselves when to animate.
 *
 * A visitor should be able to *feel* 01 → 02 → 03 → 04: each phase's scene
 * starts only once the previous one has had its moment, the connector
 * between them fires right as the baton passes, and the CTA's border traces
 * once the whole story has actually finished — not the instant the section
 * scrolls into view. `setTimeout` after a single `useInView` does that
 * without any FLIP machinery: everything downstream just reads `activeIndex`.
 */

const PHASE_START_MS = [0, 1000, 2200, 3400] as const;
const CONNECTOR_TRAVEL_MS = 550;
const SEQUENCE_END_MS = 4600;

export function useJourneySequence() {
  const reduced = useHydratedReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [ctaTracing, setCtaTracing] = useState(false);

  useEffect(() => {
    if (reduced) {
      setActiveIndex(3);
      return;
    }
    if (!inView) return;

    const timers = PHASE_START_MS.map((delay, index) =>
      window.setTimeout(() => setActiveIndex(index), delay),
    );
    const ctaTimer = window.setTimeout(() => setCtaTracing(true), SEQUENCE_END_MS);

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.clearTimeout(ctaTimer);
    };
  }, [inView, reduced]);

  return {
    sectionRef,
    reduced,
    inView,
    /** Phase `index` has begun (and stays begun — indices never go backward). */
    started: (index: number) => activeIndex >= index,
    /** Phase `index` is the one currently receiving the connector's pulse. */
    isActive: (index: number) => activeIndex === index,
    connectorTravelMs: CONNECTOR_TRAVEL_MS,
    /** Delay, from section-in-view, at which connector `index` should fire. */
    connectorDelayMs: (index: number) => Math.max(0, PHASE_START_MS[index + 1]! - CONNECTOR_TRAVEL_MS),
    ctaTracing,
  };
}
