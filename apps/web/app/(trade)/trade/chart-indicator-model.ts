'use client';

/**
 * The chart indicator registry — W5 §24-§28.
 *
 * A moving average on this chart is **analysis, not truth**. Nothing in this
 * module or the one next to it (`chart-indicator-math.ts`) may be read by risk,
 * order, alert, SL/TP or payout code, and none of it is persisted server-side.
 * That is the whole reason indicator analytics live here in `apps/web` rather
 * than in `@wariba/domain`: moving them into the trading domain to borrow its
 * `Decimal` helpers would have put a display concern behind the same boundary as
 * execution arithmetic and invited exactly the coupling W5 §33/§84 forbids.
 *
 * The registry is a list of *instances*, not hard-coded line components:
 * adding RSI or ATR in a later milestone means adding a `type` and a calculator,
 * not another bespoke series lifecycle in TradeChart.
 */

export const CHART_INDICATOR_TYPES = ['ema', 'sma'] as const;
export type ChartIndicatorType = (typeof CHART_INDICATOR_TYPES)[number];

/**
 * W5 §27 — the periods a trader may ask for.
 *
 * The floor is 2 because a 1-period moving average is the close price, which is
 * already drawn, and a 0- or negative-period average is not a thing. The ceiling
 * is 500 because it is under the 2000-candle retention and above any period a
 * trader plausibly wants — an unbounded period would silently produce a line
 * that never starts.
 */
export const MIN_INDICATOR_PERIOD = 2;
export const MAX_INDICATOR_PERIOD = 500;

/**
 * W5 §28 — the ceiling on simultaneously active indicators.
 *
 * One lightweight-charts line series is created per enabled indicator, so this
 * is a bound on renderer objects and on per-tick work, not a taste judgement.
 * Eight is twice the shipped preset, which leaves room to experiment without
 * letting a stored preference file conjure hundreds of series on hydrate.
 */
export const MAX_ACTIVE_INDICATORS = 8;

export type ChartIndicatorLineWidth = 1 | 2 | 3;

export interface ChartIndicatorStyle {
  /** Resolved hex, never a CSS `var(...)` — lightweight-charts renders to canvas. */
  color: string;
  width: ChartIndicatorLineWidth;
}

export interface ChartIndicator {
  id: string;
  type: ChartIndicatorType;
  period: number;
  enabled: boolean;
  style: ChartIndicatorStyle;
}

/** `EMA 20`, `SMA 100` — the accessible name, and the legend label. */
export function indicatorLabel(indicator: Pick<ChartIndicator, 'type' | 'period'>): string {
  return `${indicator.type.toUpperCase()} ${indicator.period}`;
}

/**
 * W5 §25/§128 — the WariX moving-average library, at WX1's approved scope.
 *
 * Four instances, all four drawn on the chart by default, each distinguishable
 * by more than hue: every one carries its name in the legend and in its
 * accessible label, so a trader who cannot separate the two blues still knows
 * which line is which (§128). SMA 50's red is the chart's stop-loss red, which
 * is why the legend never renders these as bare swatches — a red line on a chart
 * is analysis here and an operational level elsewhere, and only the label
 * disambiguates them.
 *
 * **Why the catalogue is exactly this, and not ten rows.** WX1 also shipped six
 * further periods (EMA 9/50/100/200, SMA 9/200) switched off. They compute
 * correctly, but no product decision ever approved them: they were catalogue
 * surface, and their only visible effect was a phone sheet padded out with rows
 * a trader had not asked for. Final closure §10/§12 draws the line at the
 * approved set. The engine is unchanged and still computes any valid period, so
 * restoring a preset later is one line here rather than a feature.
 *
 * Colours are resolved from `--wariba-chart-indicator-*` tokens at chart
 * creation; these literals are the same fallbacks the rest of TradeChart uses
 * when a token is missing.
 */
export const DEFAULT_CHART_INDICATORS: readonly ChartIndicator[] = [
  { id: 'ema-20', type: 'ema', period: 20, enabled: true, style: { color: '#7FB6E8', width: 1 } },
  { id: 'sma-20', type: 'sma', period: 20, enabled: true, style: { color: '#3673C9', width: 2 } },
  { id: 'sma-50', type: 'sma', period: 50, enabled: true, style: { color: '#C94D4D', width: 1 } },
  { id: 'sma-100', type: 'sma', period: 100, enabled: true, style: { color: '#E8ECF2', width: 1 } },
];

export function isChartIndicatorType(value: unknown): value is ChartIndicatorType {
  return typeof value === 'string' && (CHART_INDICATOR_TYPES as readonly string[]).includes(value);
}

/**
 * W5 §27/§103 — a period is only valid if it is a plain integer in range.
 *
 * `Number.isInteger` rejects `NaN`, `Infinity` and fractions in one check;
 * strings and `null` never reach the comparison. Written as an explicit
 * predicate rather than inline so the storage parser and the settings UI cannot
 * drift apart about what "valid" means.
 */
export function isValidIndicatorPeriod(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_INDICATOR_PERIOD &&
    value <= MAX_INDICATOR_PERIOD
  );
}

function isValidStyle(value: unknown): value is ChartIndicatorStyle {
  if (typeof value !== 'object' || value === null) return false;
  const style = value as Record<string, unknown>;
  return (
    typeof style.color === 'string' &&
    /^#[0-9a-fA-F]{3,8}$/.test(style.color) &&
    (style.width === 1 || style.width === 2 || style.width === 3)
  );
}

/**
 * W5 §40/§55 — validate one stored record, never repair it.
 *
 * Local storage is untrusted input: it survives version changes, hand editing
 * and any other tab on the origin. A record that does not validate is dropped,
 * not patched into something plausible, because a "repaired" indicator is a line
 * the trader never configured.
 */
export function parseChartIndicator(value: unknown): ChartIndicator | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0 || candidate.id.length > 64) {
    return null;
  }
  if (!isChartIndicatorType(candidate.type)) return null;
  if (!isValidIndicatorPeriod(candidate.period)) return null;
  if (typeof candidate.enabled !== 'boolean') return null;
  if (!isValidStyle(candidate.style)) return null;
  return {
    id: candidate.id,
    type: candidate.type,
    period: candidate.period,
    enabled: candidate.enabled,
    style: { color: candidate.style.color, width: candidate.style.width },
  };
}

/**
 * Applies the registry's invariants to a whole list: unique ids, and no more
 * than `MAX_ACTIVE_INDICATORS` **enabled** at once.
 *
 * The cap is on enabled instances rather than on stored ones, because a disabled
 * indicator costs no series and no per-tick work; capping storage instead would
 * throw away a trader's configuration for no benefit. Overflow disables rather
 * than deletes, for the same reason.
 */
export function normalizeChartIndicators(indicators: readonly ChartIndicator[]): ChartIndicator[] {
  const seen = new Set<string>();
  const unique = indicators.filter((indicator) => {
    if (seen.has(indicator.id)) return false;
    seen.add(indicator.id);
    return true;
  });

  let enabledCount = 0;
  return unique.map((indicator) => {
    if (!indicator.enabled) return indicator;
    enabledCount += 1;
    return enabledCount <= MAX_ACTIVE_INDICATORS ? indicator : { ...indicator, enabled: false };
  });
}

/** Whether one more indicator may be switched on right now (§28). */
export function canEnableAnotherIndicator(indicators: readonly ChartIndicator[]): boolean {
  return indicators.filter((indicator) => indicator.enabled).length < MAX_ACTIVE_INDICATORS;
}
