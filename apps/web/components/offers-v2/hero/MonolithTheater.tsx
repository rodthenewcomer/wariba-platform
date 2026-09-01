'use client';

import { motion } from 'motion/react';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import { MARKET_WORDS } from './markets';
import { PathMonolith, type MonolithSpec } from './PathMonolith';

interface MonolithTheaterProps {
  marketIndex: number;
}

/*
 * Absolute, overlapping placement rather than a tidy evenly-spaced row —
 * "three columns" reads as a comparison chart, which is exactly what this
 * rebuild moves away from. ONE sits foreground/lower-left (largest,
 * brightest, highest z-index); FLEX sits behind and higher, toward centre;
 * INSTANT sits deepest and highest, toward the far right — intentionally
 * cropped by the hero section's own `overflow-hidden` on wide viewports.
 * Depth is purely compositional: no size/height difference here is meant
 * to rank the three families, and none of them carries a numbered badge.
 */
const SPECS: readonly (Omit<MonolithSpec, 'reduced' | 'className' | 'bodyHeightClass'> & {
  position: string;
  size: string;
  body: string;
})[] = [
  {
    family: 'ONE',
    color: 'var(--wariba-accent-copper)',
    lifecycle: 'Évaluation → Performance',
    position: 'bottom-0 left-[4%] z-30 w-36 sm:w-40 lg:w-44',
    body: 'h-36 sm:h-44 lg:h-52',
    floatDuration: 6.2,
    floatDelay: 0,
    floatAmplitude: 12,
  },
  {
    family: 'FLEX',
    color: 'var(--wariba-brand-400)',
    lifecycle: 'Évaluation → Activation → Performance',
    position: 'bottom-20 left-[38%] z-20 w-36 sm:w-40 lg:w-44 sm:bottom-24 lg:bottom-28',
    body: 'h-36 sm:h-44 lg:h-52',
    floatDuration: 7.4,
    floatDelay: 0.8,
    floatAmplitude: 16,
  },
  {
    family: 'INSTANT',
    color: 'var(--wariba-accent-cyan)',
    lifecycle: 'Performance directement',
    position:
      'bottom-8 left-[70%] z-10 w-36 sm:w-40 lg:w-44 sm:bottom-12 lg:bottom-16 lg:left-[74%]',
    body: 'h-36 sm:h-44 lg:h-52',
    floatDuration: 6.8,
    floatDelay: 1.5,
    floatAmplitude: 10,
  },
];

/**
 * The right-side product theater — three WARIBA "monoliths" overlapping in
 * depth, plus a thin abstract energy trace that pulses through the scene
 * whenever the hero's market phrase changes. The trace is atmospheric
 * only: no fake price data, no candlesticks — just a signal that the left
 * and right halves of the hero are the same living object.
 *
 * In flow on mobile (the composition stacks below the CTAs); absolutely
 * positioned across the right ~60% of the full hero section on `lg`,
 * pulled toward the centre and allowed to bleed past the viewport edge —
 * `OffresHeroV2`'s own `overflow-hidden` clips it safely.
 */
export function MonolithTheater({ marketIndex }: MonolithTheaterProps) {
  const reduced = useHydratedReducedMotion();
  const marketColor = MARKET_WORDS[marketIndex]!.color;

  return (
    <div className="relative mt-14 h-[46svh] min-h-[300px] w-full lg:absolute lg:inset-y-0 lg:right-[-6%] lg:mt-0 lg:h-auto lg:w-[62vw]">
      {!reduced ? (
        <motion.div
          key={marketIndex}
          aria-hidden="true"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: [0, 0.6, 0], scaleX: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-x-6 top-1/2 z-40 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${marketColor}, transparent)` }}
        />
      ) : null}

      {SPECS.map(({ position, body, ...spec }) => (
        <PathMonolith
          key={spec.family}
          {...spec}
          className={position}
          bodyHeightClass={body}
          reduced={reduced}
        />
      ))}
    </div>
  );
}
