import { existsSync } from 'node:fs';
import process from 'node:process';
import { createRequire } from 'node:module';

/**
 * The gate every expensive test campaign runs behind.
 *
 * ## Why this exists
 *
 * A thirty-five minute certification that discovers at minute thirty-four that
 * it ran on the wrong Node major, or against a Supabase stack whose Auth
 * container was thrashing, has not certified anything — and worse, its failures
 * arrive looking like product defects. Every failure this script reports is
 * labelled `INFRASTRUCTURE_FAILURE`, because that is what it is, and because
 * the one thing that must never happen next is someone "fixing" product code to
 * make an unhealthy machine go green.
 *
 * It changes no file and writes to no table. It reads a version, opens three
 * connections, and measures how long they took.
 */

const REQUIRED_NODE_MAJOR = 24;

/*
 * Deliberately loose. These are not performance targets; they are the point at
 * which a local stack is so contended that a Playwright suite will start
 * timing out on round trips and reporting it as an authorization failure.
 */
const SLOW_MS = { db: 2_000, auth: 5_000, realtime: 5_000 };

function fail(reason, detail) {
  process.stderr.write(
    [
      '',
      'CERTIFICATION_ABORTED',
      '',
      'CLASSIFICATION = INFRASTRUCTURE_FAILURE',
      `REASON         = ${reason}`,
      detail ? `DETAIL         = ${detail}` : '',
      '',
      'No product file should be modified in response to this failure.',
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  process.exit(1);
}

function checkNode() {
  const actual = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  if (actual !== REQUIRED_NODE_MAJOR) {
    fail(
      'wrong Node major',
      `expected Node ${REQUIRED_NODE_MAJOR}, actual ${process.versions.node}. ` +
        'Run `nvm use` (the repository pins its version in .nvmrc).',
    );
  }
  return `NODE_MAJOR=${actual}`;
}

async function timed(label, run) {
  const started = performance.now();
  try {
    await run();
  } catch (error) {
    fail(`${label} unreachable`, error instanceof Error ? error.message : String(error));
  }
  return Math.round(performance.now() - started);
}

async function checkPostgres(require) {
  // `pg` is a dependency of @wariba/database, not of the repository root, so
  // resolve it the way that package would rather than adding a root dependency
  // whose only consumer is this script.
  const { Pool } = require(
    require.resolve('pg', {
      paths: [new URL('../packages/database/', import.meta.url).pathname],
    }),
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const ms = await timed('Postgres', async () => {
    await pool.query('select 1');
  });
  await pool.end();
  return { name: 'DB_SELECT_1_MS', ms, budget: SLOW_MS.db };
}

async function checkHttp(name, url, budget) {
  const ms = await timed(name, async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    // Auth answers 401 to an unauthenticated probe on some routes; the point of
    // the probe is that the process answers at all, not that it likes us.
    if (response.status >= 500) {
      throw new Error(`${url} answered ${response.status}`);
    }
  });
  return { name, ms, budget };
}

async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const require = createRequire(import.meta.url);

  const lines = [checkNode()];

  for (const name of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']) {
    if (!process.env[name]?.trim()) fail('missing environment variable', name);
  }

  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const probes = [
    await checkPostgres(require),
    await checkHttp('AUTH_PROBE_MS', `${supabaseUrl}/auth/v1/health`, SLOW_MS.auth),
    await checkHttp(
      'REALTIME_PROBE_MS',
      `${supabaseUrl}/realtime/v1/api/tenants`,
      SLOW_MS.realtime,
    ),
  ];

  const slow = probes.filter((probe) => probe.ms > probe.budget);
  for (const probe of probes) lines.push(`${probe.name}=${probe.ms}`);

  process.stdout.write(`\nPREFLIGHT\n${lines.map((line) => `  ${line}`).join('\n')}\n\n`);

  if (slow.length > 0) {
    fail(
      'local stack too slow to certify against',
      slow.map((probe) => `${probe.name}=${probe.ms} (budget ${probe.budget})`).join(', '),
    );
  }
  process.stdout.write('PREFLIGHT = pass\n\n');
}

await main();
