import Fastify from 'fastify';
import { createLogger, createCorrelationId } from '@wariba/observability';
import { loadRealtimeConfig } from './config';
import { checkHealth } from './health';

const config = loadRealtimeConfig();
const logger = createLogger({ service: 'realtime', minLevel: config.LOG_LEVEL });

const app = Fastify({ logger: false });

app.addHook('onRequest', async (request) => {
  (request as { correlationId?: string }).correlationId = createCorrelationId();
});

app.get('/health', async () => checkHealth());

async function start(): Promise<void> {
  try {
    const address = await app.listen({ port: config.REALTIME_PORT, host: '0.0.0.0' });
    logger.info('realtime.started', { address, port: config.REALTIME_PORT });
  } catch (error) {
    logger.fatal('realtime.start_failed', { errorCode: (error as Error).message });
    process.exit(1);
  }
}

if (process.env.VITEST !== 'true') {
  void start();
}

export { app };
