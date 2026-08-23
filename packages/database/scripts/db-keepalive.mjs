#!/usr/bin/env node
/**
 * Keeps the hosted Supabase project from being paused for inactivity — and
 * tells us the moment it becomes unreachable.
 *
 * ## Why this exists
 *
 * Supabase pauses a free-tier project after roughly a week with no database
 * activity. WARIBA's hosted project was paused exactly that way, and the
 * failure mode is worse than it sounds: a paused project has its DNS
 * withdrawn, so the symptom is `NXDOMAIN` on the database host and
 * "tenant not found" from the pooler. That reads like a *deleted* project
 * rather than a dormant one, and it cost this session a wrong diagnosis
 * before the truth came out.
 *
 * A private beta cannot survive that. A tester who arrives on the eighth quiet
 * day meets a dead product, and the platform gives no warning before it
 * happens.
 *
 * ## What it actually does
 *
 * One read-only query, against real tables, on a schedule. That is enough to
 * reset the inactivity clock. It deliberately does *more* than the minimum
 * `SELECT 1`:
 *
 * - it reads `app.policy_versions`, so a pass means the schema is genuinely
 *   present rather than merely that a TCP connection opened against an empty
 *   database;
 * - it reports latency, so a project that is technically awake but degrading
 *   shows up before it fails;
 * - it exits non-zero on any failure, which turns the scheduled run into a
 *   free availability monitor. That is most of the value: WARIBA currently has
 *   no error tracking and no uptime provider (`ARCH-026`, `OPS-011` are both
 *   `OPEN`), so until 3.7 this is the only thing that will notice the database
 *   is gone.
 *
 * It writes nothing. A keepalive that mutates data is a keepalive that will
 * eventually corrupt something at 3am.
 *
 * ## What it is not
 *
 * Not a substitute for a paid plan. Pausing is a free-tier behaviour; the
 * actual fix is a plan that does not pause, and this script's own log says so
 * on every run. It is the right answer while the project is free, and a
 * cheap liveness probe afterwards.
 *
 * Not needed forever. Once `services/worker` is deployed (3.1B) it polls the
 * database every `WORKER_POLL_INTERVAL_MS` — a minute by default — and the
 * project can never be idle again. This script covers the gap between now and
 * then, and stays useful afterwards only as an external check that does not
 * depend on our own infrastructure being up.
 *
 * ## Usage
 *
 *   DATABASE_URL=postgresql://… node scripts/db-keepalive.mjs
 *
 * Exit codes: 0 reachable · 1 unreachable or query failed · 2 not configured.
 */
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

/** Generous: a paused project fails fast, a cold one may take a few seconds. */
const TIMEOUT_MS = Number(process.env.KEEPALIVE_TIMEOUT_MS ?? 20_000);

function log(level, event, fields = {}) {
  // Same shape as @wariba/observability so these lines read like the rest of
  // the platform's logs rather than like a stray script.
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: 'db-keepalive',
      event,
      ...fields,
    })}\n`,
  );
}

if (!DATABASE_URL) {
  // Exit 2, not 1: "nobody configured this" and "the database is down" are
  // different facts and a monitor must not confuse them. A fork with no secret
  // should not page anyone.
  log('warn', 'keepalive.not_configured', {
    detail: 'DATABASE_URL is not set — nothing to keep alive.',
  });
  process.exit(2);
}

/**
 * Validate the DSN before handing it to `pg`.
 *
 * `new pg.Client()` throws a bare `TypeError: Invalid URL` on a malformed
 * connection string, outside any try block, so the operator sees a stack trace
 * through `pg-connection-string` and no indication of what to fix. GitHub then
 * redacts the offending value as `*****REDACTED*****`, which removes the last
 * clue.
 *
 * The overwhelmingly common cause is worth naming explicitly: Supabase's
 * dashboard hands you a URI containing a literal `[YOUR-PASSWORD]`, and the
 * square brackets alone make it an invalid URL — Node reads them as an IPv6
 * literal. Pasting that string unedited into a secret is a two-second mistake
 * that produces a completely opaque failure.
 *
 * Nothing here logs the value.
 */
function describeInvalidDsn(dsn) {
  if (/\[YOUR-PASSWORD\]|\[YOUR_PASSWORD\]/i.test(dsn)) {
    return 'The connection string still contains the literal [YOUR-PASSWORD] placeholder from the Supabase dashboard. Replace it with the real database password.';
  }
  if (/^["']|["']$/.test(dsn)) {
    return 'The connection string is wrapped in quotes. Store the raw value, without surrounding quotes.';
  }
  if (dsn !== dsn.trim()) {
    return 'The connection string has leading or trailing whitespace (often a trailing newline from a copy-paste).';
  }
  if (!/^postgres(ql)?:\/\//.test(dsn.trim())) {
    return 'The value does not start with postgresql:// — this should be the pooled connection string from Project Settings → Database, not the project URL or an API key.';
  }
  try {
    new URL(dsn.trim());
  } catch {
    return 'The connection string is not a parseable URL. Check for unescaped special characters in the password (@ : / ? # [ ] must be percent-encoded).';
  }
  return null;
}

const invalid = describeInvalidDsn(DATABASE_URL);
if (invalid) {
  log('error', 'keepalive.invalid_connection_string', {
    detail: invalid,
    hint: 'Project Settings → Database → Connection string → Transaction pooler (port 6543).',
  });
  process.exit(1);
}

const dsn = DATABASE_URL.trim();

let client;
try {
  client = new pg.Client({
    connectionString: dsn,
    connectionTimeoutMillis: TIMEOUT_MS,
    query_timeout: TIMEOUT_MS,
    // Supabase terminates plaintext connections; the pooler certificate is not
    // in the runner's trust store, and pinning it here would be a credential to
    // rotate. Encrypted transport without chain verification is the documented
    // Supabase client posture for this exact case.
    ssl:
      dsn.includes('localhost') || dsn.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
  });
} catch (error) {
  // Never interpolate the DSN into the message.
  log('error', 'keepalive.client_construction_failed', {
    errorCode: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
}

const started = Date.now();

try {
  await client.connect();

  // Real tables, not SELECT 1 — see the note above on why.
  const { rows } = await client.query(
    `select
       (select count(*)::int from app.policy_versions) as policy_versions,
       (select count(*)::int from app.products)        as products,
       current_database()                              as database,
       now()                                           as server_time`,
  );

  const latencyMs = Date.now() - started;
  const row = rows[0];

  if (!row || row.policy_versions === 0) {
    // Reachable but empty means we woke up the wrong project, or migrations
    // never ran. Both are failures worth shouting about.
    log('error', 'keepalive.schema_unexpected', {
      latencyMs,
      policyVersions: row?.policy_versions ?? null,
      detail: 'Database answered but app.policy_versions is empty.',
    });
    process.exit(1);
  }

  log('info', 'keepalive.ok', {
    latencyMs,
    database: row.database,
    policyVersions: row.policy_versions,
    products: row.products,
    serverTime: row.server_time,
  });
  process.exit(0);
} catch (error) {
  const latencyMs = Date.now() - started;
  const message = error instanceof Error ? error.message : String(error);

  // The two signatures a paused Supabase project produces, named explicitly so
  // the next person does not repeat this session's misdiagnosis.
  const paused =
    message.includes('ENOTFOUND') ||
    message.includes('Tenant or user not found') ||
    message.includes('tenant/user');

  log('error', paused ? 'keepalive.project_unreachable_possibly_paused' : 'keepalive.failed', {
    latencyMs,
    errorCode: message,
    ...(paused
      ? {
          detail:
            'ENOTFOUND / tenant-not-found is what a PAUSED Supabase project looks like — ' +
            'the DNS record is withdrawn. Check the dashboard before concluding it was deleted.',
        }
      : {}),
  });
  process.exit(1);
} finally {
  await client?.end().catch(() => {});
}
