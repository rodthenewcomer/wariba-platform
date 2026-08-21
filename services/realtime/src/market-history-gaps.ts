import { bucketEndSeconds, type CandleTimeframe, type MarketCandle } from '@wariba/contracts';

/**
 * WX3 §25/§26 — what a missing bucket actually means.
 *
 * WX2 counted gaps and showed them honestly, which was right and also blunt: a
 * weekend is not a data problem, and reporting it as one trains a trader to
 * ignore the indicator that is supposed to mean something. Classification is
 * what makes the honest signal useful.
 *
 * Nothing here repairs anything. It decides what kind of hole a hole is; the
 * backfill engine decides whether it can be filled, and only ever fills it
 * with genuine provider bars.
 */

export const GAP_KINDS = [
  'expected_session_gap',
  'recoverable_history_gap',
  'provider_data_gap',
  'unrecoverable_gap',
] as const;
export type GapKind = (typeof GAP_KINDS)[number];

export interface DetectedGap {
  /** Exclusive end of the bar before the hole, epoch seconds. */
  from: number;
  /** Start of the bar after the hole, epoch seconds. */
  to: number;
  kind: GapKind;
}

export interface GapClassificationSummary {
  gaps: DetectedGap[];
  expectedSession: number;
  recoverable: number;
  providerData: number;
  unrecoverable: number;
  /** Gaps that are genuinely a data problem — everything except expected closures. */
  unexpected: number;
}

const HOUR_SECONDS = 3600;
const DAY_SECONDS = 86_400;

/**
 * The spot FX weekly closure, in UTC.
 *
 * Deliberately conservative at both ends. The market's real boundaries shift
 * with northern-hemisphere daylight saving, and a classifier that is too tight
 * would label a genuine one-hour outage as a weekend twice a year. Being wide
 * means an hour of real missing data on a Friday night is classified as an
 * expected closure — the failure mode that under-reports rather than the one
 * that cries wolf every Saturday.
 */
const WEEKEND_CLOSE_DAY = 5; // Friday
const WEEKEND_CLOSE_HOUR_UTC = 21;
const WEEKEND_OPEN_DAY = 0; // Sunday
const WEEKEND_OPEN_HOUR_UTC = 22;

export function isWithinWeekendClosure(epochSeconds: number): boolean {
  const date = new Date(epochSeconds * 1000);
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  if (day === 6) return true;
  if (day === WEEKEND_CLOSE_DAY && hour >= WEEKEND_CLOSE_HOUR_UTC) return true;
  if (day === WEEKEND_OPEN_DAY && hour < WEEKEND_OPEN_HOUR_UTC) return true;
  return false;
}

/**
 * A hole is an expected closure when every instant inside it is closed market.
 *
 * Sampled hourly rather than continuously: the closure boundaries are on hour
 * marks, so an hourly probe cannot miss a transition, and a multi-year daily
 * series does not turn gap detection into a per-second loop.
 */
function spansOnlyClosedMarket(from: number, to: number): boolean {
  if (to <= from) return false;
  for (let instant = from; instant < to; instant += HOUR_SECONDS) {
    if (!isWithinWeekendClosure(instant)) return false;
  }
  return isWithinWeekendClosure(to - 1);
}

/**
 * Calendar intervals are not classified against the intraday session.
 *
 * A weekly bar covers the weekend by construction, so asking "was this hole
 * inside a closure" is meaningless for it. A missing week or month is always a
 * data question.
 */
function isCalendarInterval(timeframe: CandleTimeframe): boolean {
  return timeframe === '1W' || timeframe === '1M';
}

export interface ClassifyGapsOptions {
  timeframe: CandleTimeframe;
  /** Whether a historical provider capable of filling holes is configured. */
  providerCanRepair: boolean;
  /** Oldest instant the provider is known to cover; holes older than this are provider data gaps. */
  providerEarliest?: number;
}

export function classifyGaps(
  candles: readonly MarketCandle[],
  options: ClassifyGapsOptions,
): GapClassificationSummary {
  const gaps: DetectedGap[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    const previous = candles[index - 1];
    const next = candles[index];
    if (previous === undefined || next === undefined) continue;
    const from = bucketEndSeconds(previous.startTime, options.timeframe);
    if (from >= next.startTime) continue;
    gaps.push({ from, to: next.startTime, kind: classifyOne(from, next.startTime, options) });
  }

  const summary: GapClassificationSummary = {
    gaps,
    expectedSession: 0,
    recoverable: 0,
    providerData: 0,
    unrecoverable: 0,
    unexpected: 0,
  };
  for (const gap of gaps) {
    if (gap.kind === 'expected_session_gap') summary.expectedSession += 1;
    if (gap.kind === 'recoverable_history_gap') summary.recoverable += 1;
    if (gap.kind === 'provider_data_gap') summary.providerData += 1;
    if (gap.kind === 'unrecoverable_gap') summary.unrecoverable += 1;
  }
  summary.unexpected = gaps.length - summary.expectedSession;
  return summary;
}

function classifyOne(from: number, to: number, options: ClassifyGapsOptions): GapKind {
  if (!isCalendarInterval(options.timeframe) && spansOnlyClosedMarket(from, to)) {
    return 'expected_session_gap';
  }
  if (options.providerEarliest !== undefined && to <= options.providerEarliest) {
    return 'provider_data_gap';
  }
  return options.providerCanRepair ? 'recoverable_history_gap' : 'unrecoverable_gap';
}

/**
 * The range a reconnect must ask the provider for.
 *
 * Bounded by `maxSpanSeconds` so a service that was down for a month does not
 * turn its first request back into a month-long backfill on the hot path.
 * Returns `null` when the durable cache is already current.
 */
export function reconnectRepairRange(
  lastDurableBarStart: number | null,
  now: number,
  timeframe: CandleTimeframe,
  maxSpanSeconds: number = 7 * DAY_SECONDS,
): { from: number; to: number } | null {
  if (lastDurableBarStart === null) return null;
  const from = bucketEndSeconds(lastDurableBarStart, timeframe);
  if (from >= now) return null;
  return { from: Math.max(from, now - maxSpanSeconds), to: now };
}
