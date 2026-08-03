import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { createDbClient } from '@wariba/database';
import { createLogger, createCorrelationId } from '@wariba/observability';
import { loadRealtimeConfig } from './config';
import { checkHealth } from './health';
import { loadSymbolSpecs, buildMarketSimulator } from './market';
import { ConnectionRegistry } from './registry';
import { registerWebSocketRoute } from './websocket';

const config = loadRealtimeConfig();
const logger = createLogger({ service: 'realtime', minLevel: config.LOG_LEVEL });

const app = Fastify({ logger: false });

app.addHook('onRequest', async (request) => {
  (request as { correlationId?: string }).correlationId = createCorrelationId();
});

async function start(): Promise<void> {
  const db = createDbClient(config.DATABASE_URL);
  const symbolSpecs = await loadSymbolSpecs(db);
  const market = buildMarketSimulator(
    symbolSpecs,
    config.SANDBOX_MARKET_SEED,
    config.MARKET_TICK_INTERVAL_MS,
  );
  market.start();

  app.get('/health', async () => checkHealth(db, market, 'EURUSD'));

  await app.register(websocketPlugin);
  registerWebSocketRoute(app, {
    db,
    market,
    symbolSpecs,
    config,
    logger,
    registry: new ConnectionRegistry(),
  });

  try {
    const address = await app.listen({ port: config.REALTIME_PORT, host: '0.0.0.0' });
    logger.info('realtime.started', {
      address,
      port: config.REALTIME_PORT,
      seed: config.SANDBOX_MARKET_SEED,
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
