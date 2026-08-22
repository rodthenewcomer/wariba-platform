'use client';

import { memo, useState } from 'react';
import { WariXChevronDownIcon, WariXChevronUpIcon, WariXInlineStatus } from '@wariba/ui';
import type { CandleTimeframe, MarketCandle } from '@wariba/contracts';
import type { IndicatorLegendEntry } from './chart-indicator-engine';
import type { ChartStatusLineSettings } from './chart-settings-model';
import type {
  WariXMarketDisplayPresentation,
  WariXMarketDisplayState,
} from './market-display-state';

/**
 * The chart status line — §14.
 *
 * What changed and why. WX1 drew two anonymous rows in the plot's top-left: an
 * OHLC strip and a wrapped run of indicator names. Read against the reference,
 * two things were missing and one was wrong. Missing: the chart never said
 * *which instrument and which interval* it was — that lived only in a module
 * header the eye is not on while reading candles — and it never showed the
 * bar's own change. Wrong: the indicators wrapped into a horizontal run, so with
 * four series the names ran across the candles instead of stacking beside them.
 *
 * The reference's answer, adopted here: an identity row (ticker · interval ·
 * market state) carrying the OHLC and the bar change, then **one row per
 * indicator**, each with its own inputs and its own value in its own colour.
 * Stacked, the block is four narrow lines down the left gutter rather than one
 * wide band across the plot.
 *
 * **Bar change is arithmetic on two observed candles**, not a market statistic.
 * It is this bar's close against the previous bar's close, both of which are on
 * the chart. WariX still shows no daily percentage and no volume, because the
 * feed carries neither and a plausible number would be a fabrication — the
 * Settings modal says so where a trader would look for them.
 */

export interface BarChange {
  /** Signed absolute move, at the instrument's precision. */
  absolute: string;
  /** Signed percentage of the previous close. */
  percent: string;
  direction: 'up' | 'down' | 'flat';
}

export interface ChartStatusLineProps {
  symbol: string;
  timeframe: CandleTimeframe;
  marketPresentation: WariXMarketDisplayPresentation;
  /** The candle under the crosshair, or the live candle when the pointer is away. */
  candle: MarketCandle | null;
  pricePrecision: number | null;
  change: BarChange | null;
  indicators: readonly IndicatorLegendEntry[];
  settings: ChartStatusLineSettings;
  /** Phone presentation: one dense row, names only, overflow counted. */
  compact?: boolean;
  /** True when the visibility menu has hidden the indicators — stated, not silently empty. */
  indicatorsHidden?: boolean;
}

/** Preserve the canonical case so one minute (`1m`) and one month (`1M`) stay distinct. */
export function timeframeLabel(timeframe: CandleTimeframe): string {
  return timeframe;
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

/**
 * Bar change, from two closes.
 *
 * Returns null rather than zero when there is no previous bar: the first candle
 * of a session has no change, and printing `+0.00000 (+0.00 %)` would assert
 * that it did not move when the truth is that there is nothing to compare it to.
 */
export function computeBarChange(
  candle: MarketCandle | null,
  previousClose: string | null,
  precision: number | null,
): BarChange | null {
  if (candle === null || previousClose === null) return null;
  const close = Number(candle.close);
  const previous = Number(previousClose);
  if (!Number.isFinite(close) || !Number.isFinite(previous) || previous === 0) return null;
  const delta = close - previous;
  const percent = (delta / previous) * 100;
  const sign = delta > 0 ? '+' : '';
  return {
    absolute: `${sign}${precision === null ? delta : delta.toFixed(precision)}`,
    percent: `${sign}${percent.toFixed(2)} %`,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  };
}

const CHANGE_TONE: Record<BarChange['direction'], string> = {
  up: 'text-[color:var(--wariba-component-workstation-trading-buy)]',
  down: 'text-[color:var(--wariba-component-workstation-trading-sell)]',
  flat: 'text-[color:var(--wariba-component-workstation-text-secondary)]',
};

const STATUS_DOT: Record<WariXMarketDisplayState, string> = {
  LIVE: 'bg-[color:var(--wariba-component-workstation-trading-buy)]',
  MARKET_CLOSED: 'bg-[color:var(--wariba-component-workstation-text-tertiary)]',
  DELAYED: 'bg-[color:var(--wariba-component-workstation-market-current)]',
  STALE: 'bg-[color:var(--wariba-component-workstation-trading-warning)]',
  HISTORY_ONLY: 'bg-[color:var(--wariba-component-workstation-market-current)]',
  UNAVAILABLE: 'bg-[color:var(--wariba-component-workstation-trading-sell)]',
};

/** A phone plot fits two series names beside the identity row; the rest are counted. */
const COMPACT_LEGEND_LIMIT = 2;

export const ChartStatusLine = memo(function ChartStatusLine({
  symbol,
  timeframe,
  marketPresentation,
  candle,
  pricePrecision,
  change,
  indicators,
  settings,
  compact = false,
  indicatorsHidden = false,
}: ChartStatusLineProps) {
  const [expanded, setExpanded] = useState(true);
  const shown = compact ? indicators.slice(0, COMPACT_LEGEND_LIMIT) : expanded ? indicators : [];
  const hidden = indicators.length - shown.length;

  return (
    <div
      data-testid="chart-status-line"
      className="pointer-events-none absolute left-2 top-1.5 z-10 flex max-w-[calc(100%-1rem)] flex-col gap-px text-[length:var(--wariba-component-workstation-type-label)] leading-tight"
    >
      <div
        data-testid="chart-identity-line"
        className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
      >
        {settings.title && (
          <span className="flex items-baseline gap-1.5">
            <span className="font-semibold tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-primary)]">
              {symbol}
            </span>
            <span
              aria-hidden="true"
              className="text-[color:var(--wariba-component-workstation-text-tertiary)]"
            >
              ·
            </span>
            <span className="wariba-data font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)]">
              {timeframeLabel(timeframe)}
            </span>
          </span>
        )}
        {settings.marketStatus && (
          <span
            className={`h-1.5 w-1.5 shrink-0 self-center rounded-full ${STATUS_DOT[marketPresentation.state]}`}
            role="img"
            aria-label={marketPresentation.label}
          />
        )}
        {settings.ohlc && candle && (
          <span data-testid="chart-ohlc-legend" className="wariba-data flex gap-2 tabular-nums">
            {(
              [
                ['O', candle.open],
                ['H', candle.high],
                ['L', candle.low],
                ['C', candle.close],
              ] as const
            ).map(([label, value]) => (
              <span key={label}>
                <span className="text-[color:var(--wariba-component-workstation-text-tertiary)]">
                  {label}
                </span>{' '}
                <span className="text-[color:var(--wariba-component-workstation-text-primary)]">
                  {formatPrice(value, pricePrecision)}
                </span>
              </span>
            ))}
          </span>
        )}
        {settings.barChange && change && (
          <span
            data-testid="chart-bar-change"
            className={`wariba-data tabular-nums ${CHANGE_TONE[change.direction]}`}
          >
            {change.absolute} ({change.percent})
          </span>
        )}
      </div>

      {settings.marketStatus && marketPresentation.state !== 'LIVE' ? (
        <WariXInlineStatus
          compact
          title={marketPresentation.label}
          tone={marketPresentation.tone}
          className="pointer-events-none mt-1 w-fit max-w-[min(19rem,calc(100vw-2rem))]"
        />
      ) : null}

      {indicatorsHidden ? (
        <span className="text-[color:var(--wariba-component-workstation-text-tertiary)]">
          Indicateurs masqués
        </span>
      ) : shown.length > 0 && (settings.indicatorTitles || settings.indicatorValues) ? (
        <div
          data-testid="chart-indicator-legend"
          className={compact ? 'flex flex-nowrap gap-x-3' : 'flex flex-col gap-px'}
        >
          {shown.map((entry) => (
            <span key={entry.id} className="wariba-data flex items-center gap-1.5 tabular-nums">
              <span
                aria-hidden="true"
                className="h-[3px] w-3 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {settings.indicatorTitles && (
                <span className="text-[color:var(--wariba-component-workstation-text-secondary)]">
                  {entry.label}
                </span>
              )}
              {settings.indicatorValues && !compact && (
                <span style={{ color: entry.color }}>
                  {formatIndicator(entry.value, pricePrecision)}
                </span>
              )}
            </span>
          ))}
          {/* The overflow is counted, never dropped silently: a trader can see at
              a glance that two more averages are running, and the full set is one
              tap away in the Indicators sheet. */}
          {hidden > 0 ? (
            <span
              className="wariba-data self-center text-[color:var(--wariba-component-workstation-text-tertiary)]"
              title={`${hidden} indicateur${hidden > 1 ? 's' : ''} supplémentaire${hidden > 1 ? 's' : ''} actif${hidden > 1 ? 's' : ''}`}
            >
              +{hidden}
            </span>
          ) : null}
        </div>
      ) : null}

      {!compact && indicators.length > 0 && !indicatorsHidden ? (
        <button
          type="button"
          aria-label={
            expanded ? 'Replier la légende des indicateurs' : 'Déplier la légende des indicateurs'
          }
          aria-expanded={expanded}
          data-testid="chart-legend-collapse"
          onClick={() => setExpanded((current) => !current)}
          className="pointer-events-auto mt-0.5 flex h-5 w-7 items-center justify-center rounded-[4px] border border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-popover)]/80 text-[color:var(--wariba-component-workstation-text-secondary)] transition-colors hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
        >
          {expanded ? (
            <WariXChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <WariXChevronDownIcon className="h-3.5 w-3.5" />
          )}
        </button>
      ) : null}
    </div>
  );
});
