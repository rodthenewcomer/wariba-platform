import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import WsClient from 'ws';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';
import { accountStateChannel, accountOrdersChannel } from '@wariba/contracts';

// supabase-js unconditionally initializes a Realtime subsystem needing a
// native WebSocket global, absent in Node 20 — same fix as src/auth.ts.
globalThis.WebSocket ??= class {} as unknown as typeof WebSocket;

/**
 * Real end-to-end tests: spawns the actual realtime service (the same `tsx
 * src/index.ts` used by `pnpm dev`/`pnpm start`) as a child process and
 * drives it with a real `ws` client and real Supabase-issued JWTs — not a
 * mocked handler. This is the only way to exercise the auth/ownership
 * boundary honestly, since it lives in the WebSocket upgrade + message
 * dispatch path (services/realtime/src/websocket.ts), not in a unit-testable
 * pure function.
 *
 * Requires DATABASE_URL/SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY
 * in the environment (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const PORT = 4577;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;

function waitForOpen(ws: WsClient, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for open')), timeoutMs);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForClose(ws: WsClient, timeoutMs = 5000): Promise<{ code: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for close')), timeoutMs);
    ws.once('close', (code: number) => {
      clearTimeout(timer);
      resolve({ code });
    });
  });
}

function waitForMessage(
  ws: WsClient,
  predicate: (msg: { type: string; payload: unknown }) => boolean,
  timeoutMs = 8000,
): Promise<{ type: string; payload: unknown }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for a matching message`)),
      timeoutMs,
    );
    const onMessage = (raw: WsClient.RawData): void => {
      const msg = JSON.parse(raw.toString()) as { type: string; payload: unknown };
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(msg);
      }
    };
    ws.on('message', onMessage);
  });
}

describeIfDb('realtime service — auth, isolation, reconnect (real end-to-end)', () => {
  let db: Db;
  let child: ChildProcess;
  let userA: string;
  let userB: string;
  let accountA: string;
  let accountB: string;
  let tokenA: string;
  let tokenB: string;
  const cleanupAccountIds: string[] = [];
  const passwordA = randomUUID();
  const passwordB = randomUUID();
  let emailA: string;
  let emailB: string;

  const createTestUser = async (email: string, password: string): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const body = (await res.json()) as { id: string };
    return body.id;
  };

  const deleteTestUser = async (id: string): Promise<void> => {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  };

  const signIn = async (email: string, password: string): Promise<string> => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string,
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new Error(`sign-in failed: ${error?.message ?? 'no session'}`);
    }
    return data.session.access_token;
  };

  const createActiveAccount = async (uid: string): Promise<string> => {
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
        user_id: uid,
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
      userId: uid,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    cleanupAccountIds.push(account.id);
    return account.id;
  };

  const waitForHealthy = async (timeoutMs = 20000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BASE_URL}/health`);
        if (res.ok) return;
      } catch (err) {
        lastError = err;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`realtime service never became healthy: ${String(lastError)}`);
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    emailA = `rt-e2e-a-${Date.now()}@wariba-test.invalid`;
    emailB = `rt-e2e-b-${Date.now()}@wariba-test.invalid`;
    userA = await createTestUser(emailA, passwordA);
    userB = await createTestUser(emailB, passwordB);
    accountA = await createActiveAccount(userA);
    accountB = await createActiveAccount(userB);
    tokenA = await signIn(emailA, passwordA);
    tokenB = await signIn(emailB, passwordB);

    // VITEST=true is set on *this* process by the test runner and must not
    // leak to the child — index.ts's `if (process.env.VITEST !== 'true')
    // void start()` guard exists so importing `app` in unit tests doesn't
    // also start listening, but that same guard would stop the real child
    // process here from ever calling start() if inherited.
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      REALTIME_PORT: String(PORT),
      MARKET_DATA_PROVIDER: 'mock',
      MARKET_DATA_REPLAY_MODE: 'false',
      MARKET_TICK_INTERVAL_MS: '2000',
      ACCOUNT_RISK_PREVIEW_INTERVAL_MS: '1500',
    };
    delete childEnv.VITEST;

    child = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Own process group: `npx` is a wrapper, and the node server that
      // actually holds the market-trigger leadership lease is its
      // grandchild. Signalling only the wrapper left that server alive and
      // renewing the lease, so the next suite's node stayed a standby and
      // never evaluated a trigger. Same reason realtime-test-process.ts
      // spawns detached and signals the group.
      detached: process.platform !== 'win32',
    });
    let startupLog = '';
    child.stdout?.on('data', (d: Buffer) => (startupLog += d.toString()));
    child.stderr?.on('data', (d: Buffer) => (startupLog += d.toString()));
    let exitInfo = '';
    child.on('exit', (code, signal) => {
      exitInfo = `exit code=${code} signal=${signal}`;
    });

    try {
      await waitForHealthy();
    } catch (err) {
      throw new Error(
        `${(err as Error).message}\n--- child ${exitInfo || 'still running'} ---\n${startupLog}`,
      );
    }
  }, 40000);

  afterAll(async () => {
    // Signal the whole process group and await the exit, rather than firing
    // SIGTERM at the wrapper and moving on. This process holds the
    // market-trigger leadership lease; until it is really gone the next
    // suite's node is a standby that never evaluates a trigger.
    const exiting = child;
    const signalGroup = (signal: NodeJS.Signals): void => {
      if (!exiting) return;
      if (exiting.pid && process.platform !== 'win32') {
        try {
          process.kill(-exiting.pid, signal);
          return;
        } catch {
          // Group already gone — fall through to the direct child.
        }
      }
      exiting.kill(signal);
    };
    signalGroup('SIGTERM');
    if (exiting && exiting.exitCode === null && exiting.signalCode === null) {
      await new Promise<void>((resolve) => {
        exiting.once('exit', () => resolve());
        setTimeout(() => {
          signalGroup('SIGKILL');
          resolve();
        }, 10_000).unref?.();
      });
    }
    for (const id of cleanupAccountIds) {
      const positions = await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', id)
        .execute();
      for (const p of positions) {
        await db.deleteFrom('app.fills').where('position_id', '=', p.id).execute();
      }
      await db.deleteFrom('app.trade_orders').where('account_id', '=', id).execute();
      await db.deleteFrom('app.positions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      for (const p of positions) {
        await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', p.id).execute();
      }
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      // Prompt 07's symbol-specs/risk-preview tests are the first in this
      // file to trade on a brand-new fixture account and then let it hit
      // cleanup — earlier tests only ever traded on accountA/B, which this
      // same gap in cleanup already had, it just went unnoticed. Any fill
      // triggers evaluateAndApplyAccountRiskInTransaction, which lazily
      // creates today's app.account_daily_snapshots row and can record
      // app.risk_violations — both FK back to trading_accounts.
      await db.deleteFrom('app.risk_violations').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
      const account = await db
        .selectFrom('app.trading_accounts')
        .select('source_purchase_order_id')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      await db.deleteFrom('app.trading_accounts').where('id', '=', id).execute();
      await db
        .deleteFrom('app.payment_events')
        .where('purchase_order_id', '=', account.source_purchase_order_id)
        .execute();
      await db
        .deleteFrom('app.purchase_orders')
        .where('id', '=', account.source_purchase_order_id)
        .execute();
    }
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    await db.destroy();
  }, 30000);

  describe('authentication', () => {
    it('closes the connection with 4401 when no token is supplied', async () => {
      const ws = new WsClient(WS_URL);
      await waitForOpen(ws);
      const { code } = await waitForClose(ws);
      expect(code).toBe(4401);
    }, 10000);

    it('closes the connection with 4401 when the token is garbage', async () => {
      const ws = new WsClient(`${WS_URL}?token=not-a-real-token`);
      await waitForOpen(ws);
      const { code } = await waitForClose(ws);
      expect(code).toBe(4401);
    }, 10000);

    it('stays open and accepts subscribe with a valid token', async () => {
      const ws = new WsClient(`${WS_URL}?token=${tokenA}`);
      await waitForOpen(ws);
      ws.send(JSON.stringify({ type: 'subscribe', channels: [accountStateChannel(accountA)] }));
      const snapshot = await waitForMessage(ws, (m) => m.type === 'account.snapshot');
      expect((snapshot.payload as { accountId: string }).accountId).toBe(accountA);
      ws.close();
    }, 10000);
  });

  describe('other-account isolation', () => {
    it('rejects a subscribe to another user’s account channel with forbidden_channel', async () => {
      const ws = new WsClient(`${WS_URL}?token=${tokenB}`);
      await waitForOpen(ws);
      ws.send(JSON.stringify({ type: 'subscribe', channels: [accountStateChannel(accountA)] }));
      const error = await waitForMessage(ws, (m) => m.type === 'error');
      expect((error.payload as { code: string }).code).toBe('forbidden_channel');
      ws.close();
    }, 10000);

    it('rejects submit_order against another user’s account with not_owner', async () => {
      const ws = new WsClient(`${WS_URL}?token=${tokenB}`);
      await waitForOpen(ws);
      ws.send(
        JSON.stringify({
          type: 'submit_order',
          order: {
            accountId: accountA,
            idempotencyKey: randomUUID(),
            orderType: 'market_open',
            symbol: 'EURUSD',
            side: 'buy',
            quantity: '0.10',
          },
        }),
      );
      const error = await waitForMessage(ws, (m) => m.type === 'error');
      expect((error.payload as { code: string }).code).toBe('not_owner');
      ws.close();
    }, 10000);

    it('user B can act on their own account while user A’s is forbidden, in the same run', async () => {
      const ws = new WsClient(`${WS_URL}?token=${tokenB}`);
      await waitForOpen(ws);
      ws.send(JSON.stringify({ type: 'subscribe', channels: [accountStateChannel(accountB)] }));
      const snapshot = await waitForMessage(ws, (m) => m.type === 'account.snapshot');
      expect((snapshot.payload as { accountId: string }).accountId).toBe(accountB);
      ws.close();
    }, 10000);
  });

  describe('symbol specs + risk preview push — Prompt 07', () => {
    it('a state-channel subscribe also receives a symbol_specs message with all five tradable symbols', async () => {
      const ws = new WsClient(`${WS_URL}?token=${tokenB}`);
      await waitForOpen(ws);
      ws.send(JSON.stringify({ type: 'subscribe', channels: [accountStateChannel(accountB)] }));
      const specsMessage = await waitForMessage(ws, (m) => m.type === 'symbol_specs');
      const specs = (specsMessage.payload as { specs: { symbol: string; leverage: number }[] })
        .specs;
      expect(specs).toHaveLength(5);
      expect(specs.every((s) => s.leverage > 0)).toBe(true);
      expect(specs.map((s) => s.symbol).sort()).toEqual(
        ['EURUSD', 'GBPUSD', 'NAS100', 'USDJPY', 'XAUUSD'].sort(),
      );
      ws.close();
    }, 10000);

    it('an account with an open position receives a throttled account.risk_preview with live equity', async () => {
      const previewAccountId = await createActiveAccount(userA);
      const ws = new WsClient(`${WS_URL}?token=${tokenA}`);
      await waitForOpen(ws);
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          channels: [accountStateChannel(previewAccountId), accountOrdersChannel(previewAccountId)],
        }),
      );
      await waitForMessage(ws, (m) => m.type === 'account.snapshot');

      ws.send(
        JSON.stringify({
          type: 'submit_order',
          order: {
            accountId: previewAccountId,
            idempotencyKey: randomUUID(),
            orderType: 'market_open',
            symbol: 'EURUSD',
            side: 'buy',
            quantity: '0.10',
          },
        }),
      );
      // handleSubmitOrder's transaction is several sequential queries against
      // a remote pooled connection (eu-west-1) — observed taking well over
      // the default 8s wait under load, not just the risk-preview lag below.
      const orderResult = await waitForMessage(ws, (m) => m.type === 'order_result', 20000);
      expect((orderResult.payload as { status: string; rejectionCode: string | null }).status).toBe(
        'filled',
      );

      // Observed against this Supabase project: a freshly committed position
      // can take a few seconds (multiple 1500ms ticks) before a subsequent
      // read on the pooled connection sees it — a real, environment-level
      // read-after-write lag, not a bug in the preview loop itself (it's the
      // exact same lag the existing "reconnect / resync" test's fresh
      // connection tolerates by virtue of the several other awaits before
      // it). The preview loop is inherently robust to this — it just picks
      // the position up on a later tick — so the test just needs to be
      // patient rather than assert on the very next tick.
      const preview = await waitForMessage(ws, (m) => m.type === 'account.risk_preview', 25000);
      const payload = preview.payload as { accountId: string; equity: string; risk: unknown };
      expect(payload.accountId).toBe(previewAccountId);
      expect(Number(payload.equity)).toBeGreaterThan(0);
      ws.close();
    }, 55000);
  });

  describe('reconnect / resync', () => {
    it('a fresh connection after a submitted order sees an advanced accountSequence and the new position', async () => {
      const ws1 = new WsClient(`${WS_URL}?token=${tokenA}`);
      await waitForOpen(ws1);
      // Subscribed to both channels: .state gets the pushed snapshot on
      // subscribe, .orders is what order_result is actually broadcast to
      // (see websocket.ts's broadcastOrderResult) — a connection that only
      // subscribed to .state would never see its own order's result.
      ws1.send(
        JSON.stringify({
          type: 'subscribe',
          channels: [accountStateChannel(accountA), accountOrdersChannel(accountA)],
        }),
      );
      const initialSnapshot = await waitForMessage(ws1, (m) => m.type === 'account.snapshot');
      const initialSequence = (initialSnapshot.payload as { accountSequence: number })
        .accountSequence;

      ws1.send(
        JSON.stringify({
          type: 'submit_order',
          order: {
            accountId: accountA,
            idempotencyKey: randomUUID(),
            orderType: 'market_open',
            symbol: 'GBPUSD',
            side: 'buy',
            quantity: '0.10',
          },
        }),
      );
      const orderResult = await waitForMessage(ws1, (m) => m.type === 'order_result');
      expect((orderResult.payload as { status: string }).status).toBe('filled');
      ws1.close();
      await waitForClose(ws1);

      const ws2 = new WsClient(`${WS_URL}?token=${tokenA}`);
      await waitForOpen(ws2);
      ws2.send(JSON.stringify({ type: 'subscribe', channels: [accountStateChannel(accountA)] }));
      const freshSnapshot = await waitForMessage(ws2, (m) => m.type === 'account.snapshot');
      const payload = freshSnapshot.payload as {
        accountId: string;
        accountSequence: number;
        openPositions: unknown[];
      };
      expect(payload.accountId).toBe(accountA);
      expect(payload.accountSequence).toBeGreaterThan(initialSequence);
      expect(payload.openPositions.length).toBeGreaterThan(0);
      ws2.close();
    }, 20000);
  });
});
