import { CANDLE_TIMEFRAMES, type CandleTimeframe } from '@wariba/contracts';

/**
 * WX3 §19 — how much genuine history a cold symbol/timeframe acquires.
 *
 * One table, consulted by the backfill engine, rather than literals scattered
 * across call sites. The numbers balance four things that pull against each
 * other: a chart that is immediately useful, a provider credit budget measured
 * in hundreds per day, a startup that does not stall, and a database that does
 * not grow without bound.
 *
 * Intraday depth is deliberately modest — around two to five screens at a
 * typical zoom — because a trader who wants more scrolls left and gets it from
 * the same engine. Calendar intervals get proportionally far more, because
 * "meaningful multi-year context" is the entire point of selecting `1W` or
 * `1M`, and because a decade of monthly bars is 120 rows, not 120,000.
 */
export const INITIAL_HISTORY_DEPTH_BARS: Record<CandleTimeframe, number> = {
  '1m': 1500,
  '3m': 1000,
  '5m': 1500,
  '15m': 1200,
  '30m': 1000,
  '1h': 1200,
  '4h': 1000,
  // ~8 trading years of daily bars.
  '1D': 2000,
  // ~10 years of weekly structure.
  '1W': 520,
  // ~20 years of calendar months.
  '1M': 240,
};

/**
 * How many older bars one left-scroll page acquires when the cache runs out.
 *
 * Smaller than the initial depth on purpose: paging left is an interactive
 * action, so it must feel immediate, and a trader who keeps scrolling gets
 * another page rather than one enormous stall.
 */
export const PAGINATION_HISTORY_DEPTH_BARS = 500;

/**
 * Largest single provider request WariX will issue.
 *
 * Both selected providers cap a response at 5000 bars, and both charge per
 * request rather than per bar, so a full-size page is also the cheapest way to
 * acquire depth.
 */
export const MAX_PROVIDER_PAGE_BARS = 5000;

/**
 * Ceiling on provider requests for one backfill.
 *
 * A stop condition that does not depend on the provider behaving correctly. A
 * vendor that keeps answering "here is a full page, and yes there is more"
 * forever would otherwise walk the daily credit budget to zero in a single
 * user action.
 */
export const MAX_PROVIDER_REQUESTS_PER_BACKFILL = 8;

export function initialDepthFor(timeframe: CandleTimeframe): number {
  return INITIAL_HISTORY_DEPTH_BARS[timeframe];
}

/** Guards against a timeframe being added to the family without a depth decision. */
export function assertDepthTableComplete(): void {
  for (const timeframe of CANDLE_TIMEFRAMES) {
    if (INITIAL_HISTORY_DEPTH_BARS[timeframe] === undefined) {
      throw new Error(`INITIAL_HISTORY_DEPTH_BARS is missing a depth for ${timeframe}`);
    }
  }
}
