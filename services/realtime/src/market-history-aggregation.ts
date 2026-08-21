import { bucketEndSeconds, bucketStartSeconds, type CandleTimeframe } from '@wariba/contracts';
import type { HistoricalBar } from '@wariba/adapters';
import Decimal from 'decimal.js';

/**
 * WX3 — deterministic derivation of a timeframe neither selected provider
 * serves natively.
 *
 * In practice this is `3m` and nothing else: Twelve Data publishes 1/5/15/30/45
 * minute bars and OANDA publishes M1/M2/M4/M5/M10/M15/M30, so three minutes is
 * the single interval in WariX's professional family that has to be built. The
 * module is written generally anyway because "which intervals are native" is a
 * provider fact that will change when a provider does, and a rule that only
 * works for one hardcoded pair is a rule that silently stops being applied.
 *
 * The hard constraint is §23: a derived bar is only honest when the window it
 * covers was genuinely fetched. A three-minute candle assembled from the two
 * one-minute bars that happen to be in memory, while the third minute was
 * simply never requested, is a fabricated high and a fabricated low presented
 * as market truth.
 */

/** Source timeframe a target can be built from, when the target is not native. */
export const DERIVATION_SOURCE: Partial<Record<CandleTimeframe, CandleTimeframe>> = {
  '3m': '1m',
  // Only consulted when the active provider reports `4h` as non-native. Twelve
  // Data does, because its FX four-hour bars are anchored to the New York
  // session rather than the UTC epoch; OANDA does not, because its H4 honours
  // the UTC `dailyAlignment` WariX requests.
  '4h': '1h',
};

export interface DerivationCoverage {
  /** Inclusive epoch seconds — the oldest instant genuinely fetched. */
  from: number;
  /** Exclusive epoch seconds — the newest instant genuinely fetched. */
  to: number;
}

export interface DerivedBarsResult {
  bars: HistoricalBar[];
  /** Buckets skipped because the fetched window did not fully contain them. */
  skippedIncomplete: number;
}

/**
 * Builds `target` bars from genuine `source` bars.
 *
 * A bucket is emitted only when `[bucketStart, bucketEnd)` lies entirely
 * inside `coverage` **and** at least one source bar falls in it. The second
 * condition is not a weaker form of the first: inside a fetched window, a
 * missing minute means the market produced no trade in that minute, which is
 * an absence of activity rather than an absence of data. Fabricating a flat
 * bar for it would invent a price that never printed — the same mistake as
 * fill-forward, one level down.
 *
 * Open is the first source open, close the last source close, high and low the
 * decimal extremes. Volume adds up only when every contributing bar carries
 * volume with the same semantics; mixing tick volume with absent volume would
 * produce a total that understates by an unknown amount.
 */
export function deriveBars(
  sourceBars: readonly HistoricalBar[],
  sourceTimeframe: CandleTimeframe,
  targetTimeframe: CandleTimeframe,
  coverage: DerivationCoverage,
): DerivedBarsResult {
  const buckets = new Map<number, HistoricalBar[]>();
  for (const bar of sourceBars) {
    const startTime = bucketStartSeconds(bar.startTime * 1000, targetTimeframe);
    const existing = buckets.get(startTime);
    if (existing === undefined) {
      buckets.set(startTime, [bar]);
      continue;
    }
    existing.push(bar);
  }

  const bars: HistoricalBar[] = [];
  let skippedIncomplete = 0;
  for (const [startTime, members] of [...buckets.entries()].sort(
    ([left], [right]) => left - right,
  )) {
    const endTime = bucketEndSeconds(startTime, targetTimeframe);
    if (startTime < coverage.from || endTime > coverage.to) {
      skippedIncomplete += 1;
      continue;
    }
    const ordered = [...members].sort((left, right) => left.startTime - right.startTime);
    const first = ordered[0];
    const last = ordered.at(-1);
    if (first === undefined || last === undefined) continue;
    bars.push({
      startTime,
      open: first.open,
      high: ordered.reduce(
        (highest, bar) => (new Decimal(bar.high).greaterThan(highest) ? bar.high : highest),
        first.high,
      ),
      low: ordered.reduce(
        (lowest, bar) => (new Decimal(bar.low).lessThan(lowest) ? bar.low : lowest),
        first.low,
      ),
      close: last.close,
      volume: sumVolume(ordered),
    });
  }
  void sourceTimeframe;
  return { bars, skippedIncomplete };
}

function sumVolume(bars: readonly HistoricalBar[]): HistoricalBar['volume'] {
  const first = bars[0]?.volume;
  if (first === undefined || first === null) return null;
  let total = new Decimal(0);
  for (const bar of bars) {
    if (bar.volume === null || bar.volume.semantics !== first.semantics) return null;
    total = total.plus(bar.volume.value);
  }
  return { value: total.toFixed(0), semantics: first.semantics };
}

/**
 * How many source bars must be fetched to cover `count` target bars.
 *
 * Used to size the provider request so a `3m` cold start asks for the right
 * amount of `1m` data in one go rather than discovering the shortfall a page
 * at a time.
 */
export function sourceBarsNeeded(
  targetTimeframe: CandleTimeframe,
  sourceTimeframe: CandleTimeframe,
  targetCount: number,
): number {
  const targetSpan = bucketEndSeconds(0, targetTimeframe);
  const sourceSpan = bucketEndSeconds(0, sourceTimeframe);
  if (sourceSpan <= 0) return targetCount;
  return Math.ceil((targetSpan / sourceSpan) * targetCount);
}
