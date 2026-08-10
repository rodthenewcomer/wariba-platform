import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { createDbClient } from '@wariba/database';
import { createLogger, createCorrelationId } from '@wariba/observability';
import { loadRealtimeConfig } from './config';
import { checkHealth } from './health';
import { loadSymbolSpecs, createMarketDataProvider } from './market';
import { ConnectionRegistry } from './registry';
import { registerWebSocketRoute } from './websocket';
import { RealtimeLeadershipCoordinator } from './leadership';
import { RealtimeOperationalMetrics } from './metrics';
import { OperationalAlertMonitor } from './alert-monitor';

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
  const market = createMarketDataProvider(config, symbolSpecs);
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
  });

  app.addHook('onClose', async () => {
    alertMonitor.stop();
    market.stop();
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
