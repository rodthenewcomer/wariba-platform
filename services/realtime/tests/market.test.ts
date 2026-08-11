import { describe, expect, it } from 'vitest';
import type { TradableSymbol } from '@wariba/database';
import {
  MockMarketDataProvider,
  ReplayMarketDataProvider,
  FcsMarketDataProvider,
} from '@wariba/adapters';
import { createMarketDataProvider, type LoadedSymbolSpec } from '../src/market';
import type { RealtimeConfig } from '../src/config';

const SPECS: Record<TradableSymbol, LoadedSymbolSpec> = {
  EURUSD: {
    pricePrecision: 5,
    spreadPoints: '10',
    staleThresholdMs: 5000,
    contractSize: '100000',
    commissionPerLot: '0',
    minimumQuantity: '0.01',
    maximumQuantity: '100',
    quantityStep: '0.01',
    leverageOne: 100,
    leveragePerformance: 100,
    assetClass: 'forex_major',
  },
} as Record<TradableSymbol, LoadedSymbolSpec>;

function baseConfig(overrides: Partial<RealtimeConfig> = {}): RealtimeConfig {
  return {
    APP_ENV: 'local',
    LOG_LEVEL: 'info',
    REALTIME_PORT: 4001,
    INSTANCE_ID: 'realtime-test',
    LEADER_LEASE_DURATION_MS: 4000,
    LEADER_RENEW_INTERVAL_MS: 1000,
    DATABASE_URL: 'postgres://x',
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    MARKET_DATA_PROVIDER: 'mock',
    MARKET_DATA_REPLAY_MODE: false,
    MARKET_DATA_ENABLED: true,
    FCS_API_KEY: '',
    FCS_WS_PRIMARY_URL: '',
    FCS_WS_SECONDARY_URL: '',
    FCS_REST_BASE_URL: '',
    FCS_SYMBOL_MAP: '',
    SANDBOX_MARKET_SEED: 1,
    MARKET_TICK_INTERVAL_MS: 1000,
    ACCOUNT_RISK_PREVIEW_INTERVAL_MS: 4000,
    OPERATIONAL_ALERT_INTERVAL_MS: 30000,
    LEADER_TAKEOVER_TARGET_MS: 10000,
    ...overrides,
  };
}

describe('createMarketDataProvider — Prompt 07B provider selection', () => {
  it('defaults to MockMarketDataProvider', () => {
    const provider = createMarketDataProvider(baseConfig(), SPECS);
    expect(provider).toBeInstanceOf(MockMarketDataProvider);
  });

  it('selects ReplayMarketDataProvider when MARKET_DATA_PROVIDER=replay', () => {
    const provider = createMarketDataProvider(
      baseConfig({ MARKET_DATA_PROVIDER: 'replay' }),
      SPECS,
    );
    expect(provider).toBeInstanceOf(ReplayMarketDataProvider);
  });

  it('forces ReplayMarketDataProvider when MARKET_DATA_REPLAY_MODE=true, even with MARKET_DATA_PROVIDER=fcs', () => {
    const provider = createMarketDataProvider(
      baseConfig({ MARKET_DATA_PROVIDER: 'fcs', MARKET_DATA_REPLAY_MODE: true }),
      SPECS,
    );
    expect(provider).toBeInstanceOf(ReplayMarketDataProvider);
  });

  it('selects FcsMarketDataProvider when MARKET_DATA_PROVIDER=fcs and a key is present', () => {
    const provider = createMarketDataProvider(
      baseConfig({
        MARKET_DATA_PROVIDER: 'fcs',
        FCS_API_KEY: 'real-key',
        FCS_WS_PRIMARY_URL: 'wss://primary',
        FCS_REST_BASE_URL: 'https://rest',
        FCS_SYMBOL_MAP: JSON.stringify({ EURUSD: 'EUR/USD' }),
      }),
      SPECS,
    );
    expect(provider).toBeInstanceOf(FcsMarketDataProvider);
  });

  it('throws MarketDataProviderBlockedError when MARKET_DATA_PROVIDER=fcs without a key', () => {
    expect(() =>
      createMarketDataProvider(baseConfig({ MARKET_DATA_PROVIDER: 'fcs' }), SPECS),
    ).toThrow();
  });
});
