'use client';

import { motion } from 'motion/react';
import { cx } from '@wariba/ui';
import { useId, type ReactNode } from 'react';
import type { Section07Direction } from './section07-data';

/**
 * Section 07's small shared parts — a tab, a tag, a row, a sparkline.
 *
 * Kept deliberately thin: each of these is a few lines of markup with one
 * visual job, reused across the three surfaces so Trader Hub, Analytics and
 * Journal read as one product's vocabulary rather than three separate ones.
 */

export type Section07Surface = 'hub' | 'analytics' | 'journal';

const SURFACE_LABEL: Record<Section07Surface, string> = {
  hub: 'Trader Hub',
  analytics: 'Analytics',
  journal: 'Journal',
};

const SURFACE_SHORT_LABEL: Record<Section07Surface, string> = {
  hub: 'Hub',
  analytics: 'Analytics',
  journal: 'Journal',
};

export function SurfaceSwitcher({
  active,
  onSelect,
}: {
  active: Section07Surface;
  onSelect: (surface: Section07Surface) => void;
}) {
  const surfaces: Section07Surface[] = ['hub', 'analytics', 'journal'];

  return (
    <div
      role="tablist"
      aria-label="Surface du produit WARIBA"
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] p-1"
    >
      {surfaces.map((surface) => {
        const selected = surface === active;
        return (
          <button
            key={surface}
            id={`section07-tab-${surface}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={SURFACE_LABEL[surface]}
            aria-controls="section07-viewport"
            onClick={() => onSelect(surface)}
            className={cx(
              'relative rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-brand-400)] sm:px-4',
              selected
                ? 'text-white'
                : 'text-[color:var(--wariba-on-dark-dim)] hover:text-[color:var(--wariba-on-dark-muted)]',
            )}
          >
            {selected ? (
              <motion.span
                layoutId="section07-tab-indicator"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-full bg-[color:var(--wariba-brand-500)]"
              />
            ) : null}
            <span className="relative">
              <span className="sm:hidden">{SURFACE_SHORT_LABEL[surface]}</span>
              <span className="hidden sm:inline">{SURFACE_LABEL[surface]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AccountBadge({
  productLabel,
  stateLabel,
}: {
  productLabel: string;
  stateLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-2)] px-3 py-1.5 font-mono text-[0.65rem] font-semibold tracking-[0.08em] text-[color:var(--wariba-on-dark-muted)]">
      <span className="text-[color:var(--wariba-on-dark)]">{productLabel}</span>
      <span aria-hidden="true" className="text-[color:var(--wariba-on-dark-dim)]">
        ·
      </span>
      <span className="text-[color:var(--wariba-brand-300)]">{stateLabel}</span>
    </div>
  );
}

export function DirectionTag({ direction }: { direction: Section07Direction }) {
  const positive = direction === 'LONG';
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[0.6rem] font-bold tracking-[0.08em]',
        positive
          ? 'bg-[color:var(--wariba-accent-emerald-wash)] text-[color:var(--wariba-accent-emerald)]'
          : 'bg-[color:var(--wariba-accent-red-wash)] text-[color:var(--wariba-accent-red)]',
      )}
    >
      {direction}
    </span>
  );
}

/** A signed result, coloured but never colour-only — the sign carries the meaning too. */
export function ResultValue({
  label,
  positive,
  className,
}: {
  label: string;
  positive: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'wariba-figure font-semibold',
        positive
          ? 'text-[color:var(--wariba-accent-emerald)]'
          : 'text-[color:var(--wariba-accent-red)]',
        className,
      )}
    >
      {label}
    </span>
  );
}

/** A minimal price path for a trade row — reads its shape at a glance, nothing more. */
export function MiniSparkline({
  points,
  positive,
  width = 64,
  height = 28,
}: {
  points: readonly number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...points, 0);
  const min = Math.min(...points, 0);
  const span = max - min || 1;

  const line = points
    .map((value, index) => {
      const x = (index / (points.length - 1 || 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const color = positive ? 'var(--wariba-accent-emerald)' : 'var(--wariba-accent-red)';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.65rem] font-semibold tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
      {children}
    </p>
  );
}

/**
 * A radial gauge — the ring under Trader Hub's progression and the donut
 * under Analytics' win rate. One implementation, two colour treatments: a
 * cobalt→ice-blue sweep for the ring, a plain cobalt fill for the donut, so
 * the two read as related but not identical instruments.
 */
export function RadialGauge({
  percent,
  size = 132,
  thickness = 12,
  gradientFrom = 'var(--wariba-brand-400)',
  gradientTo = 'var(--wariba-color-cobalt-300)',
  trackColor = 'var(--wariba-track)',
  label,
  reduced,
  delay = 0,
  children,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  gradientFrom?: string;
  gradientTo?: string;
  trackColor?: string;
  label: string;
  reduced: boolean;
  delay?: number;
  children?: ReactNode;
}) {
  const gradientId = useId();
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: reduced ? 0 : 0.85, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}

/** A compact bento tile: label, a large value, and an optional small delta line. */
export function KpiTile({
  label,
  value,
  valueClassName,
  delta,
  className,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  delta?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'wariba-visual-card min-w-0 p-4 sm:p-5',
        className,
      )}
      data-variant="panel"
    >
      <SectionLabel>{label}</SectionLabel>
      <p
        className={cx(
          'mt-1.5 font-mono text-[clamp(1.15rem,2.6vw,1.7rem)] font-semibold tracking-[-0.01em] text-[color:var(--wariba-on-dark)]',
          valueClassName,
        )}
      >
        {value}
      </p>
      {delta ? (
        <p className="mt-1 text-[0.65rem] text-[color:var(--wariba-on-dark-dim)]">{delta}</p>
      ) : null}
    </div>
  );
}
