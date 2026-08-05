#!/usr/bin/env tsx
/**
 * Prompt 7 Appendix 07-B, gate 5 — 150-concurrent-connection load test
 * against a running services/realtime instance. Run against the same
 * local stack the E2E suite uses (supabase start + `pnpm --filter
 * @wariba/realtime start`, or CI's "Database, RLS and E2E" job) —
 * DATABASE_URL / SUPABASE_URL / SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY must already be set.
 *
 * All CONCURRENCY connections share a single seeded account/session
 * rather than provisioning one Supabase user each — this is a deliberate
 * choice, not a shortcut: nothing in services/realtime scopes state by
 * connection *identity*, only by connection *count* (registry.ts's Map,
 * the pg.Pool, the heartbeat loop), so what actually needs stressing is
 * "N simultaneous connections/subscriptions," which many sessions for one
 * account exercises identically to many different accounts would, at a
 * fraction of the setup cost and flakiness (150 Supabase Auth admin-API
 * user creations would itself become the slow, failure-prone part of this
 * test).
 *
 * What this specifically validates, tying back to fixes made earlier in
 * this same release:
 *   - The subscribe-channel cap (packages/contracts/src/control.ts) and
 *     per-connection ownership check don't buckle under concurrent load.
 *   - The heartbeat loop (services/realtime/src/websocket.ts) actually
 *     keeps connections alive under load — HOLD_OPEN_MS is deliberately
 *     longer than one heartbeat interval, so a regression of the "server
 *     never sends a real ping" bug would show up as mass disconnects here.
 *   - The pg.Pool (default 10 connections) isn't exhausted by 150
 *     concurrent initial-snapshot fetches landing at once.
 */
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';
import { accountStateChannel, marketSymbolChannel } from '@wariba/contracts';

const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 150);
const HOLD_OPEN_MS = Number(process.env.LOAD_TEST_HOLD_OPEN_MS ?? 20_000);
const MIN_SUCCESS_RATIO = Number(process.env.LOAD_TEST_MIN_SUCCESS_RATIO ?? 0.95);
const CONNECT_TIMEOUT_MS = 10_000;
const SNAPSHOT_TIMEOUT_MS = 15_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`load-test: missing required env var ${name}`);
  return value;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const DATABASE_URL = requireEnv('DATABASE_URL');
const REALTIME_WS_URL = process.env.NEXT_PUBLIC_REALTIME_WS_URL ?? 'ws://127.0.0.1:4001/ws';

async function createTestUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`createTestUser failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function deleteTestUser(id: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`signIn failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

async function activateTestAccount(db: Db, userId: string): Promise<string> {
  const productVersion = await db
    .selectFrom('app.product_versions')
    .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
    .select([
      'app.product_versions.id',
      'app.products.nominal_balance',
      'app.products.nominal_currency',
    ])
    .where('app.products.code', '=', '10K')
    .executeTakeFirstOrThrow();

  const order = await db
    .insertInto('app.purchase_orders')
    .values({
      user_id: userId,
      product_version_id: productVersion.id,
      idempotency_key: randomUUID(),
      status: 'paid',
      total_amount: '39900.00',
      total_currency: 'XOF',
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const account = await activateEvaluationAccount(db, {
    purchaseOrderId: order.id,
    userId,
    nominalBalance: productVersion.nominal_balance,
    currency: productVersion.nominal_currency,
  });
  return account.id;
}

interface ConnectionResult {
  ok: boolean;
  connectMs: number | null;
  snapshotMs: number | null;
  error: string | null;
  droppedEarly: boolean;
}

function runConnection(token: string, accountId: string): Promise<ConnectionResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let connectedAt: number | null = null;
    let snapshotAt: number | null = null;
    let settled = false;
    let heldOpenTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: ConnectionResult) => {
      if (settled) return;
      settled = true;
      if (heldOpenTimer) clearTimeout(heldOpenTimer);
      try {
        socket.close();
      } catch {
        // already closed — fine.
      }
      resolve(result);
    };

    const socket = new WebSocket(`${REALTIME_WS_URL}?token=${encodeURIComponent(token)}`);

    const connectTimer = setTimeout(() => {
      finish({
        ok: false,
        connectMs: null,
        snapshotMs: null,
        error: 'connect timeout',
        droppedEarly: false,
      });
    }, CONNECT_TIMEOUT_MS);

    const snapshotTimer = setTimeout(() => {
      finish({
        ok: false,
        connectMs: connectedAt !== null ? connectedAt - startedAt : null,
        snapshotMs: null,
        error: 'snapshot timeout',
        droppedEarly: false,
      });
    }, SNAPSHOT_TIMEOUT_MS);

    socket.on('open', () => {
      connectedAt = Date.now();
      clearTimeout(connectTimer);
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          channels: [accountStateChannel(accountId), marketSymbolChannel('EURUSD')],
        }),
      );
    });

    socket.on('message', (raw: Buffer) => {
      if (snapshotAt !== null) return;
      let envelope: { type?: string };
      try {
        envelope = JSON.parse(raw.toString()) as { type?: string };
      } catch {
        return;
      }
      if (envelope.type === 'account.snapshot') {
        const resolvedConnectedAt = connectedAt ?? Date.now();
        snapshotAt = Date.now();
        clearTimeout(snapshotTimer);
        // Hold the connection open past one heartbeat interval, then close
        // cleanly — proves the connection survives under concurrent load,
        // not just that it could initially connect.
        heldOpenTimer = setTimeout(() => {
          finish({
            ok: true,
            connectMs: resolvedConnectedAt - startedAt,
            snapshotMs: snapshotAt !== null ? snapshotAt - startedAt : null,
            error: null,
            droppedEarly: false,
          });
        }, HOLD_OPEN_MS);
      }
    });

    socket.on('close', (code: number) => {
      clearTimeout(connectTimer);
      clearTimeout(snapshotTimer);
      if (!settled) {
        finish({
          ok: false,
          connectMs: connectedAt !== null ? connectedAt - startedAt : null,
          snapshotMs: snapshotAt !== null ? snapshotAt - startedAt : null,
          error: `closed early (code ${code})`,
          droppedEarly: true,
        });
      }
    });

    socket.on('error', (err: Error) => {
      finish({
        ok: false,
        connectMs: connectedAt !== null ? connectedAt - startedAt : null,
        snapshotMs: null,
        error: err.message,
        droppedEarly: false,
      });
    });
  });
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index] ?? null;
}

async function main(): Promise<void> {
  const db = createDbClient(DATABASE_URL);
  const email = `load-test-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`;
  const password = randomUUID();

  console.error(`[load-test] provisioning 1 account for ${CONCURRENCY} concurrent connections...`);
  const userId = await createTestUser(email, password);
  let accountId: string;
  try {
    accountId = await activateTestAccount(db, userId);
  } finally {
    await db.destroy();
  }
  const token = await signIn(email, password);

  console.error(
    `[load-test] opening ${CONCURRENCY} connections against ${REALTIME_WS_URL}, holding each open ${HOLD_OPEN_MS}ms...`,
  );
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => runConnection(token, accountId)),
  );

  await deleteTestUser(userId);

  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);
  const droppedEarly = results.filter((r) => r.droppedEarly);
  const successRatio = successes.length / results.length;

  const connectTimes = successes
    .map((r) => r.connectMs)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const snapshotTimes = successes
    .map((r) => r.snapshotMs)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  console.error('\n[load-test] results');
  console.error(`  concurrency:        ${CONCURRENCY}`);
  console.error(`  successful:         ${successes.length} (${(successRatio * 100).toFixed(1)}%)`);
  console.error(`  failed:             ${failures.length}`);
  console.error(`  dropped early:      ${droppedEarly.length}`);
  console.error(
    `  connect ms  p50/p95/p99: ${percentile(connectTimes, 50)}/${percentile(connectTimes, 95)}/${percentile(connectTimes, 99)}`,
  );
  console.error(
    `  snapshot ms p50/p95/p99: ${percentile(snapshotTimes, 50)}/${percentile(snapshotTimes, 95)}/${percentile(snapshotTimes, 99)}`,
  );
  if (failures.length > 0) {
    const errorCounts = new Map<string, number>();
    for (const f of failures) {
      const key = f.error ?? 'unknown';
      errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
    }
    console.error('  error breakdown:');
    for (const [error, count] of errorCounts) {
      console.error(`    ${count}x ${error}`);
    }
  }

  if (successRatio < MIN_SUCCESS_RATIO) {
    console.error(
      `\n[load-test] FAILED — success ratio ${successRatio.toFixed(3)} below threshold ${MIN_SUCCESS_RATIO}`,
    );
    process.exit(1);
  }
  if (droppedEarly.length > 0) {
    console.error(
      `\n[load-test] FAILED — ${droppedEarly.length} connection(s) were dropped by the server before completing (heartbeat/stability regression)`,
    );
    process.exit(1);
  }
  console.error('\n[load-test] PASSED');
}

main().catch((error: unknown) => {
  console.error('[load-test] fatal error', error);
  process.exit(1);
});
