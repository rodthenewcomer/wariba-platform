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

/*
 * The full-length timeline was tuned for a desktop visitor who has already
 * stopped scrolling to look at the section. A mobile visitor's scroll rarely
 * pauses that long, and every phase's layout box is reserved from the start
 * (see `PhaseCard` — unstarted phases sit at `opacity: 0`, not `display:
 * none`, to avoid layout shift), so a 4.6s cascade reads as several screens
 * of near-empty card on a phone that's already moved on. Compressed here
 * rather than shortened by trimming content — same four beats, felt faster.
 */
const PHASE_START_MS_MOBILE = [0, 380, 760, 1140] as const;
const CONNECTOR_TRAVEL_MS_MOBILE = 320;
const SEQUENCE_END_MS_MOBILE = 1900;

const MOBILE_QUERY = '(max-width: 767px)';

export function useJourneySequence() {
  const reduced = useHydratedReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [ctaTracing, setCtaTracing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    setIsMobile(query.matches);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const phaseStartMs = isMobile ? PHASE_START_MS_MOBILE : PHASE_START_MS;
  const connectorTravelMs = isMobile ? CONNECTOR_TRAVEL_MS_MOBILE : CONNECTOR_TRAVEL_MS;
  const sequenceEndMs = isMobile ? SEQUENCE_END_MS_MOBILE : SEQUENCE_END_MS;

  useEffect(() => {
    if (reduced) {
      setActiveIndex(3);
      return;
    }
    if (!inView) return;

    const timers = phaseStartMs.map((delay, index) =>
      window.setTimeout(() => setActiveIndex(index), delay),
    );
    const ctaTimer = window.setTimeout(() => setCtaTracing(true), sequenceEndMs);

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.clearTimeout(ctaTimer);
    };
  }, [inView, reduced, phaseStartMs, sequenceEndMs]);

  return {
    sectionRef,
    reduced,
    inView,
    /** Phase `index` has begun (and stays begun — indices never go backward). */
    started: (index: number) => activeIndex >= index,
    /** Phase `index` is the one currently receiving the connector's pulse. */
    isActive: (index: number) => activeIndex === index,
    connectorTravelMs,
    /** Delay, from section-in-view, at which connector `index` should fire. */
    connectorDelayMs: (index: number) => Math.max(0, phaseStartMs[index + 1]! - connectorTravelMs),
    ctaTracing,
  };
}
