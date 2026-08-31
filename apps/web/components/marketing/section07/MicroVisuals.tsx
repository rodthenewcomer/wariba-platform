'use client';

import { motion } from 'motion/react';

/**
 * Small, single-purpose visual instruments for Analytics' KPI tiles — each
 * metric gets a shape that matches what it means, so four tiles read as
 * four different facts rather than four copies of the same card.
 */

/** A tiny upward path — Gain moyen, Meilleur jour. */
export function MicroSparkline({
  points,
  reduced,
  width = 64,
  height = 22,
}: {
  points: readonly number[];
  reduced: boolean;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1 || 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return { x, y };
  });
  const line = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      className="mt-1.5"
    >
      <motion.polyline
        points={line}
        fill="none"
        stroke="var(--wariba-accent-emerald)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
      <circle cx={last.x} cy={last.y} r={1.75} fill="var(--wariba-accent-emerald)" />
    </svg>
  );
}

/** A short negative-leaning histogram — Perte moyenne's shape, not its exact ledger. */
export function NegativeHistogram({
  bars,
  reduced,
}: {
  bars: readonly number[];
  reduced: boolean;
}) {
  const max = Math.max(...bars);
  return (
    <div className="mt-1.5 flex h-[22px] items-end gap-[3px]" aria-hidden="true">
      {bars.map((value, index) => (
        <motion.span
          key={index}
          className="w-full origin-bottom rounded-[1px] bg-[color:var(--wariba-accent-red)]"
          style={{
            height: `${Math.max(14, (value / max) * 100)}%`,
            opacity: 0.35 + (value / max) * 0.45,
          }}
          initial={reduced ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: reduced ? 0 : 0.32,
            delay: reduced ? 0 : index * 0.05,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

/** A compact row of activity dots — Trades' rhythm, one dot per recent session. */
export function ActivityDots({
  weights,
  reduced,
}: {
  weights: readonly number[];
  reduced: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-1" aria-hidden="true">
      {weights.map((weight, index) => (
        <motion.span
          key={index}
          className="rounded-full bg-[color:var(--wariba-brand-400)]"
          style={{ width: 5, height: 5, opacity: 0.32 + weight * 0.62 }}
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: reduced ? 0 : 0.22,
            delay: reduced ? 0 : index * 0.035,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

/** A short expected-value rail — Expectancy's trend arrow riding a baseline. */
export function ExpectancyRail({ positive, reduced }: { positive: boolean; reduced: boolean }) {
  const color = positive ? 'var(--wariba-accent-emerald)' : 'var(--wariba-accent-red)';
  return (
    <svg viewBox="0 0 64 22" width={64} height={22} aria-hidden="true" className="mt-1.5">
      <line x1="0" x2="64" y1="14" y2="14" stroke="var(--wariba-seam)" strokeWidth="1" />
      <motion.path
        d={positive ? 'M2,18 L34,14 L50,7' : 'M2,7 L34,14 L50,18'}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d={positive ? 'M50,7 L44,7 L50,13 Z' : 'M50,18 L44,18 L50,12 Z'}
        fill={color}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : 0.4 }}
      />
    </svg>
  );
}

/** Profit factor as a two-segment ratio bar against the 1.0 breakeven line. */
export function ProfitFactorRatio({ value, reduced }: { value: number; reduced: boolean }) {
  const clamped = Math.min(3, Math.max(0, value));
  const fillPercent = Math.min(100, (clamped / 3) * 100);
  const breakevenPercent = (1 / 3) * 100;

  return (
    <div className="mt-1.5" aria-hidden="true">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[color:var(--wariba-track)]">
        <motion.div
          className="h-full rounded-full bg-[color:var(--wariba-brand-400)]"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
        <span
          className="absolute top-0 h-full w-px bg-[color:var(--wariba-on-dark-dim)]"
          style={{ left: `${breakevenPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[0.55rem] text-[color:var(--wariba-on-dark-dim)]">vs 1,00 seuil</p>
    </div>
  );
}
