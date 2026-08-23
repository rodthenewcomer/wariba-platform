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
  /*
   * Liveness and readiness are different questions and container platforms
   * ask them separately.
   *
   * `/health` answers "is this process alive" — it must stay cheap and must
   * not touch the database, or a database blip restarts a worker that was
   * perfectly capable of coming back on its own.
   *
   * `/ready` answers "can this process do its job", which for the worker means
   * one thing: can it reach the database it finalises days in. A platform that
   * routes work to an unready instance gets silent no-ops; one that restarts on
   * a failed *liveness* probe gets a crash loop. Splitting them is what makes
   * either probe safe to act on.
   *
   * Draining wins over both: once SIGTERM has arrived this instance is going
   * away and should stop being sent work immediately.
   */
  if (request.url === '/ready') {
    if (draining) {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'draining', service: 'worker' }));
      return;
    }
    getDb()
      .selectFrom('app.trading_accounts')
      .select('id')
      .limit(1)
      .execute()
      .then(() => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            status: 'ready',
            service: 'worker',
            database: 'ok',
            jobRunning,
            timestamp: new Date().toISOString(),
          }),
        );
      })
      .catch(() => {
        // The reason is deliberately absent: this endpoint is reachable by the
        // platform and a database error string can name a host or a role.
        response.writeHead(503, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'not_ready', service: 'worker', database: 'error' }));
      });
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

let draining = false;
let pollTimer: NodeJS.Timeout | undefined;

/**
 * Stop accepting work, let the current run finish, then close.
 *
 * Container platforms stop a process by sending SIGTERM and killing it a grace
 * period later. Until now nothing in this service listened, so every deploy,
 * scale-down and restart would have terminated the worker at whatever point it
 * happened to be in — including mid-batch, between finalising one account's day
 * and the next. The batch is safe to *re-run* (each account is row-locked and
 * the trigger event id is deterministic), so nothing corrupts; but the run is
 * abandoned silently and the next poll is a full minute away.
 *
 * The order matters. The timer is cleared first so no new run can start, then
 * readiness starts failing so the platform stops routing to us, then we wait
 * for the in-flight batch, and only then do we close the socket and the pool.
 * Closing the pool while a batch holds a row lock is how a graceful shutdown
 * turns into a stuck transaction.
 */
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (draining) return;
  draining = true;
  logger.info('worker.shutdown_started', { signal });

  if (pollTimer) clearInterval(pollTimer);

  // Bounded: a hung batch must not hold the deploy open forever. The platform's
  // own grace period is the outer limit; this stays inside it.
  const deadline = Date.now() + SHUTDOWN_GRACE_MS;
  while (jobRunning && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (jobRunning) {
    logger.warn('worker.shutdown_job_still_running', { graceMs: SHUTDOWN_GRACE_MS });
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (dbInstance) await dbInstance.destroy();

  logger.info('worker.shutdown_complete', { signal });
  process.exit(0);
}

/** Inside a typical 30s platform grace period, with room for the close. */
const SHUTDOWN_GRACE_MS = 25_000;

function start(): void {
  server.listen(config.WORKER_HEALTH_PORT, () => {
    logger.info('worker.started', { port: config.WORKER_HEALTH_PORT });
  });

  pollTimer = setInterval(() => {
    if (draining) return;
    runJobExclusively().catch((error: unknown) => {
      logger.error('daily_finalization.run_failed', { errorCode: (error as Error).message });
    });
  }, config.WORKER_POLL_INTERVAL_MS);

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }
}

if (process.env.VITEST !== 'true') {
  start();
}

export { server, shutdown };
