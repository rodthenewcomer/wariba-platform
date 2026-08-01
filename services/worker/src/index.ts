import { createServer } from 'node:http';
import { createLogger } from '@wariba/observability';
import { loadWorkerConfig } from './config';
import { checkHealth } from './health';

const config = loadWorkerConfig();
const logger = createLogger({ service: 'worker', minLevel: config.LOG_LEVEL });

const server = createServer((request, response) => {
  if (request.url === '/health') {
    const report = checkHealth();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(report));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found.' } }));
});

function start(): void {
  server.listen(config.WORKER_HEALTH_PORT, () => {
    logger.info('worker.started', { port: config.WORKER_HEALTH_PORT });
  });
}

if (process.env.VITEST !== 'true') {
  start();
}

export { server };
