import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';

/**
 * Builds the app once, serves it once, and runs whatever was asked against it.
 *
 * ## The problem it removes
 *
 * Playwright's `webServer` was `pnpm build && pnpm start` with a 180 s budget.
 * Every targeted suite therefore paid for a full Next build, and a cold build
 * that overran the budget failed the run *before reaching a single test* — a
 * failure that reads, in a log, exactly like the suite failing. Running three
 * groups meant three builds.
 *
 * Here the campaign builds once, one production server serves every group, and
 * the server is torn down at the end. A group that fails fails on its own
 * merits.
 *
 * ## Why not `next start`
 *
 * The app is configured `output: 'standalone'`, and Next says plainly that
 * `next start` is not how standalone output is meant to be served. Running the
 * real standalone server is also the only way this harness exercises the same
 * artifact a container would.
 *
 * Usage:
 *   node scripts/certification-server.mjs [--no-build] -- <command> [args...]
 */

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const WEB = `${ROOT}/apps/web`;
const STANDALONE = `${WEB}/.next/standalone/apps/web`;
const PORT = process.env.CERTIFICATION_PORT ?? '3000';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const READY_TIMEOUT_MS = 120_000;

const separatorIndex = process.argv.indexOf('--');
if (separatorIndex < 0) {
  process.stderr.write('certification-server requires `--` before the command.\n');
  process.exit(1);
}
const flags = process.argv.slice(2, separatorIndex);
const [command, ...args] = process.argv.slice(separatorIndex + 1);
if (!command) {
  process.stderr.write('certification-server requires a command after `--`.\n');
  process.exit(1);
}

if (existsSync(`${ROOT}/.env.local`)) process.loadEnvFile(`${ROOT}/.env.local`);

function run(label, cmd, cmdArgs, options = {}) {
  process.stdout.write(`\n▸ ${label}\n`);
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', env: process.env, ...options });
  if (result.status !== 0) {
    process.stderr.write(`\n${label} failed (exit ${result.status}).\n`);
    process.exit(result.status ?? 1);
  }
}

/**
 * `standalone` traces only what the server imports, which by design excludes
 * the static assets and the public tree — Next expects the deployer to place
 * them. A server missing them serves a page with no CSS, and a visual suite
 * run against that is measuring the harness, not the product.
 */
async function stageStandaloneAssets() {
  await mkdir(`${STANDALONE}/.next`, { recursive: true });
  await cp(`${WEB}/.next/static`, `${STANDALONE}/.next/static`, { recursive: true });
  if (existsSync(`${WEB}/public`)) {
    await cp(`${WEB}/public`, `${STANDALONE}/public`, { recursive: true });
  }
}

async function waitForReady(child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/api/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) return;
    } catch {
      // Not up yet. The deadline is the only thing that ends this loop.
    }
    await delay(500);
  }
  throw new Error(`server did not answer ${BASE_URL}/api/health within ${READY_TIMEOUT_MS} ms`);
}

async function main() {
  run('preflight', 'node', [`${ROOT}/scripts/preflight.mjs`], { cwd: ROOT });

  if (!flags.includes('--no-build')) {
    run('build (once, for the whole campaign)', 'pnpm', ['build'], { cwd: ROOT });
  }
  if (!existsSync(`${STANDALONE}/server.js`)) {
    process.stderr.write(
      `\nCLASSIFICATION = INFRASTRUCTURE_FAILURE\nNo standalone server at ${STANDALONE}/server.js — run without --no-build.\n`,
    );
    process.exit(1);
  }
  await stageStandaloneAssets();

  process.stdout.write(`\n▸ starting one production server on ${BASE_URL}\n`);
  const server = spawn('node', ['server.js'], {
    cwd: STANDALONE,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT,
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      APP_ENV: process.env.APP_ENV ?? 'local',
      NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
    },
  });

  const stop = () => {
    if (server.exitCode === null) server.kill('SIGTERM');
  };
  process.on('exit', stop);
  process.on('SIGINT', () => {
    stop();
    process.exit(130);
  });

  try {
    await waitForReady(server);
  } catch (error) {
    stop();
    process.stderr.write(
      `\nCLASSIFICATION = INFRASTRUCTURE_FAILURE\n${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
  process.stdout.write('▸ server ready\n');

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: ROOT,
    env: {
      ...process.env,
      APP_BASE_URL: BASE_URL,
      // The server is already up and healthy; Playwright must reuse it rather
      // than starting a second build behind its own timeout.
      PLAYWRIGHT_WEB_SERVER_COMMAND: 'node -e "setInterval(()=>{},1<<30)"',
    },
  });
  stop();
  process.exit(result.status ?? 1);
}

await main();
