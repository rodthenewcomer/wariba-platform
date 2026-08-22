import { randomUUID } from 'node:crypto';
import type { MarketDataSourceIdentity } from '@wariba/adapters';
import type { MarketTick, TradableSymbol } from '@wariba/contracts';
import { createDbClient, type Db } from '@wariba/database';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DurableMarketHistoryStore } from '../src/durable-market-history-store';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('WX2 durable history restart continuity', () => {
  let db: Db;
  const sourceId = `mock:test:${randomUUID()}:v1`;
  const source: MarketDataSourceIdentity = {
    id: sourceId,
    provider: 'mock',
    environment: 'test',
    mode: 'sandbox',
    version: 'fixture-v1',
    capabilities: {
      realtimeQuotes: true,
      bidAsk: true,
      historicalBars: false,
      nativeIntervals: [],
      pagination: 'none',
      volume: false,
      depth: false,
    },
  };
  const pricePrecision = {
    EURUSD: 5,
    GBPUSD: 5,
    USDJPY: 3,
    XAUUSD: 2,
    NAS100: 1,
  } satisfies Record<TradableSymbol, number>;
  const logger = { info: vi.fn(), error: vi.fn() };

  function tick(seconds: number, sequence: number, mid: string): MarketTick {
    const value = Number(mid);
    return {
      symbol: 'EURUSD',
      bid: (value - 0.00001).toFixed(5),
      ask: (value + 0.00001).toFixed(5),
      timestamp: new Date(seconds * 1000).toISOString(),
      sequence,
      marketStatus: 'open',
    };
  }

  function store(): DurableMarketHistoryStore {
    return new DurableMarketHistoryStore({
      db,
      source,
      pricePrecision,
      logger,
      flushIntervalMs: 5,
    });
  }

  beforeAll(() => {
    db = createDbClient(DATABASE_URL as string);
  });

  afterAll(async () => {
    await db.deleteFrom('app.market_bars').where('source_id', '=', sourceId).execute();
    await db.deleteFrom('app.market_data_sources').where('id', '=', sourceId).execute();
    await db.destroy();
  });

  it('restores finalized and active observed bars, then continues the same active key', async () => {
    const first = store();
    await first.initialize();
    first.observeAcceptedTick(tick(0, 1, '1.08450'));
    first.observeAcceptedTick(tick(30, 2, '1.08480'));
    first.observeAcceptedTick(tick(60, 3, '1.08500'));
    await first.close();

    const restarted = store();
    await restarted.initialize();
    const restored = await restarted.getCandles({
      symbol: 'EURUSD',
      timeframe: '1m',
      limit: 100,
    });
    expect(restored.candles.map((bar) => bar.startTime)).toEqual([0]);
    expect(restored.currentCandle).toMatchObject({ startTime: 60, open: '1.08500' });
    expect(restored.sourceEpoch).toBe(sourceId);
    expect(restored.sourceIdentity?.id).toBe(sourceId);
    expect(restored.capabilities?.historicalBars).toBe(false);

    restarted.observeAcceptedTick(tick(90, 4, '1.08540'));
    restarted.observeAcceptedTick(tick(120, 5, '1.08560'));
    await restarted.close();

    const secondRestart = store();
    await secondRestart.initialize();
    const continued = await secondRestart.getCandles({
      symbol: 'EURUSD',
      timeframe: '1m',
      limit: 100,
    });
    expect(continued.candles.map((bar) => bar.startTime)).toEqual([0, 60]);
    expect(continued.candles[1]).toMatchObject({
      open: '1.08500',
      high: '1.08540',
      close: '1.08540',
    });
    expect(continued.currentCandle).toMatchObject({ startTime: 120, open: '1.08560' });
    expect(continued.quality).toEqual({ gapsDetected: 0, continuity: 'observed' });
    await secondRestart.close();
  });
});
