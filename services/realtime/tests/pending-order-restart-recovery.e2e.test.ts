import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import WsClient from 'ws';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';
import { accountStateChannel, userNotificationsChannel } from '@wariba/contracts';
import { createMessageBuffer } from './message-buffer.js';

globalThis.WebSocket ??= class {} as unknown as typeof WebSocket;

/**
 * Appendix 07-D acceptance gate 5 — the strongest honest single-node
 * recovery proof this codebase's actual architecture supports. There is no
 * leader election, fencing, or standby takeover anywhere in this system
 * (TRADING-ORDER-004, DECISION_LOG.md v1.13) — this test proves the
 * single-writer model that exists instead: kill the real realtime process,
 * start a fresh one against the same database, and confirm it reloads
 * persisted pending orders/alerts, resumes tick evaluation, settles each
 * exactly once, and a browser reconnecting after the restart sees the
 * correct end state. It does NOT claim zero-downtime failover (there is
 * a real gap while the process is down, disclosed in the final report) —
 * only that recovery, once the process comes back, is correct.
 *
 * Same spawn-the-real-process technique as auth-isolation.e2e.test.ts, on
 * its own port (4579) so this file's two sequential child processes never
 * collide with the other e2e files' if vitest runs them concurrently.
 *
 * Requires DATABASE_URL/SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY
 * in the environment (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const PORT = 4579;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;
const UPWARD_EURUSD_SEED = '25231836';

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

function waitForExit(child: ChildProcess, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('timed out waiting for process exit')),
      timeoutMs,
    );
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function waitForMessages(
  ws: WsClient,
  predicate: (msg: { type: string; payload: unknown }) => boolean,
  timeoutMs: number,
): Promise<{ type: string; payload: unknown }[]> {
  return new Promise((resolve) => {
    const matches: { type: string; payload: unknown }[] = [];
    const onMessage = (raw: WsClient.RawData): void => {
      const msg = JSON.parse(raw.toString()) as { type: string; payload: unknown };
      if (predicate(msg)) matches.push(msg);
    };
    ws.on('message', onMessage);
    setTimeout(() => {
      ws.off('message', onMessage);
      resolve(matches);
    }, timeoutMs);
  });
}

describeIfDb('single-node restart recovery (real end-to-end)', () => {
  let db: Db;
  let child: ChildProcess;
  let userId: string;
  let accountId: string;
  let token: string;
  const cleanupAccountIds: string[] = [];
  const password = randomUUID();
  let email: string;

  const createTestUser = async (mail: string, pass: string): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: mail, password: pass, email_confirm: true }),
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

  const signIn = async (mail: string, pass: string): Promise<string> => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string,
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email: mail, password: pass });
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

  const waitForHealthy = async (timeoutMs = 60000): Promise<void> => {
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

  const spawnRealtime = async (): Promise<ChildProcess> => {
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      REALTIME_PORT: String(PORT),
      MARKET_TICK_INTERVAL_MS: '5000',
      SANDBOX_MARKET_SEED: UPWARD_EURUSD_SEED,
      ACCOUNT_RISK_PREVIEW_INTERVAL_MS: '5000',
    };
    delete childEnv.VITEST;
    const proc = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let startupLog = '';
    proc.stdout?.on('data', (d: Buffer) => (startupLog += d.toString()));
    proc.stderr?.on('data', (d: Buffer) => (startupLog += d.toString()));
    let exitInfo = '';
    proc.on('exit', (code, signal) => {
      exitInfo = `exit code=${code} signal=${signal}`;
    });
    try {
      await waitForHealthy();
    } catch (err) {
      throw new Error(
        `${(err as Error).message}\n--- child ${exitInfo || 'still running'} ---\n${startupLog}`,
      );
    }
    return proc;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    email = `rt-restart-e2e-${Date.now()}@wariba-test.invalid`;
    userId = await createTestUser(email, password);
    accountId = await createActiveAccount(userId);
    token = await signIn(email, password);
    child = await spawnRealtime();
  }, 90000);

  afterAll(async () => {
    child?.kill('SIGTERM');
    await db.deleteFrom('app.alert_notifications').where('user_id', '=', userId).execute();
    await db.deleteFrom('app.price_alerts').where('user_id', '=', userId).execute();
    for (const id of cleanupAccountIds) {
      const positions = await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', id)
        .execute();
      await db.deleteFrom('app.pending_orders').where('account_id', '=', id).execute();
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
      await db.deleteFrom('app.risk_violations').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
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
    await deleteTestUser(userId);
    await db.destroy();
  }, 30000);

  it('a killed and restarted process reloads persisted pending orders/alerts, resumes evaluation, settles each exactly once, and a post-restart reconnect sees the correct state', async () => {
    const ws1 = new WsClient(`${WS_URL}?token=${token}`);
    const messages1 = createMessageBuffer(ws1, 120000);
    await waitForOpen(ws1);
    ws1.send(
      JSON.stringify({
        type: 'subscribe',
        channels: [
          accountStateChannel(accountId),
          userNotificationsChannel(userId),
          'market.symbol.EURUSD',
        ],
      }),
    );
    await messages1.waitForMessage((m) => m.type === 'account.snapshot');
    const tickMsg = await messages1.waitForMessage((m) => m.type === 'market.tick');
    const tick = tickMsg.payload as { bid: string; ask: string };
    const pricePrecision = 5;
    const onePoint = Number(`1e-${pricePrecision}`);

    // Deliberately far from the live price (2000 points) — must not
    // trigger/fire during this process's remaining lifetime, so any
    // later fill/notification can only have come from the process that
    // restarts below, proving resumption rather than a lucky pre-restart
    // trigger.
    const farTriggerPrice = (Number(tick.bid) + 2000 * onePoint).toFixed(pricePrecision);
    const createOrderKey = randomUUID();
    ws1.send(
      JSON.stringify({
        type: 'create_pending_order',
        pendingOrder: {
          accountId,
          idempotencyKey: createOrderKey,
          symbol: 'EURUSD',
          orderType: 'sell_limit',
          quantity: '0.50',
          triggerPrice: farTriggerPrice,
        },
      }),
    );
    const orderCreated = await messages1.waitForMessage((m) => m.type === 'pending_order_result');
    const orderCreatedPayload = orderCreated.payload as {
      status: string;
      order: { id: string } | null;
    };
    expect(orderCreatedPayload.status).toBe('active');
    const pendingOrderId = orderCreatedPayload.order!.id;

    const farThreshold = (Number(tick.ask) + 2000 * onePoint).toFixed(pricePrecision);
    const createAlertKey = randomUUID();
    ws1.send(
      JSON.stringify({
        type: 'create_price_alert',
        alert: {
          idempotencyKey: createAlertKey,
          symbol: 'EURUSD',
          direction: 'cross_above',
          thresholdPrice: farThreshold,
          source: 'mid',
          recurrence: 'once',
        },
      }),
    );
    const alertCreated = await messages1.waitForMessage((m) => m.type === 'alert_result');
    const alertCreatedPayload = alertCreated.payload as {
      status: string;
      alert: { id: string } | null;
    };
    expect(alertCreatedPayload.status).toBe('ok');
    const alertId = alertCreatedPayload.alert!.id;

    // Let a few real ticks pass so the alert establishes a real
    // last_observed_side_above baseline before the restart (proving the
    // restart preserves that baseline too, not just the row's existence).
    await new Promise((r) => setTimeout(r, 5500));
    ws1.close();
    messages1.dispose();

    // --- Kill the process and start a fresh one against the same DB ---
    child.kill('SIGTERM');
    await waitForExit(child);
    child = await spawnRealtime();

    const ws2 = new WsClient(`${WS_URL}?token=${token}`);
    const messages2 = createMessageBuffer(ws2, 120000);
    await waitForOpen(ws2);
    ws2.send(
      JSON.stringify({
        type: 'subscribe',
        channels: [
          accountStateChannel(accountId),
          userNotificationsChannel(userId),
          'market.symbol.EURUSD',
        ],
      }),
    );
    const postRestartSnapshot = await messages2.waitForMessage(
      (m) => m.type === 'account.snapshot',
    );
    const postRestartPayload = postRestartSnapshot.payload as {
      pendingOrders: { id: string; triggerPrice: string }[];
    };
    // Reload persisted orders: the fresh process's snapshot builder reads
    // app.pending_orders straight from Postgres — nothing about the old
    // process's in-memory state was needed for this to be correct, since
    // there wasn't any to begin with (no in-memory queue anywhere in this
    // system).
    const reloadedOrder = postRestartPayload.pendingOrders.find((o) => o.id === pendingOrderId);
    expect(reloadedOrder).toBeDefined();
    expect(reloadedOrder?.triggerPrice).toBe(farTriggerPrice);

    const notificationsSnapshot = await messages2.waitForMessage(
      (m) => m.type === 'notifications.snapshot',
    );
    const notificationsPayload = notificationsSnapshot.payload as {
      alerts: { id: string; thresholdPrice: string; enabled: boolean }[];
    };
    const reloadedAlert = notificationsPayload.alerts.find((a) => a.id === alertId);
    expect(reloadedAlert).toBeDefined();
    expect(reloadedAlert?.enabled).toBe(true);
    expect(reloadedAlert?.thresholdPrice).toBe(farThreshold);

    // --- Now move both close enough to actually resolve on this new process ---
    messages2.dispose();
    const resumedMessages = createMessageBuffer(ws2, 120000);
    const waitForResumedMessage = (
      stage: string,
      predicate: (message: { type: string; payload: unknown }) => boolean,
    ): Promise<{ type: string; payload: unknown }> =>
      resumedMessages.waitForMessage(predicate, 120000).catch((error: unknown) => {
        throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
      });
    ws2.send(JSON.stringify({ type: 'subscribe', channels: ['market.symbol.EURUSD'] }));
    const freshTickMsg = await waitForResumedMessage(
      'post-restart market snapshot',
      (m) => m.type === 'market.tick',
    );
    const freshTick = freshTickMsg.payload as { bid: string; ask: string };
    const safeDistancePoints = 9;
    const nearTriggerPrice = (Number(freshTick.bid) + safeDistancePoints * onePoint).toFixed(
      pricePrecision,
    );
    const mid = (Number(freshTick.bid) + Number(freshTick.ask)) / 2;
    const nearThreshold = (mid + safeDistancePoints * onePoint).toFixed(pricePrecision);

    ws2.send(
      JSON.stringify({
        type: 'modify_pending_order',
        pendingOrder: { accountId, pendingOrderId, triggerPrice: nearTriggerPrice },
      }),
    );
    const pendingModification = await waitForResumedMessage(
      'post-restart pending-order modification',
      (m) => m.type === 'pending_order_result',
    );
    const pendingModificationPayload = pendingModification.payload as {
      status: string;
      order: { triggerPrice: string } | null;
    };
    expect(pendingModificationPayload.status).toBe('active');
    expect(pendingModificationPayload.order?.triggerPrice).toBe(nearTriggerPrice);

    ws2.send(
      JSON.stringify({
        type: 'modify_price_alert',
        alert: { alertId, thresholdPrice: nearThreshold },
      }),
    );
    const alertModification = await waitForResumedMessage(
      'post-restart price-alert modification',
      (m) => m.type === 'alert_result',
    );
    const alertModificationPayload = alertModification.payload as {
      status: string;
      alert: { thresholdPrice: string } | null;
    };
    expect(alertModificationPayload.status).toBe('ok');
    expect(alertModificationPayload.alert?.thresholdPrice).toBe(nearThreshold);

    // Resume tick evaluation, on the NEW process: both settle from here on.
    const filled = await waitForResumedMessage(
      'post-restart pending-order fill',
      (m) =>
        m.type === 'order_result' &&
        (m.payload as { idempotencyKey: string }).idempotencyKey ===
          `pending-order:${pendingOrderId}`,
    );
    expect((filled.payload as { status: string }).status).toBe('filled');

    const notified = await waitForResumedMessage(
      'post-restart alert notification',
      (m) =>
        m.type === 'notification.new' &&
        (m.payload as { notification: { alertId: string } }).notification.alertId === alertId,
    );
    expect((notified.payload as { notification: { alertId: string } }).notification.alertId).toBe(
      alertId,
    );

    // Prevent duplicate fills/notifications: no second event for either
    // arrives on a further burst of ticks, and the DB agrees.
    const extraFills = await waitForMessages(
      ws2,
      (m) =>
        m.type === 'order_result' &&
        (m.payload as { idempotencyKey: string }).idempotencyKey ===
          `pending-order:${pendingOrderId}`,
      3000,
    );
    expect(extraFills).toHaveLength(0);
    const extraNotifications = await waitForMessages(
      ws2,
      (m) =>
        m.type === 'notification.new' &&
        (m.payload as { notification: { alertId: string } }).notification.alertId === alertId,
      1000,
    );
    expect(extraNotifications).toHaveLength(0);

    const fillCount = await db
      .selectFrom('app.fills')
      .innerJoin('app.positions', 'app.positions.id', 'app.fills.position_id')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('app.positions.account_id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(Number(fillCount.count)).toBe(1);
    const notificationCount = await db
      .selectFrom('app.alert_notifications')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('alert_id', '=', alertId)
      .executeTakeFirstOrThrow();
    expect(Number(notificationCount.count)).toBe(1);

    ws2.close();
    resumedMessages.dispose();

    // --- Reconcile browser snapshot: a third connection, after everything settled ---
    const ws3 = new WsClient(`${WS_URL}?token=${token}`);
    const messages3 = createMessageBuffer(ws3, 120000);
    await waitForOpen(ws3);
    ws3.send(
      JSON.stringify({
        type: 'subscribe',
        channels: [accountStateChannel(accountId), userNotificationsChannel(userId)],
      }),
    );
    const finalSnapshot = await messages3.waitForMessage((m) => m.type === 'account.snapshot');
    const finalPayload = finalSnapshot.payload as {
      openPositions: { id: string }[];
      pendingOrders: unknown[];
    };
    expect(finalPayload.openPositions.length).toBeGreaterThan(0);
    expect(finalPayload.pendingOrders).toHaveLength(0);

    const finalNotifications = await messages3.waitForMessage(
      (m) => m.type === 'notifications.snapshot',
    );
    const finalNotificationsPayload = finalNotifications.payload as {
      notifications: { alertId: string }[];
      unreadCount: number;
    };
    expect(finalNotificationsPayload.notifications.some((n) => n.alertId === alertId)).toBe(true);
    expect(finalNotificationsPayload.unreadCount).toBeGreaterThan(0);
    ws3.close();
    messages3.dispose();
  }, 480000);
});
