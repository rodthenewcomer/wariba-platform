import {
  CANDLE_TIMEFRAMES,
  bucketEndSeconds,
  isCandleStartAligned,
  type CandleTimeframe,
} from '@wariba/contracts';
import Decimal from 'decimal.js';
import type { MarketDataSourceIdentity, TradableSymbol } from './market-data-provider';

/**
 * WX3 — the historical market-data port.
 *
 * Deliberately separate from `MarketDataProvider`. A quote feed and a candle
 * archive are different capabilities with different failure modes, different
 * rate limits and, in WariX's case, different vendors; folding them into one
 * interface would make every quote adapter in this package appear to own an
 * archive, which is exactly the false claim WX2 spent its whole design
 * refusing to make.
 *
 * The canonical bucket functions come from `@wariba/contracts` rather than
 * being reimplemented here. That is the one dependency edge this file adds to
 * the package, and it is the right one: "which candle does this instant belong
 * to" must have exactly one implementation in the repository, or a provider's
 * idea of a week and the chart's idea of a week drift apart silently.
 *
 * Nothing in this file participates in execution. A historical bar is display
 * truth, never trigger truth (WX2 §29, W3 §57/§58).
 */

/** How a stored bar came to exist. Provenance is recorded, never inferred. */
export const HISTORICAL_BAR_ORIGINS = ['provider_history', 'observed', 'derived'] as const;
export type HistoricalBarOrigin = (typeof HISTORICAL_BAR_ORIGINS)[number];

/**
 * Volume semantics, stated rather than assumed.
 *
 * Spot FX has no central tape, so a "volume" number from an FX provider is
 * either tick count or nothing at all. WX3 stores which one it is, and stores
 * nothing when the provider does not document what its number means. Candle
 * count is never used as volume (WX3 §30).
 */
export const HISTORICAL_VOLUME_SEMANTICS = ['tick', 'exchange'] as const;
export type HistoricalVolumeSemantics = (typeof HISTORICAL_VOLUME_SEMANTICS)[number];

export interface HistoricalBarVolume {
  /** Decimal string, like every other numeric on a canonical bar. */
  value: string;
  semantics: HistoricalVolumeSemantics;
}

export interface HistoricalBar {
  /** Canonical bucket start, epoch seconds, UTC-aligned. */
  startTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  /** `null` means the source does not provide semantically valid volume. */
  volume: HistoricalBarVolume | null;
}

export interface HistoricalBarsRequest {
  symbol: TradableSymbol;
  timeframe: CandleTimeframe;
  /** Exclusive upper bound on bucket start, epoch seconds. Omitted = newest available. */
  before?: number;
  /** Inclusive lower bound on bucket start, epoch seconds. */
  after?: number;
  /** Hard ceiling on bars returned. Providers must not exceed it. */
  limit: number;
}

/** A provider bar that failed canonical validation. Quarantined, never repaired. */
export interface RejectedHistoricalBar {
  /** Raw provider timestamp, for diagnosis. Epoch seconds when parseable. */
  startTime: number | null;
  reason: string;
}

export interface HistoricalBarsPage {
  sourceId: string;
  symbol: TradableSymbol;
  timeframe: CandleTimeframe;
  /** Ascending by `startTime`, deduplicated, canonically aligned. */
  bars: readonly HistoricalBar[];
  /** Whether the provider indicates older bars exist beyond this page. */
  hasMoreOlder: boolean;
  /** Oldest/newest bucket start actually returned, or `null` for an empty page. */
  coverage: { from: number; to: number } | null;
  /** Non-empty means the provider returned data WariX refused to store. */
  rejected: readonly RejectedHistoricalBar[];
}

export const HISTORICAL_PROVIDER_ERROR_KINDS = [
  'rate_limited',
  'authentication',
  'unsupported_symbol',
  'unsupported_timeframe',
  'malformed_response',
  'timeout',
  'transport',
  'provider_error',
] as const;
export type HistoricalProviderErrorKind = (typeof HISTORICAL_PROVIDER_ERROR_KINDS)[number];

/**
 * Retry classification lives with the error kind, not at each call site.
 *
 * An authentication failure retried with backoff is a way to get a key banned;
 * an unsupported symbol retried forever is a way to burn a daily credit budget
 * on a question whose answer will not change. Only genuinely transient kinds
 * are retryable.
 */
const RETRYABLE_ERROR_KINDS: ReadonlySet<HistoricalProviderErrorKind> = new Set([
  'rate_limited',
  'timeout',
  'transport',
]);

export class HistoricalProviderError extends Error {
  readonly kind: HistoricalProviderErrorKind;
  readonly retryable: boolean;
  /** Honoured from `Retry-After` when the provider sends one. */
  readonly retryAfterMs: number | null;

  constructor(
    kind: HistoricalProviderErrorKind,
    message: string,
    options: { retryAfterMs?: number | null } = {},
  ) {
    super(message);
    this.name = 'HistoricalProviderError';
    this.kind = kind;
    this.retryable = RETRYABLE_ERROR_KINDS.has(kind);
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

export function isRetryableProviderErrorKind(kind: HistoricalProviderErrorKind): boolean {
  return RETRYABLE_ERROR_KINDS.has(kind);
}

/**
 * A provider that owns genuine historical bars.
 *
 * `nativeTimeframes` is the honest list of intervals the vendor serves as real
 * bars. Everything else WariX needs is either derived from complete native
 * lower-timeframe data or simply not available — never fabricated, and never
 * silently mapped onto "the nearest interval the provider happens to have".
 */
export interface HistoricalMarketDataProvider {
  readonly providerName: string;
  readonly source: MarketDataSourceIdentity;
  readonly nativeTimeframes: readonly CandleTimeframe[];
  supportsSymbol(symbol: TradableSymbol): boolean;
  supportsTimeframe(timeframe: CandleTimeframe): boolean;
  fetchBars(request: HistoricalBarsRequest): Promise<HistoricalBarsPage>;
  close(): void;
}

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function isPositiveDecimalString(value: string): boolean {
  if (!DECIMAL_PATTERN.test(value)) return false;
  return new Decimal(value).greaterThan(0);
}

/**
 * The canonical gate every provider response passes through.
 *
 * It rejects rather than repairs. A provider that returns `high < open` is not
 * telling WariX about a market, it is telling WariX its response is wrong, and
 * clamping the number would turn a detectable vendor bug into a permanent
 * silent corruption of the durable cache. Rejected bars are reported so the
 * caller can log and surface them (WX3 §10, §46).
 *
 * Ordering, duplication and alignment are all handled here for the same
 * reason: doing it once at the boundary is what makes "the cache contains only
 * canonical bars" an invariant instead of an aspiration.
 */
export function normalizeProviderBars(
  rawBars: readonly HistoricalBar[],
  timeframe: CandleTimeframe,
  options: { before?: number; after?: number } = {},
): { bars: HistoricalBar[]; rejected: RejectedHistoricalBar[] } {
  const rejected: RejectedHistoricalBar[] = [];
  const byStartTime = new Map<number, HistoricalBar>();

  for (const bar of rawBars) {
    const reason = rejectionReason(bar, timeframe, options);
    if (reason !== null) {
      rejected.push({ startTime: Number.isFinite(bar.startTime) ? bar.startTime : null, reason });
      continue;
    }
    const existing = byStartTime.get(bar.startTime);
    if (existing !== undefined) {
      // A provider page that repeats a bucket is a provider bug, not a merge
      // opportunity: silently combining two conflicting answers about the same
      // minute invents a third candle that neither side reported.
      if (
        existing.open !== bar.open ||
        existing.high !== bar.high ||
        existing.low !== bar.low ||
        existing.close !== bar.close
      ) {
        rejected.push({
          startTime: bar.startTime,
          reason: 'duplicate_bucket_with_conflicting_ohlc',
        });
      }
      continue;
    }
    byStartTime.set(bar.startTime, bar);
  }

  const bars = [...byStartTime.values()].sort((left, right) => left.startTime - right.startTime);
  return { bars, rejected };
}

function rejectionReason(
  bar: HistoricalBar,
  timeframe: CandleTimeframe,
  options: { before?: number; after?: number },
): string | null {
  if (!Number.isSafeInteger(bar.startTime) || bar.startTime < 0) {
    return 'start_time_not_a_nonnegative_integer';
  }
  if (!isCandleStartAligned(bar.startTime, timeframe)) {
    return `start_time_misaligned_for_${timeframe}`;
  }
  if (options.before !== undefined && bar.startTime >= options.before) {
    return 'start_time_at_or_after_exclusive_before_cursor';
  }
  if (options.after !== undefined && bar.startTime < options.after) {
    return 'start_time_before_inclusive_after_bound';
  }
  for (const [field, value] of [
    ['open', bar.open],
    ['high', bar.high],
    ['low', bar.low],
    ['close', bar.close],
  ] as const) {
    if (!isPositiveDecimalString(value)) return `${field}_not_a_positive_decimal_string`;
  }
  const open = new Decimal(bar.open);
  const high = new Decimal(bar.high);
  const low = new Decimal(bar.low);
  const close = new Decimal(bar.close);
  if (high.lessThan(low)) return 'ohlc_high_below_low';
  if (high.lessThan(open) || high.lessThan(close)) return 'ohlc_high_below_open_or_close';
  if (low.greaterThan(open) || low.greaterThan(close)) return 'ohlc_low_above_open_or_close';
  if (bar.volume !== null) {
    if (!DECIMAL_PATTERN.test(bar.volume.value)) return 'volume_not_a_decimal_string';
    if (!(HISTORICAL_VOLUME_SEMANTICS as readonly string[]).includes(bar.volume.semantics)) {
      return 'volume_semantics_unknown';
    }
  }
  return null;
}

/** Every canonical timeframe a provider does not serve natively. */
export function derivedTimeframes(native: readonly CandleTimeframe[]): readonly CandleTimeframe[] {
  const nativeSet = new Set(native);
  return CANDLE_TIMEFRAMES.filter((timeframe) => !nativeSet.has(timeframe));
}

/** Exclusive end of the newest bar in a page — what "coverage to" means downstream. */
export function pageCoverageEnd(
  page: Pick<HistoricalBarsPage, 'bars' | 'timeframe'>,
): number | null {
  const newest = page.bars.at(-1);
  return newest === undefined ? null : bucketEndSeconds(newest.startTime, page.timeframe);
}
