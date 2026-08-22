import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadMarketBarCoverage = vi.fn();
vi.mock('@wariba/database', () => ({ loadMarketBarCoverage }));

const { MarketHistoryRepairService } = await import('../src/market-history-repair');
import type { MarketHistoryBackfillEngine } from '../src/market-history-backfill';

const HOUR = 3600;
const utc = (y: number, m: number, d: number, h = 0): number => Date.UTC(y, m, d, h) / 1000;
/** Wednesday 2026-08-19 12:00 UTC — the middle of a trading week. */
const MIDWEEK = utc(2026, 7, 19, 12);

function engine(ensure = vi.fn()): MarketHistoryBackfillEngine {
  return { sourceId: 'twelve-data:test:v1', ensure } as unknown as MarketHistoryBackfillEngine;
}

function service(options: {
  ensure?: ReturnType<typeof vi.fn>;
  now: number;
  logger?: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
}) {
  const ensure = options.ensure ?? vi.fn().mockResolvedValue({ status: 'cache_sufficient' });
  const logger = options.logger ?? { info: vi.fn(), warn: vi.fn() };
  return {
    ensure,
    logger,
    instance: new MarketHistoryRepairService({
      db: {} as never,
      backfill: engine(ensure),
      symbols: ['EURUSD'],
      timeframes: ['1m'],
      logger,
      now: () => options.now,
    }),
  };
}

beforeEach(() => {
  loadMarketBarCoverage.mockReset();
});

describe('reconnect gap repair', () => {
  it('repairs a genuine midweek outage', async () => {
    loadMarketBarCoverage.mockResolvedValue({ latestBar: MIDWEEK - 2 * HOUR, hasMoreOlder: true });
    const ensure = vi.fn().mockResolvedValue({
      status: 'backfilled',
      barsWritten: 120,
      providerRequests: 1,
    });
    const { instance } = service({ ensure, now: MIDWEEK });

    const outcome = await instance.repair('service_start');

    expect(outcome.repaired).toBe(1);
    expect(ensure).toHaveBeenCalledOnce();
    const request = ensure.mock.calls[0]?.[0];
    expect(request.symbol).toBe('EURUSD');
    expect(request.timeframe).toBe('1m');
    // Two hours of one-minute buckets, plus a little headroom for the bar that
    // was still forming when the process died.
    expect(request.targetBars).toBeGreaterThanOrEqual(120);
    expect(request.targetBars).toBeLessThan(140);
  });

  it('does not spend credits repairing a closed market', async () => {
    // Last bar is the final minute before Friday's 21:00 UTC close; the restart
    // happens on Saturday, so every instant of the measured range is shut.
    loadMarketBarCoverage.mockResolvedValue({
      latestBar: utc(2026, 7, 21, 20) + 59 * 60,
      hasMoreOlder: true,
    });
    const ensure = vi.fn().mockResolvedValue({ status: 'cache_sufficient' });
    const { instance } = service({ ensure, now: utc(2026, 7, 22, 12) });

    const outcome = await instance.repair('service_start');

    expect(ensure).not.toHaveBeenCalled();
    expect(outcome.repaired).toBe(0);
    expect(outcome.skippedNoGap).toBe(1);
  });

  it('does repair the open-market part of a weekend-spanning outage', async () => {
    // Same Friday close, but the restart is Monday midday: the weekend was not
    // missing, Monday morning was, and only a range that is *entirely* shut is
    // skipped.
    loadMarketBarCoverage.mockResolvedValue({
      latestBar: utc(2026, 7, 21, 20) + 59 * 60,
      hasMoreOlder: true,
    });
    const ensure = vi.fn().mockResolvedValue({
      status: 'backfilled',
      barsWritten: 400,
      providerRequests: 1,
    });
    const { instance } = service({ ensure, now: utc(2026, 7, 24, 12) });

    const outcome = await instance.repair('service_start');

    expect(outcome.repaired).toBe(1);
  });

  it('does nothing when the cache is already current', async () => {
    loadMarketBarCoverage.mockResolvedValue({ latestBar: MIDWEEK, hasMoreOlder: true });
    const ensure = vi.fn();
    const { instance } = service({ ensure, now: MIDWEEK + 10 });

    await instance.repair('feed_reconnect');

    expect(ensure).not.toHaveBeenCalled();
  });

  it('treats an empty cache as a cold start, not a gap', async () => {
    loadMarketBarCoverage.mockResolvedValue(null);
    const ensure = vi.fn();
    const { instance } = service({ ensure, now: MIDWEEK });

    await instance.repair('service_start');

    expect(ensure).not.toHaveBeenCalled();
  });

  it('bounds a long outage instead of refetching everything', async () => {
    loadMarketBarCoverage.mockResolvedValue({
      latestBar: MIDWEEK - 400 * 24 * HOUR,
      hasMoreOlder: true,
    });
    const ensure = vi.fn().mockResolvedValue({
      status: 'backfilled',
      barsWritten: 400,
      providerRequests: 1,
    });
    const { instance } = service({ ensure, now: MIDWEEK });

    await instance.repair('service_start');

    expect(ensure.mock.calls[0]?.[0].targetBars).toBeLessThanOrEqual(400);
  });

  it('coalesces duplicate reconnect events into one pass', async () => {
    loadMarketBarCoverage.mockResolvedValue({ latestBar: MIDWEEK - HOUR, hasMoreOlder: true });
    const ensure = vi.fn().mockResolvedValue({
      status: 'backfilled',
      barsWritten: 60,
      providerRequests: 1,
    });
    const { instance } = service({ ensure, now: MIDWEEK });

    const [first, second, third] = await Promise.all([
      instance.repair('feed_reconnect'),
      instance.repair('feed_reconnect'),
      instance.repair('feed_reconnect'),
    ]);

    expect(ensure).toHaveBeenCalledOnce();
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('leaves the cache alone and reports when the provider fails', async () => {
    loadMarketBarCoverage.mockResolvedValue({ latestBar: MIDWEEK - HOUR, hasMoreOlder: true });
    const ensure = vi.fn().mockResolvedValue({
      status: 'failed',
      kind: 'rate_limited',
      retryable: true,
      message: 'slow down',
    });
    const logger = { info: vi.fn(), warn: vi.fn() };
    const { instance } = service({ ensure, now: MIDWEEK, logger });

    const outcome = await instance.repair('feed_reconnect');

    expect(outcome.failed).toBe(1);
    expect(outcome.repaired).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith('history.gap.unrecoverable', expect.anything());
  });

  /**
   * The regression that made the first wired repair a no-op.
   *
   * After an outage the cache is full of older bars, so a depth request answers
   * "already satisfied" while the newest window is still missing. A repair has
   * to say what it actually wants.
   */
  it('asks the provider even when the cache holds plenty of older bars', async () => {
    loadMarketBarCoverage.mockResolvedValue({ latestBar: MIDWEEK - 2 * HOUR, hasMoreOlder: true });
    const ensure = vi.fn().mockResolvedValue({
      status: 'backfilled',
      barsWritten: 120,
      providerRequests: 1,
    });
    const { instance } = service({ ensure, now: MIDWEEK });

    await instance.repair('feed_reconnect');

    expect(ensure.mock.calls[0]?.[0].mode).toBe('repair');
  });

  it('skips a symbol the provider does not carry', async () => {
    loadMarketBarCoverage.mockResolvedValue({ latestBar: MIDWEEK - HOUR, hasMoreOlder: true });
    const ensure = vi.fn().mockResolvedValue({ status: 'unsupported', reason: 'not mapped' });
    const { instance } = service({ ensure, now: MIDWEEK });

    const outcome = await instance.repair('service_start');

    expect(outcome.skippedUnsupported).toBe(1);
  });
});
