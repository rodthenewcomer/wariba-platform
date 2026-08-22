import { bucketEndSeconds, type CandleTimeframe } from './market-candles';

/**
 * WX3.1 — the canonical spot-FX trading week.
 *
 * This exists because an audit of genuine Twelve Data EURUSD `1m` bars found
 * the median one-minute range jumping from 1.0 pip to 3.4 pips at exactly
 * 21:00 UTC on a Friday, with individual bars reaching 16.5 pips, and the
 * provider continuing to publish minute bars right through Saturday morning.
 *
 * Nothing about that data is wrong. 21:00 UTC in August is 17:00 in New York,
 * which is the weekly close: liquidity leaves, spreads widen, and whatever
 * indicative quotes remain are genuine quotes from a market that is shut. The
 * defect was that WariX drew them on the same footing as session data while its
 * own gap classifier simultaneously called that window closed — the system
 * disagreeing with itself about what a market hour is.
 *
 * So there is now one definition, here, and both the classifier and the display
 * filter read it.
 *
 * The boundary is computed in `America/New_York` rather than approximated in
 * UTC. The FX week is defined in exchange-local terms — Sunday 17:00 ET to
 * Friday 17:00 ET — and that is 21:00 UTC in northern summer but 22:00 UTC in
 * winter. A fixed UTC hour is wrong for half the year in one direction or the
 * other, and "wrong for half the year" is exactly the class of defect that
 * produced the misaligned `4h` bars WX3 had to reject.
 */

/** The hour, in New York local time, at which the FX day and week roll over. */
const MARKET_ROLLOVER_HOUR_NY = 17;

const NEW_YORK_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour12: false,
  weekday: 'short',
  hour: '2-digit',
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface NewYorkInstant {
  weekday: number;
  hour: number;
}

/**
 * New York weekday and hour for an instant.
 *
 * `Intl` rather than a fixed offset, because the whole point is to get the two
 * annual daylight-saving transitions right. Hour 24 appears in the `en-US`
 * hour-cycle for midnight and is normalized to 0.
 */
function newYorkInstant(epochSeconds: number): NewYorkInstant {
  const parts = NEW_YORK_PARTS.formatToParts(new Date(epochSeconds * 1000));
  let weekday = 0;
  let hour = 0;
  for (const part of parts) {
    if (part.type === 'weekday') weekday = WEEKDAY_INDEX[part.value] ?? 0;
    if (part.type === 'hour') hour = Number(part.value) % 24;
  }
  return { weekday, hour };
}

/**
 * True when spot FX is shut: Friday 17:00 ET through Sunday 17:00 ET.
 *
 * Holidays are deliberately not modelled. A thin Christmas session is still a
 * session, and inventing an exchange holiday calendar for a 24×5 OTC market
 * would be guessing dressed up as precision.
 */
export function isWithinWeeklyClosure(epochSeconds: number): boolean {
  const { weekday, hour } = newYorkInstant(epochSeconds);
  if (weekday === 6) return true;
  if (weekday === 5 && hour >= MARKET_ROLLOVER_HOUR_NY) return true;
  if (weekday === 0 && hour < MARKET_ROLLOVER_HOUR_NY) return true;
  return false;
}

export const BAR_SESSION_STATES = ['regular', 'out_of_session'] as const;
export type BarSessionState = (typeof BAR_SESSION_STATES)[number];

/**
 * Which side of the session a bar belongs to.
 *
 * A bar is out of session only when **every** instant it covers is closed
 * market. Any overlap with the trading week makes it session data, because a
 * bucket that straddles the Friday close genuinely contains real trading and
 * splitting it would mean inventing two bars where the provider published one.
 *
 * The rule is written once for every interval rather than special-cased per
 * timeframe. A one-minute bar resolves on its opening instant, which is what a
 * sub-hour bucket reduces to. A Saturday daily bar — Twelve Data publishes
 * them — is entirely inside the closure and is caught. A Friday or Sunday daily
 * bar straddles the boundary and stays regular. Getting that from one loop
 * instead of three hand-written cases is what stops the daily rule and the
 * intraday rule drifting apart, which is the exact bug this module was created
 * to end.
 *
 * Weekly and monthly bars span the weekend by construction, so the question has
 * no answer for them and they are always regular.
 */
export function classifyBarSession(startTime: number, timeframe: CandleTimeframe): BarSessionState {
  if (timeframe === '1W' || timeframe === '1M') return 'regular';
  const end = bucketEndSeconds(startTime, timeframe);
  for (let instant = startTime; instant < end; instant += 3600) {
    if (!isWithinWeeklyClosure(instant)) return 'regular';
  }
  return isWithinWeeklyClosure(Math.max(startTime, end - 1)) ? 'out_of_session' : 'regular';
}
