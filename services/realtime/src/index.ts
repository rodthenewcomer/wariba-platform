import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import {
  createDbClient,
  loadMarketSourceSequenceWatermarks,
  type TradableSymbol,
} from '@wariba/database';
import { createLogger, createCorrelationId } from '@wariba/observability';
import { loadRealtimeConfig } from './config';
import { checkHealth } from './health';
import { loadSymbolSpecs, createMarketDataProvider } from './market';
import { ConnectionRegistry } from './registry';
import { registerWebSocketRoute } from './websocket';
import { RealtimeLeadershipCoordinator } from './leadership';
import { RealtimeOperationalMetrics } from './metrics';
import { OperationalAlertMonitor } from './alert-monitor';
import { DurableMarketHistoryStore } from './durable-market-history-store';
import { MarketSequenceContinuityProvider } from './market-sequence-continuity';
import { MarketHistoryBackfillEngine } from './market-history-backfill';
import { createHistoricalMarketDataProvider } from './market-history-provider-factory';
import { ProviderMarketHistoryStore } from './provider-market-history-store';
import { assessDisplayLicense, reportDisplayLicense } from './market-history-display-gate';
import { MarketHistoryRepairService } from './market-history-repair';

const config = loadRealtimeConfig();
const logger = createLogger({ service: 'realtime', minLevel: config.LOG_LEVEL });

const app = Fastify({ logger: false });

app.addHook('onRequest', async (request) => {
  (request as { correlationId?: string }).correlationId = createCorrelationId();
});

async function start(): Promise<void> {
  const db = createDbClient(config.DATABASE_URL);
  const leadership = new RealtimeLeadershipCoordinator(db, {
    instanceId: config.INSTANCE_ID,
    leaseDurationMs: config.LEADER_LEASE_DURATION_MS,
    renewIntervalMs: config.LEADER_RENEW_INTERVAL_MS,
    logger,
  });
  await leadership.start();
  const metrics = new RealtimeOperationalMetrics();
  const symbolSpecs = await loadSymbolSpecs(db);
  const provider = createMarketDataProvider(config, symbolSpecs);
  const sequenceWatermarks = await loadMarketSourceSequenceWatermarks(db, provider.source.id);
  const market = new MarketSequenceContinuityProvider(provider, sequenceWatermarks);
  const pricePrecision = Object.fromEntries(
    (Object.keys(symbolSpecs) as TradableSymbol[]).map((symbol) => [
      symbol,
      symbolSpecs[symbol].pricePrecision,
    ]),
  ) as Record<TradableSymbol, number>;
  const observedHistory = new DurableMarketHistoryStore({
    db,
    source: market.source,
    pricePrecision,
    logger,
    onFlush: (result) => metrics.historyFlush(result),
  });
  // WX3 — when a historical archive is configured, the chart reads genuine
  // provider bars and the observed cache keeps doing exactly what WX2 built it
  // for. When none is configured this is the WX2 path, byte for byte.
  const historyProvider = createHistoricalMarketDataProvider(config);
  const backfillEngine =
    historyProvider === null
      ? null
      : new MarketHistoryBackfillEngine({
          db,
          provider: historyProvider,
          pricePrecision,
          logger,
          rateLimit: {
            capacity: config.MARKET_HISTORY_RATE_LIMIT,
            windowMs: config.MARKET_HISTORY_RATE_WINDOW_MS,
          },
        });
  const history =
    historyProvider === null || backfillEngine === null
      ? observedHistory
      : new ProviderMarketHistoryStore({
          db,
          observed: observedHistory,
          backfill: backfillEngine,
          providerSource: historyProvider.source,
          realtimeSource: market.source,
          pricePrecision,
          logger,
          cutover: {
            mode: config.MARKET_HISTORY_CUTOVER,
            toleranceBps: config.MARKET_HISTORY_CUTOVER_TOLERANCE_BPS,
          },
        });
  await history.initialize();
  let historyRepair: MarketHistoryRepairService | null = null;
  if (historyProvider !== null && backfillEngine !== null) {
    logger.info('realtime.market_history_provider_selected', {
      provider: historyProvider.providerName,
      sourceId: historyProvider.source.id,
      environment: historyProvider.source.environment,
      nativeIntervals: historyProvider.nativeTimeframes,
      realtimeSourceId: market.source.id,
    });
    // WX3.1 §5 — say out loud what this deployment is licensed to show.
    reportDisplayLicense(assessDisplayLicense(historyProvider, config.APP_ENV), logger);

    historyRepair = new MarketHistoryRepairService({
      db,
      backfill: backfillEngine,
      symbols: Object.keys(symbolSpecs) as TradableSymbol[],
      logger,
    });
    // WX3.1 §3 — a restart is a break in continuity, so the first thing the
    // process does once history is durable is close whatever hole it left.
    // Deliberately not awaited: chart history repair must never delay the
    // realtime feed or execution coming up.
    void historyRepair.repair('service_start').catch((error: unknown) => {
      logger.warn('history.gap.repair_pass_failed', {
        trigger: 'service_start',
        errorCode: error instanceof Error ? error.message : 'unknown_error',
      });
    });
  }
  if (config.MARKET_DATA_ENABLED) {
    market.start();
  } else {
    logger.warn('realtime.market_data_disabled', { provider: market.providerName });
  }

  const alertMonitor = new OperationalAlertMonitor({
    db,
    market,
    symbols: Object.keys(symbolSpecs) as (keyof typeof symbolSpecs)[],
    leadership,
    intervalMs: config.OPERATIONAL_ALERT_INTERVAL_MS,
    takeoverTargetMs: config.LEADER_TAKEOVER_TARGET_MS,
    marketDataEnabled: config.MARKET_DATA_ENABLED,
    logger,
  });
  alertMonitor.start();

  app.get('/health', async () =>
    checkHealth(db, market, 'EURUSD', leadership.readiness(), metrics.snapshot()),
  );
  app.get('/metrics', async () => ({
    service: 'realtime',
    instanceId: config.INSTANCE_ID,
    leadership: leadership.readiness(),
    metrics: metrics.snapshot(),
  }));

  await app.register(websocketPlugin);
  registerWebSocketRoute(app, {
    db,
    market,
    symbolSpecs,
    config,
    logger,
    registry: new ConnectionRegistry(),
    leadership,
    metrics,
    history,
  });

  app.addHook('onClose', async () => {
    alertMonitor.stop();
    market.stop();
    await history.close();
    await leadership.stop();
    await db.destroy();
  });

  try {
    const address = await app.listen({ port: config.REALTIME_PORT, host: '0.0.0.0' });
    logger.info('realtime.started', {
      address,
      port: config.REALTIME_PORT,
      seed: config.SANDBOX_MARKET_SEED,
      marketDataProvider: market.providerName,
      marketDataSourceId: market.source.id,
      marketDataMode: market.source.mode,
      marketDataCapabilities: market.source.capabilities,
      restoredSequenceWatermarks: Object.keys(sequenceWatermarks).length,
      instanceId: config.INSTANCE_ID,
      leadership: leadership.readiness().role,
    });
  } catch (error) {
    logger.fatal('realtime.start_failed', { errorCode: (error as Error).message });
    process.exit(1);
  }
}

if (process.env.VITEST !== 'true') {
  void start();
}

export { app };
