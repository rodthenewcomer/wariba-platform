import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
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

function isAuthorizedAdminRequest(authorizationHeader: string | undefined): boolean {
  if (!authorizationHeader?.startsWith('Bearer ')) return false;
  const provided = Buffer.from(authorizationHeader.slice('Bearer '.length));
  const expected = Buffer.from(config.WORKER_ADMIN_TOKEN);
  // timingSafeEqual throws on length mismatch rather than returning false —
  // compare against a fixed-length digest of both sides instead of the raw
  // (attacker-length-controlled) buffers, same defensive pattern as
  // packages/adapters' webhook signature check.
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

// Both the timer and the manual endpoint share this so they can never run
// the batch concurrently — finalizeDailyBoundaryForAccount/evaluateAndApply-
// AccountRisk are safe individually (row-locked per account), but two
// overlapping *runs* of the whole due-account batch have no such guard
// against each other, and a duplicate risk-evaluation pass for the same
// account/day was possible before this (see the deterministic
// triggerEventId fix in jobs/daily-finalization.ts for the other half of
// that bug).
let jobRunning = false;

async function runJobExclusively(): Promise<DailyFinalizationRunOutcome> {
  if (jobRunning) {
    logger.info('daily_finalization.run_skipped_already_running');
    return { skipped: true };
  }
  jobRunning = true;
  try {
    const result = await runDailyFinalizationJob(getDb(), { now: () => new Date(), logger });
    return { skipped: false, result };
  } finally {
    jobRunning = false;
  }
}

type DailyFinalizationRunOutcome =
  | { skipped: true }
  | { skipped: false; result: Awaited<ReturnType<typeof runDailyFinalizationJob>> };

const server = createServer((request, response) => {
  if (request.url === '/health') {
    const report = checkHealth();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(report));
    return;
  }
  if (request.url === '/jobs/daily-finalization' && request.method === 'POST') {
    if (!isAuthorizedAdminRequest(request.headers.authorization)) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } }));
      return;
    }
    runJobExclusively()
      .then((outcome) => {
        if (outcome.skipped) {
          response.writeHead(409, { 'content-type': 'application/json' });
          response.end(
            JSON.stringify({ error: { code: 'ALREADY_RUNNING', message: 'Job already running.' } }),
          );
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(outcome.result));
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
    runJobExclusively().catch((error: unknown) => {
      logger.error('daily_finalization.run_failed', { errorCode: (error as Error).message });
    });
  }, config.WORKER_POLL_INTERVAL_MS);
}

if (process.env.VITEST !== 'true') {
  start();
}

export { server };
