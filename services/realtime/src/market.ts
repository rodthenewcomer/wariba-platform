import type { Db, TradableSymbol } from '@wariba/database';
import {
  SandboxMarketDataProvider,
  SANDBOX_BASE_PRICES,
  type SymbolSimConfig,
} from '@wariba/adapters';

export interface LoadedSymbolSpec {
  pricePrecision: number;
  spreadPoints: string;
  staleThresholdMs: number;
  contractSize: string;
  commissionPerLot: string;
}

/**
 * Reads the published symbol spec set (the same one accounts pin to at
 * activation — see app.trading_accounts.symbol_spec_set_id) so the
 * simulator's spread/precision/stale-threshold always match what the
 * execution transaction will independently re-read for itself.
 */
export async function loadSymbolSpecs(db: Db): Promise<Record<TradableSymbol, LoadedSymbolSpec>> {
  const specs = await db
    .selectFrom('app.symbol_specs')
    .innerJoin(
      'app.symbol_spec_sets',
      'app.symbol_spec_sets.id',
      'app.symbol_specs.symbol_spec_set_id',
    )
    .select([
      'app.symbol_specs.symbol',
      'app.symbol_specs.price_precision',
      'app.symbol_specs.spread_points',
      'app.symbol_specs.stale_threshold_ms',
      'app.symbol_specs.contract_size',
      'app.symbol_specs.commission_per_lot',
    ])
    .where('app.symbol_spec_sets.set_id', '=', 'WARIBA-SANDBOX-SYMBOLS-1.0.0')
    .execute();

  if (specs.length === 0) {
    throw new Error(
      'No symbol_specs found for WARIBA-SANDBOX-SYMBOLS-1.0.0 — run the trading-core migration.',
    );
  }

  const result = {} as Record<TradableSymbol, LoadedSymbolSpec>;
  for (const spec of specs) {
    result[spec.symbol] = {
      pricePrecision: spec.price_precision,
      spreadPoints: spec.spread_points,
      staleThresholdMs: spec.stale_threshold_ms,
      contractSize: spec.contract_size,
      commissionPerLot: spec.commission_per_lot,
    };
  }
  return result;
}

export function buildMarketSimulator(
  specs: Record<TradableSymbol, LoadedSymbolSpec>,
  seed: number,
  tickIntervalMs: number,
): SandboxMarketDataProvider {
  const configs = {} as Record<TradableSymbol, SymbolSimConfig>;
  for (const symbol of Object.keys(specs) as TradableSymbol[]) {
    configs[symbol] = {
      basePrice: SANDBOX_BASE_PRICES[symbol],
      pricePrecision: specs[symbol].pricePrecision,
      spreadPoints: specs[symbol].spreadPoints,
      staleThresholdMs: specs[symbol].staleThresholdMs,
    };
  }
  return new SandboxMarketDataProvider(seed, configs, tickIntervalMs);
}
