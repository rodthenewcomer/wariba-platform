import type { Db, TradableSymbol } from '@wariba/database';
import type { MarketDataProvider } from '@wariba/adapters';

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: 'realtime';
  timestamp: string;
  database: 'ok' | 'unreachable';
  market: 'ok' | 'unreachable';
}

/**
 * §119: DB and market-adapter checks, added alongside the realtime
 * connection itself in Prompt 04.
 */
export async function checkHealth(
  db: Db,
  market: MarketDataProvider,
  sampleSymbol: TradableSymbol,
  now: () => Date = () => new Date(),
): Promise<HealthReport> {
  let database: HealthReport['database'] = 'ok';
  try {
    await db.selectFrom('app.symbol_specs').select('id').limit(1).execute();
  } catch {
    database = 'unreachable';
  }

  let marketStatus: HealthReport['market'] = 'ok';
  try {
    market.getSnapshot(sampleSymbol);
  } catch {
    marketStatus = 'unreachable';
  }

  return {
    status: database === 'ok' && marketStatus === 'ok' ? 'ok' : 'degraded',
    service: 'realtime',
    timestamp: now().toISOString(),
    database,
    market: marketStatus,
  };
}
