import { randomUUID } from 'node:crypto';
import { TwelveDataHistoricalProvider } from '@wariba/adapters';
import type { TradableSymbol } from '@wariba/contracts';
import { createDbClient, registerMarketDataSource, type Db } from '@wariba/database';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MarketHistoryBackfillEngine } from '../src/market-history-backfill';

/**
 * WX3 §56 — the durable path, end to end, against a genuine provider.
 *
 * Skipped unless both a database and a real API key are present, because the
 * whole point of this file is that nothing in it is mocked. A green run here
 * is the evidence that "WariX holds real market history" is true rather than
 * architecturally possible.
 */
const DATABASE_URL = process.env.WX3_TEST_DATABASE_URL;
const API_KEY = process.env.TWELVE_DATA_API_KEY;
const describeIfLive = DATABASE_URL && API_KEY ? describe : describe.skip;

describeIfLive('WX3 genuine provider history', () => {
  let db: Db;
  const pricePrecision = {
    EURUSD: 5,
    GBPUSD: 5,
    USDJPY: 3,
    XAUUSD: 2,
    NAS100: 1,
  } satisfies Record<TradableSymbol, number>;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  // A per-run source id keeps repeated local runs from reading each other's rows.
  const runTag = randomUUID().slice(0, 8);

  function buildEngine(): MarketHistoryBackfillEngine {
    const provider = new TwelveDataHistoricalProvider({
      apiKey: API_KEY ?? '',
      baseUrl: 'https://api.twelvedata.com',
      symbols: { EURUSD: { providerSymbol: 'EUR/USD' } },
    });
    // Namespace the source so the assertions below describe this run only.
    Object.defineProperty(provider.source, 'id', {
      value: `twelve-data:test-${runTag}:v1`,
      writable: false,
    });
    return new MarketHistoryBackfillEngine({
      db,
      provider,
      pricePrecision,
      logger,
      rateLimit: { capacity: 6, windowMs: 60_000 },
    });
  }

  async function countBars(sourceId: string, interval: string): Promise<number> {
    const row = await db
      .selectFrom('app.market_bars')
      .select((expression) => expression.fn.countAll().as('bars'))
      .where('source_id', '=', sourceId)
      .where('symbol', '=', 'EURUSD')
      .where('interval', '=', interval)
      .executeTakeFirst();
    return Number(row?.bars ?? 0);
  }

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL ?? '');
    const engine = buildEngine();
    await registerMarketDataSource(db, {
      id: engine.sourceId,
      provider: 'twelve-data',
      environment: `test-${runTag}`,
      mode: 'live',
      version: 'v1',
      capabilities: { historicalBars: true },
    });
  }, 60_000);

  afterAll(async () => {
    if (db === undefined) return;
    await db
      .deleteFrom('app.market_bar_coverage')
      .where('source_id', 'like', `twelve-data:test-${runTag}%`)
      .execute();
    await db
      .deleteFrom('app.market_bars')
      .where('source_id', 'like', `twelve-data:test-${runTag}%`)
      .execute();
    await db
      .deleteFrom('app.market_data_sources')
      .where('id', 'like', `twelve-data:test-${runTag}%`)
      .execute();
    await db.destroy();
  }, 60_000);

  it('fills a cold daily cache with hundreds of genuine bars', async () => {
    const engine = buildEngine();
    const outcome = await engine.ensure({ symbol: 'EURUSD', timeframe: '1D', targetBars: 600 });
    expect(outcome.status).toBe('backfilled');
    if (outcome.status !== 'backfilled') return;
    expect(outcome.barsWritten).toBeGreaterThan(400);
    expect(outcome.rejectedBars).toBe(0);
    expect(await countBars(engine.sourceId, '1D')).toBeGreaterThan(400);
  }, 120_000);

  it('answers a second identical request from cache without touching the provider', async () => {
    const engine = buildEngine();
    const outcome = await engine.ensure({ symbol: 'EURUSD', timeframe: '1D', targetBars: 600 });
    expect(outcome.status).toBe('cache_sufficient');
    if (outcome.status !== 'cache_sufficient') return;
    expect(outcome.providerRequests).toBe(0);
  }, 60_000);

  it('is idempotent — repeating a backfill writes no duplicate rows', async () => {
    const engine = buildEngine();
    const before = await countBars(engine.sourceId, '1D');
    await engine.ensure({ symbol: 'EURUSD', timeframe: '1D', targetBars: 600 });
    expect(await countBars(engine.sourceId, '1D')).toBe(before);
  }, 60_000);

  it('records coverage and stores canonically aligned, valid bars', async () => {
    const engine = buildEngine();
    const coverage = await db
      .selectFrom('app.market_bar_coverage')
      .selectAll()
      .where('source_id', '=', engine.sourceId)
      .where('interval', '=', '1D')
      .executeTakeFirst();
    expect(coverage).toBeDefined();
    expect(coverage?.earliest_bar.getTime()).toBeLessThan(coverage?.latest_bar.getTime() ?? 0);

    const bars = await db
      .selectFrom('app.market_bars')
      .selectAll()
      .where('source_id', '=', engine.sourceId)
      .where('interval', '=', '1D')
      .orderBy('open_time', 'asc')
      .limit(50)
      .execute();
    for (const bar of bars) {
      // UTC-midnight aligned, exactly what bucketStartSeconds produces for 1D.
      expect(bar.open_time.getTime() % 86_400_000).toBe(0);
      expect(bar.is_final).toBe(true);
      expect(bar.origin).toBe('provider_history');
      expect(Number(bar.high)).toBeGreaterThanOrEqual(Number(bar.low));
      expect(Number(bar.high)).toBeGreaterThanOrEqual(Number(bar.open));
      expect(Number(bar.low)).toBeLessThanOrEqual(Number(bar.close));
      // Twelve Data publishes no volume for spot FX; none is invented.
      expect(bar.volume).toBeNull();
    }
  }, 60_000);

  it('pages genuinely older bars when scrolling left past the cache', async () => {
    const engine = buildEngine();
    const oldest = await db
      .selectFrom('app.market_bars')
      .select('open_time')
      .where('source_id', '=', engine.sourceId)
      .where('interval', '=', '1D')
      .orderBy('open_time', 'asc')
      .executeTakeFirst();
    expect(oldest).toBeDefined();
    const cursor = Math.floor((oldest?.open_time.getTime() ?? 0) / 1000);

    const outcome = await engine.ensure({
      symbol: 'EURUSD',
      timeframe: '1D',
      before: cursor,
      targetBars: 200,
    });
    expect(outcome.status).toBe('backfilled');

    const newOldest = await db
      .selectFrom('app.market_bars')
      .select('open_time')
      .where('source_id', '=', engine.sourceId)
      .where('interval', '=', '1D')
      .orderBy('open_time', 'asc')
      .executeTakeFirst();
    // The whole point of pagination: the left edge genuinely moved back.
    expect(newOldest?.open_time.getTime()).toBeLessThan(oldest?.open_time.getTime() ?? 0);
  }, 120_000);

  it('survives a restart — a new engine instance reads the same durable bars', async () => {
    const first = buildEngine();
    const persisted = await countBars(first.sourceId, '1D');
    const restarted = buildEngine();
    expect(restarted.sourceId).toBe(first.sourceId);
    const outcome = await restarted.ensure({
      symbol: 'EURUSD',
      timeframe: '1D',
      targetBars: 400,
    });
    expect(outcome.status).toBe('cache_sufficient');
    expect(await countBars(restarted.sourceId, '1D')).toBe(persisted);
  }, 60_000);
});
