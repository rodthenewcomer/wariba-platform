'use client';

import { memo } from 'react';
import type { MarketCandle } from '@wariba/contracts';
import type { IndicatorLegendEntry } from './chart-indicator-engine';

/**
 * The chart's compact legend — W5 §39/§64/§65/§128.
 *
 * Two rows of small type in the plot's top-left corner, `pointer-events-none` so
 * they can never intercept a crosshair, a drag or a long press. Not a floating
 * card (§126): the chart dominates, and the legend is annotation on top of it.
 *
 * **Colour is never the only identifier** (§128). Every indicator row carries
 * its name — `EMA 20`, `SMA 50` — beside its swatch, which matters here because
 * SMA 50's red is also the chart's stop-loss red and the two must not be
 * confusable.
 *
 * **No volume, no VWAP, no daily percentage** (§65/§142). The feed carries no
 * authoritative volume, so none is displayed; a plausible-looking number would
 * be a fabrication.
 */

export interface ChartLegendProps {
  /** The candle under the crosshair, or the live candle when the pointer is away. */
  candle: MarketCandle | null;
  /** Digits the instrument is quoted at, so O/H/L/C read the way its price does. */
  pricePrecision: number | null;
  indicators: readonly IndicatorLegendEntry[];
}

function formatPrice(value: string, precision: number | null): string {
  if (precision === null) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(precision) : value;
}

function formatIndicator(value: number | null, precision: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return precision === null ? String(value) : value.toFixed(precision);
}

export const ChartLegend = memo(function ChartLegend({
  candle,
  pricePrecision,
  indicators,
}: ChartLegendProps) {
  if (candle === null && indicators.length === 0) return null;

  return (
    <div
      data-testid="chart-legend"
      className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-0.5 text-[length:var(--wariba-font-size-label-sm)] leading-tight"
    >
      {candle && (
        <div
          data-testid="chart-ohlc-legend"
          className="wariba-data flex gap-2 text-[color:var(--wariba-text-secondary)]"
        >
          {(
            [
              ['O', candle.open],
              ['H', candle.high],
              ['L', candle.low],
              ['C', candle.close],
            ] as const
          ).map(([label, value]) => (
            <span key={label}>
              <span className="text-[color:var(--wariba-text-tertiary)]">{label}</span>{' '}
              <span className="text-[color:var(--wariba-theme-text)]">
                {formatPrice(value, pricePrecision)}
              </span>
            </span>
          ))}
        </div>
      )}
      {indicators.length > 0 && (
        <div data-testid="chart-indicator-legend" className="flex flex-wrap gap-x-3 gap-y-0.5">
          {indicators.map((entry) => (
            <span key={entry.id} className="wariba-data flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-0.5 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[color:var(--wariba-text-tertiary)]">{entry.label}</span>
              <span className="text-[color:var(--wariba-text-secondary)]">
                {formatIndicator(entry.value, pricePrecision)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
