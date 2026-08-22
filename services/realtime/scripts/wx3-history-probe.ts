/**
 * WX3 §7 — the capability probe.
 *
 * A provider capability is only allowed to be `true` in this repository if it
 * came from official documentation or from an actual successful request. This
 * script is the second half of that rule: it performs a genuine cold backfill
 * for every canonical timeframe and reports what the durable cache really ends
 * up holding, so the depth numbers in the WX3 report are measured rather than
 * asserted.
 *
 * Reads its credential from the environment and never prints it.
 *
 *   TWELVE_DATA_API_KEY=... WX3_PROBE_DATABASE_URL=postgres://... \
 *     pnpm --filter @wariba/realtime exec tsx scripts/wx3-history-probe.ts
 */
import { TwelveDataHistoricalProvider, parseTwelveDataSymbolMap } from '@wariba/adapters';
import { CANDLE_TIMEFRAMES, type CandleTimeframe, type TradableSymbol } from '@wariba/contracts';
import { createDbClient, registerMarketDataSource } from '@wariba/database';
import { MarketHistoryBackfillEngine } from '../src/market-history-backfill';

const databaseUrl = process.env.WX3_PROBE_DATABASE_URL;
const apiKey = process.env.TWELVE_DATA_API_KEY;
if (!databaseUrl || !apiKey) {
  console.error(
    'WX3_PROBE_DATABASE_URL and TWELVE_DATA_API_KEY are both required. ' +
      'The probe never runs against a fabricated source.',
  );
  process.exit(1);
}

const symbol = (process.env.WX3_PROBE_SYMBOL ?? 'EURUSD') as TradableSymbol;
const pricePrecision: Record<TradableSymbol, number> = {
  EURUSD: 5,
  GBPUSD: 5,
  USDJPY: 3,
  XAUUSD: 2,
  NAS100: 1,
};

async function main(): Promise<void> {
  const db = createDbClient(databaseUrl ?? '');
  const provider = new TwelveDataHistoricalProvider({
    apiKey: apiKey ?? '',
    baseUrl: process.env.TWELVE_DATA_BASE_URL ?? 'https://api.twelvedata.com',
    symbols: parseTwelveDataSymbolMap(
      process.env.TWELVE_DATA_SYMBOL_MAP ?? 'EURUSD=EUR/USD,XAUUSD=XAU/USD',
    ),
  });
  await registerMarketDataSource(db, {
    id: provider.source.id,
    provider: provider.source.provider,
    environment: provider.source.environment,
    mode: provider.source.mode,
    version: provider.source.version,
    capabilities: provider.source.capabilities,
  });

  const engine = new MarketHistoryBackfillEngine({
    db,
    provider,
    pricePrecision,
    logger: {
      info: () => {},
      warn: (event, fields) => console.warn(event, fields ?? {}),
      error: (event, fields) => console.error(event, fields ?? {}),
    },
    rateLimit: { capacity: 6, windowMs: 60_000 },
  });

  // Script output goes to stderr, matching scripts/load-test.ts — stdout stays
  // clean for anything that wants to pipe the table.
  console.error(`[wx3-probe] source: ${engine.sourceId}`);
  console.error(`[wx3-probe] symbol: ${symbol}`);
  console.error('');

  for (const timeframe of CANDLE_TIMEFRAMES as readonly CandleTimeframe[]) {
    const startedAt = Date.now();
    const outcome = await engine.ensure({ symbol, timeframe });
    const totals = await db
      .selectFrom('app.market_bars')
      .select((expression) => [
        expression.fn.countAll().as('bars'),
        expression.fn.min('open_time').as('earliest'),
        expression.fn.max('open_time').as('latest'),
      ])
      .where('source_id', '=', engine.sourceId)
      .where('symbol', '=', symbol)
      .where('interval', '=', timeframe)
      .executeTakeFirst();
    const origins = await db
      .selectFrom('app.market_bars')
      .select(['origin', (expression) => expression.fn.countAll().as('rows')])
      .where('source_id', '=', engine.sourceId)
      .where('symbol', '=', symbol)
      .where('interval', '=', timeframe)
      .groupBy('origin')
      .execute();
    console.error(
      [
        timeframe.padEnd(3),
        outcome.status.padEnd(18),
        `bars=${String(totals?.bars ?? 0).padStart(5)}`,
        `earliest=${totals?.earliest?.toISOString().slice(0, 16) ?? '-'}`,
        `latest=${totals?.latest?.toISOString().slice(0, 16) ?? '-'}`,
        `origin=${origins.map((row) => `${row.origin}:${row.rows}`).join(',') || '-'}`,
        `ms=${Date.now() - startedAt}`,
      ].join('  '),
    );
  }
  await db.destroy();
}

await main();
