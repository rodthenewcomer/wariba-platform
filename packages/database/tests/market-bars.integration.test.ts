import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import {
  loadCurrentMarketBars,
  loadMarketBarPage,
  registerMarketDataSource,
  upsertMarketBars,
  type PersistedMarketBar,
} from '../src/market-bars';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('WX2 durable market bar cache', () => {
  let db: Db;
  const sourceId = `wx2-test-${randomUUID()}`;

  const bar = (
    startTime: number,
    overrides: Partial<PersistedMarketBar> = {},
  ): PersistedMarketBar => ({
    sourceId,
    symbol: 'EURUSD',
    interval: '1m',
    startTime,
    open: '1.084500000000',
    high: '1.084700000000',
    low: '1.084400000000',
    close: '1.084600000000',
    isFinal: true,
    firstObservedSequence: 10,
    observedThroughSequence: 12,
    observedAt: new Date(startTime * 1000 + 12_000).toISOString(),
    ...overrides,
  });

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    await registerMarketDataSource(db, {
      id: sourceId,
      provider: 'wx2-test-provider',
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
    });
  });

  afterAll(async () => {
    await db.deleteFrom('app.market_bars').where('source_id', '=', sourceId).execute();
    await db.deleteFrom('app.market_data_sources').where('id', '=', sourceId).execute();
    await db.destroy();
  });

  it('upserts an active bar idempotently and rejects stale sequence regression', async () => {
    await upsertMarketBars(db, [
      bar(60, {
        isFinal: false,
        close: '1.084550000000',
        observedThroughSequence: 10,
      }),
    ]);
    await upsertMarketBars(db, [
      bar(60, {
        isFinal: false,
        high: '1.084900000000',
        close: '1.084800000000',
        observedThroughSequence: 12,
      }),
    ]);
    await upsertMarketBars(db, [
      bar(60, {
        isFinal: false,
        close: '1.084500000000',
        observedThroughSequence: 11,
      }),
    ]);

    const current = await loadCurrentMarketBars(db, sourceId);
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({
      startTime: 60,
      high: '1.084900000000',
      close: '1.084800000000',
      firstObservedSequence: 10,
      observedThroughSequence: 12,
      isFinal: false,
    });
  });

  it('makes a finalized bar immutable against a later non-final retry', async () => {
    await upsertMarketBars(db, [
      bar(60, {
        high: '1.085000000000',
        close: '1.084900000000',
        observedThroughSequence: 13,
      }),
    ]);
    await upsertMarketBars(db, [
      bar(60, {
        isFinal: false,
        close: '1.084500000000',
        observedThroughSequence: 14,
      }),
    ]);

    expect(await loadCurrentMarketBars(db, sourceId)).toHaveLength(0);
    const page = await loadMarketBarPage(db, {
      sourceId,
      symbol: 'EURUSD',
      interval: '1m',
      limit: 10,
    });
    expect(page.bars).toHaveLength(1);
    expect(page.bars[0]).toMatchObject({
      isFinal: true,
      high: '1.085000000000',
      close: '1.084900000000',
      observedThroughSequence: 13,
    });
  });

  it('paginates newest-first in storage but returns oldest-to-newest without overlap', async () => {
    await upsertMarketBars(db, [bar(120), bar(180), bar(240), bar(300)]);

    const newest = await loadMarketBarPage(db, {
      sourceId,
      symbol: 'EURUSD',
      interval: '1m',
      limit: 2,
    });
    expect(newest.bars.map((entry) => entry.startTime)).toEqual([240, 300]);
    expect(newest.hasMore).toBe(true);
    const cursor = newest.bars[0]?.startTime;
    if (cursor === undefined) throw new Error('newest market-bar page was empty');

    const older = await loadMarketBarPage(db, {
      sourceId,
      symbol: 'EURUSD',
      interval: '1m',
      limit: 3,
      before: cursor,
    });
    expect(older.bars.map((entry) => entry.startTime)).toEqual([60, 120, 180]);
    expect(older.hasMore).toBe(false);
  });
});
