import { createServer } from 'node:http';
import { createDbClient, type Db } from '@wariba/database';
import { createLogger } from '@wariba/observability';
import { loadWorkerConfig } from './config';
import { checkHealth } from './health';
import { runDailyFinalizationJob } from './jobs/daily-finalization';

const config = loadWorkerConfig();
const logger = createLogger({ service: 'worker', minLevel: config.LOG_LEVEL });

// Lazy: only opened when a route actually needs it, so /health keeps working
// even if the job or its DB connection is misconfigured.
let dbInstance: Db | undefined;
function getDb(): Db {
  if (!dbInstance) {
    dbInstance = createDbClient(config.DATABASE_URL);
  }
  return dbInstance;
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    const report = checkHealth();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(report));
    return;
  }
  if (request.url === '/jobs/daily-finalization' && request.method === 'POST') {
    runDailyFinalizationJob(getDb(), { now: () => new Date(), logger })
      .then((result) => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(result));
      })
      .catch((error: unknown) => {
        logger.error('daily_finalization.run_failed', { errorCode: (error as Error).message });
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: { code: 'INTERNAL', message: 'Job run failed.' } }));
      });
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found.' } }));
});

function start(): void {
  server.listen(config.WORKER_HEALTH_PORT, () => {
    logger.info('worker.started', { port: config.WORKER_HEALTH_PORT });
  });

  setInterval(() => {
    runDailyFinalizationJob(getDb(), { now: () => new Date(), logger }).catch((error: unknown) => {
      logger.error('daily_finalization.run_failed', { errorCode: (error as Error).message });
    });
  }, config.WORKER_POLL_INTERVAL_MS);
}

if (process.env.VITEST !== 'true') {
  start();
}

export { server };
