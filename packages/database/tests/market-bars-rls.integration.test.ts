import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { registerMarketDataSource, upsertMarketBars } from '../src/market-bars';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

async function asBrowserRole(db: Db, role: 'anon' | 'authenticated'): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await sql`select set_config('role', ${role}, true)`.execute(trx);
    await trx.selectFrom('app.market_bars').select('source_id').execute();
  });
}

describeIfDb('WX2 market bar cache — browser role isolation', () => {
  let db: Db;
  const sourceId = `wx2-rls-${randomUUID()}`;

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    await registerMarketDataSource(db, {
      id: sourceId,
      provider: 'wx2-test-provider',
      environment: 'test',
      mode: 'sandbox',
      version: 'fixture-v1',
      capabilities: {},
    });
    await upsertMarketBars(db, [
      {
        sourceId,
        symbol: 'EURUSD',
        interval: '5m',
        startTime: 300,
        open: '1.084500000000',
        high: '1.084700000000',
        low: '1.084400000000',
        close: '1.084600000000',
        isFinal: true,
        firstObservedSequence: 1,
        observedThroughSequence: 2,
        observedAt: new Date(302_000).toISOString(),
      },
    ]);
  });

  afterAll(async () => {
    await db.deleteFrom('app.market_bars').where('source_id', '=', sourceId).execute();
    await db.deleteFrom('app.market_data_sources').where('id', '=', sourceId).execute();
    await db.destroy();
  });

  it.each(['anon', 'authenticated'] as const)(
    'denies direct market-bar reads to the %s browser role',
    async (role) => {
      await expect(asBrowserRole(db, role)).rejects.toThrow(/permission denied/i);
    },
  );
});
