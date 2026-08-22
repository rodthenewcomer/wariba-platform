import {
  OandaHistoricalProvider,
  TwelveDataHistoricalProvider,
  assertOandaEnvironmentAllowed,
  parseOandaSymbolMap,
  parseTwelveDataSymbolMap,
  type HistoricalMarketDataProvider,
} from '@wariba/adapters';
import type { RealtimeConfig } from './config';

/**
 * WX3 — selects the historical archive purely from config, exactly as
 * `createMarketDataProvider` does for ticks. No caller outside this function
 * ever names a concrete historical provider class, which is what keeps adding
 * a third vendor an adapter change rather than a chart change.
 *
 * Returns `null` for `MARKET_HISTORY_PROVIDER=none`, which is the WX2
 * behaviour unchanged: WariX serves the observations it genuinely owns and
 * fabricates nothing to fill the difference.
 */
export function createHistoricalMarketDataProvider(
  config: RealtimeConfig,
): HistoricalMarketDataProvider | null {
  if (config.MARKET_HISTORY_PROVIDER === 'twelve-data') {
    return new TwelveDataHistoricalProvider({
      apiKey: config.TWELVE_DATA_API_KEY,
      baseUrl: config.TWELVE_DATA_BASE_URL,
      symbols: parseTwelveDataSymbolMap(config.TWELVE_DATA_SYMBOL_MAP),
      displayRights: config.MARKET_HISTORY_DISPLAY_RIGHTS,
    });
  }
  if (config.MARKET_HISTORY_PROVIDER === 'oanda') {
    // The licensing conclusion from the provider evaluation, enforced before a
    // single request is issued rather than trusted to deployment discipline.
    assertOandaEnvironmentAllowed(config.APP_ENV);
    return new OandaHistoricalProvider({
      apiToken: config.OANDA_API_TOKEN,
      baseUrl: config.OANDA_BASE_URL,
      environment: config.OANDA_ENVIRONMENT,
      symbols: parseOandaSymbolMap(config.OANDA_SYMBOL_MAP),
    });
  }
  return null;
}
