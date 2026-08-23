'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { EASE_SETTLE } from '../../motion/primitives';

/**
 * A small bar chart, drawn rather than imported.
 *
 * ## Why not a charting library here
 *
 * `lightweight-charts` is a time-series engine and earns its place on the
 * equity curve. A twelve-bar daily P&L strip is twelve rectangles; adding a
 * second charting dependency to draw them would cost more bytes than the
 * component and would still need overriding to obey the design tokens.
 *
 * ## Signed bars grow from the zero line, not from the floor
 *
 * A losing day drawn upward from the bottom of the box looks like a small win.
 * The axis sits where zero is, positives rise and negatives fall, which is the
 * only rendering a trader can read without checking the colour first — and the
 * colour is a second signal, never the only one.
 */

export interface BarDatum {
  label: string;
  value: number;
  /** Overrides the sign-derived colour, for categorical series. */
  tone?: 'emerald' | 'red' | 'indigo' | 'cyan' | 'amber';
}

const TONE: Record<NonNullable<BarDatum['tone']>, string> = {
  emerald: 'var(--wariba-accent-emerald)',
  red: 'var(--wariba-accent-red)',
  indigo: 'var(--wariba-accent-indigo)',
  cyan: 'var(--wariba-accent-cyan)',
  amber: 'var(--wariba-accent-amber)',
};

export function BarSeries({
  data,
  height = 160,
  format,
  ariaSummary,
}: {
  data: readonly BarDatum[];
  height?: number;
  format: (value: number) => string;
  /** A sentence describing the series, for anyone who cannot see it. */
  ariaSummary: string;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return null;

  const values = data.map((datum) => datum.value);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  // Where zero sits inside the plot, as a fraction from the top.
  const zeroRatio = max / span;

  return (
    <figure className="m-0">
      {/* The textual summary §30 asks for: the chart's meaning, available to a
          screen reader without asking it to interpret rectangles. */}
      <figcaption className="sr-only">{ariaSummary}</figcaption>

      <div
        className="relative flex w-full items-stretch gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height }}
      >
        {/* The zero line, drawn once behind the bars. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[color:var(--warix-border-strong)]"
          style={{ top: `${zeroRatio * 100}%` }}
        />

        {data.map((datum, index) => {
          const positive = datum.value >= 0;
          const magnitude = Math.abs(datum.value) / span;
          const color = datum.tone
            ? TONE[datum.tone]
            : positive
              ? 'var(--wariba-accent-emerald)'
              : 'var(--wariba-accent-red)';

          return (
            <div
              key={`${datum.label}-${index}`}
              className="relative flex min-w-[18px] flex-1 flex-col"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              // Each bar is readable on its own — a chart nobody can tab
              // through is a chart a keyboard user cannot read.
              aria-label={`${datum.label} : ${format(datum.value)}`}
              role="img"
            >
              <div className="relative h-full w-full">
                <motion.span
                  className="absolute left-0 right-0 rounded-[3px]"
                  style={{
                    background: color,
                    opacity: hovered === null || hovered === index ? 1 : 0.45,
                    ...(positive
                      ? { bottom: `${(1 - zeroRatio) * 100}%` }
                      : { top: `${zeroRatio * 100}%` }),
                  }}
                  initial={reduced ? false : { height: 0 }}
                  animate={{ height: `${Math.max(magnitude * 100, 1.5)}%` }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.5, ease: EASE_SETTLE, delay: index * 0.015 }
                  }
                />
              </div>

              {hovered === index ? (
                <span
                  role="status"
                  className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface-raised)] px-2 py-1.5 text-[11px] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.8)]"
                >
                  <span className="block font-semibold text-[color:var(--wariba-text-primary)]">
                    {format(datum.value)}
                  </span>
                  <span className="block text-[color:var(--wariba-text-tertiary)]">
                    {datum.label}
                  </span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </figure>
  );
}
