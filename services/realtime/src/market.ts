import type { Db, TradableSymbol } from '@wariba/database';
import {
  MockMarketDataProvider,
  ReplayMarketDataProvider,
  FcsMarketDataProvider,
  SANDBOX_BASE_PRICES,
  type MarketDataProvider,
  type SymbolSimConfig,
  type FcsSymbolConfig,
} from '@wariba/adapters';
import type { AssetClass } from '@wariba/contracts';
import type { RealtimeConfig } from './config';

export interface LoadedSymbolSpec {
  pricePrecision: number;
  spreadPoints: string;
  staleThresholdMs: number;
  contractSize: string;
  commissionPerLot: string;
  minimumQuantity: string;
  maximumQuantity: string;
  quantityStep: string;
  // W2 — presentation metadata for the Market Navigator's categories. Carried
  // here only so the one query that already reads this table can hand it to
  // the client; no execution, pricing or risk path reads it.
  assetClass: AssetClass;
  // Both kept here (not pre-resolved) because this map is loaded once and
  // shared across every connection/account — resolving to a single number
  // is a per-account decision made where the account's program is known
  // (see resolveLeverage below), not here.
  leverageOne: number;
  leveragePerformance: number;
}

/** Prompt 07 — picks the effective leverage for the account's program; never sends both numbers to the client. */
export function resolveLeverage(
  spec: LoadedSymbolSpec,
  programType: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE',
): number {
  return programType === 'WARIBA_ONE' ? spec.leverageOne : spec.leveragePerformance;
}

/**
 * Reads the published symbol spec set (the same one accounts pin to at
 * activation — see app.trading_accounts.symbol_spec_set_id) so the
 * simulator's spread/precision/stale-threshold always match what the
 * execution transaction will independently re-read for itself.
 */
export async function loadSymbolSpecs(db: Db): Promise<Record<TradableSymbol, LoadedSymbolSpec>> {
  const latestSet = await db
    .selectFrom('app.symbol_spec_sets')
    .select('id')
    .where('status', '=', 'sandbox_candidate')
    .orderBy('published_at', 'desc')
    .executeTakeFirst();
  if (!latestSet) {
    throw new Error(
      'No sandbox symbol spec set found — run the trading-core and Rules v1.1 migrations.',
    );
  }

  const specs = await db
    .selectFrom('app.symbol_specs')
    .select([
      'app.symbol_specs.symbol',
      'app.symbol_specs.asset_class',
      'app.symbol_specs.price_precision',
      'app.symbol_specs.spread_points',
      'app.symbol_specs.stale_threshold_ms',
      'app.symbol_specs.contract_size',
      'app.symbol_specs.commission_per_lot',
      'app.symbol_specs.minimum_quantity',
      'app.symbol_specs.maximum_quantity',
      'app.symbol_specs.quantity_step',
      'app.symbol_specs.leverage_one',
      'app.symbol_specs.leverage_performance',
    ])
    .where('app.symbol_specs.symbol_spec_set_id', '=', latestSet.id)
    .execute();

  if (specs.length === 0) {
    throw new Error(
      'No sandbox symbol_specs found — run the trading-core and Rules v1.1 migrations.',
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
      minimumQuantity: spec.minimum_quantity,
      maximumQuantity: spec.maximum_quantity,
      quantityStep: spec.quantity_step,
      leverageOne: spec.leverage_one,
      leveragePerformance: spec.leverage_performance,
      assetClass: spec.asset_class,
    };
  }
  return result;
}

export function buildMarketSimulator(
  specs: Record<TradableSymbol, LoadedSymbolSpec>,
  seed: number,
  tickIntervalMs: number,
): MockMarketDataProvider {
  const configs = {} as Record<TradableSymbol, SymbolSimConfig>;
  for (const symbol of Object.keys(specs) as TradableSymbol[]) {
    configs[symbol] = {
      basePrice: SANDBOX_BASE_PRICES[symbol],
      pricePrecision: specs[symbol].pricePrecision,
      spreadPoints: specs[symbol].spreadPoints,
      staleThresholdMs: specs[symbol].staleThresholdMs,
    };
  }
  return new MockMarketDataProvider(seed, configs, tickIntervalMs);
}

/**
 * Parses FCS_SYMBOL_MAP (Appendix 07-A §2 — provider symbol mapping, never
 * hardcoded). Empty/invalid input yields an empty map rather than throwing,
 * because it is only consulted when MARKET_DATA_PROVIDER=fcs is actually
 * selected — FcsMarketDataProvider's own constructor is what fails fast in
 * that case, not this parser.
 */
function parseFcsSymbolMap(raw: string): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Prompt 07B §5 — selects the live MarketDataProvider implementation purely
 * from config: MARKET_DATA_PROVIDER (mock | replay | fcs), with
 * MARKET_DATA_REPLAY_MODE=true forcing replay regardless of that value (a
 * safety override so an fcs config can be staged without risking a live
 * connection). No caller outside this function ever names a concrete
 * provider class.
 */
export function createMarketDataProvider(
  config: RealtimeConfig,
  specs: Record<TradableSymbol, LoadedSymbolSpec>,
): MarketDataProvider {
  if (config.MARKET_DATA_REPLAY_MODE || config.MARKET_DATA_PROVIDER === 'replay') {
    // No recorded fixture is wired yet — an empty recording still satisfies
    // the interface (every symbol reports 'closed', never a fabricated
    // price). Replace with a real captured session once one exists.
    return new ReplayMarketDataProvider(
      [],
      Object.keys(specs) as TradableSymbol[],
      config.MARKET_TICK_INTERVAL_MS,
    );
  }
  if (config.MARKET_DATA_PROVIDER === 'fcs') {
    const symbolMap = parseFcsSymbolMap(config.FCS_SYMBOL_MAP);
    const symbols = {} as Record<TradableSymbol, FcsSymbolConfig>;
    for (const symbol of Object.keys(specs) as TradableSymbol[]) {
      const providerSymbol = symbolMap[symbol];
      if (!providerSymbol) continue; // unmapped symbol stays unavailable rather than guessing a ticker
      symbols[symbol] = { providerSymbol, staleThresholdMs: specs[symbol].staleThresholdMs };
    }
    return new FcsMarketDataProvider({
      apiKey: config.FCS_API_KEY,
      wsPrimaryUrl: config.FCS_WS_PRIMARY_URL,
      wsSecondaryUrl: config.FCS_WS_SECONDARY_URL,
      restBaseUrl: config.FCS_REST_BASE_URL,
      symbols,
    });
  }
  return buildMarketSimulator(specs, config.SANDBOX_MARKET_SEED, config.MARKET_TICK_INTERVAL_MS);
}
