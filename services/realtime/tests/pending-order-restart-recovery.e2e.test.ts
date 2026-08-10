import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';
import {
  accountOrdersChannel,
  accountStateChannel,
  userNotificationsChannel,
} from '@wariba/contracts';
import { RealtimeTestClient } from './realtime-test-client.js';
import {
  spawnRealtimeTestProcess,
  waitForCondition,
  type RealtimeTestProcess,
} from './realtime-test-process.js';

globalThis.WebSocket ??= class {} as unknown as typeof WebSocket;

/**
 * Appendix 07-D acceptance gate 5 — complementary single-node restart
 * recovery proof after Appendix 08-A added a separate two-node failover
 * suite. Kill the real realtime process,
 * start a fresh one against the same database, and confirm it reloads
 * persisted pending orders/alerts, resumes tick evaluation, settles each
 * exactly once, and a browser reconnecting after the restart sees the
 * correct end state. The multi-node suite separately proves fenced takeover.
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

describeIfDb('single-node restart recovery (real end-to-end)', () => {
  let db: Db;
  let realtime: RealtimeTestProcess;
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

  const spawnRealtime = (): Promise<RealtimeTestProcess> =>
    spawnRealtimeTestProcess({
      cwd: process.cwd(),
      healthUrl: `${BASE_URL}/health`,
      healthTimeoutMs: 60000,
      env: {
        ...process.env,
        REALTIME_PORT: String(PORT),
        MARKET_DATA_PROVIDER: 'mock',
        MARKET_DATA_REPLAY_MODE: 'false',
        MARKET_TICK_INTERVAL_MS: '5000',
        SANDBOX_MARKET_SEED: UPWARD_EURUSD_SEED,
        ACCOUNT_RISK_PREVIEW_INTERVAL_MS: '5000',
      },
    });

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    email = `rt-restart-e2e-${Date.now()}@wariba-test.invalid`;
    userId = await createTestUser(email, password);
    accountId = await createActiveAccount(userId);
    token = await signIn(email, password);
    realtime = await spawnRealtime();
  }, 90000);

  afterAll(async () => {
    await realtime?.stop();
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
    const client = await RealtimeTestClient.connect({
      token,
      url: WS_URL,
      defaultTimeoutMs: 120000,
      serverDiagnostics: () => realtime.logs(),
    });
    await client.subscribeAndWait(
      [
        accountStateChannel(accountId),
        accountOrdersChannel(accountId),
        userNotificationsChannel(userId),
        'market.symbol.EURUSD',
      ],
      'account.snapshot',
    );
    const tickMsg = await client.waitForMessage(
      'pre-restart EURUSD market tick',
      (message) => message.type === 'market.tick',
    );
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
    const orderCreated = await client.sendCommandAndAwaitResult({
      expectedEvent: 'pending_order_result',
      command: {
        type: 'create_pending_order',
        pendingOrder: {
          accountId,
          idempotencyKey: createOrderKey,
          symbol: 'EURUSD',
          orderType: 'sell_limit',
          quantity: '0.50',
          triggerPrice: farTriggerPrice,
        },
      },
    });
    const orderCreatedPayload = orderCreated.payload as {
      status: string;
      order: { id: string } | null;
    };
    expect(orderCreatedPayload.status).toBe('active');
    const pendingOrderId = orderCreatedPayload.order!.id;

    const farThreshold = (Number(tick.ask) + 2000 * onePoint).toFixed(pricePrecision);
    const createAlertKey = randomUUID();
    const alertCreated = await client.sendCommandAndAwaitResult({
      expectedEvent: 'alert_result',
      command: {
        type: 'create_price_alert',
        alert: {
          idempotencyKey: createAlertKey,
          symbol: 'EURUSD',
          direction: 'cross_above',
          thresholdPrice: farThreshold,
          source: 'mid',
          recurrence: 'once',
        },
      },
    });
    const alertCreatedPayload = alertCreated.payload as {
      status: string;
      alert: { id: string } | null;
    };
    expect(alertCreatedPayload.status).toBe('ok');
    const alertId = alertCreatedPayload.alert!.id;

    await waitForCondition(
      `price alert ${alertId} baseline persistence`,
      async () => {
        const row = await db
          .selectFrom('app.price_alerts')
          .select('last_observed_side_above')
          .where('id', '=', alertId)
          .executeTakeFirstOrThrow();
        return row.last_observed_side_above !== null;
      },
      15000,
    );
    client.close();

    // --- Kill the process and start a fresh one against the same DB ---
    await realtime.stop();
    realtime = await spawnRealtime();

    const resumedClient = await RealtimeTestClient.connect({
      token,
      url: WS_URL,
      defaultTimeoutMs: 120000,
      serverDiagnostics: () => realtime.logs(),
    });
    const postRestartSnapshot = await resumedClient.subscribeAndWait(
      [
        accountStateChannel(accountId),
        accountOrdersChannel(accountId),
        userNotificationsChannel(userId),
        'market.symbol.EURUSD',
      ],
      'account.snapshot',
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

    const notificationsSnapshot = await resumedClient.waitForMessage(
      'post-restart notifications snapshot',
      (message) => message.type === 'notifications.snapshot',
    );
    const notificationsPayload = notificationsSnapshot.payload as {
      alerts: { id: string; thresholdPrice: string; enabled: boolean }[];
    };
    const reloadedAlert = notificationsPayload.alerts.find((a) => a.id === alertId);
    expect(reloadedAlert).toBeDefined();
    expect(reloadedAlert?.enabled).toBe(true);
    expect(reloadedAlert?.thresholdPrice).toBe(farThreshold);

    // --- Now move both close enough to actually resolve on this new process ---
    const freshTickMsg = await resumedClient.waitForMessage(
      'post-restart market snapshot',
      (message) => message.type === 'market.tick',
    );
    const freshTick = freshTickMsg.payload as { bid: string; ask: string };
    const safeDistancePoints = 9;
    const nearTriggerPrice = (Number(freshTick.bid) + safeDistancePoints * onePoint).toFixed(
      pricePrecision,
    );
    const mid = (Number(freshTick.bid) + Number(freshTick.ask)) / 2;
    const nearThreshold = (mid + safeDistancePoints * onePoint).toFixed(pricePrecision);

    const pendingModification = await resumedClient.sendCommandAndAwaitResult({
      expectedEvent: 'pending_order_result',
      command: {
        type: 'modify_pending_order',
        pendingOrder: { accountId, pendingOrderId, triggerPrice: nearTriggerPrice },
      },
    });
    const pendingModificationPayload = pendingModification.payload as {
      status: string;
      order: { triggerPrice: string } | null;
    };
    expect(pendingModificationPayload.status).toBe('active');
    expect(pendingModificationPayload.order?.triggerPrice).toBe(nearTriggerPrice);

    const alertModification = await resumedClient.sendCommandAndAwaitResult({
      expectedEvent: 'alert_result',
      command: {
        type: 'modify_price_alert',
        alert: { alertId, thresholdPrice: nearThreshold },
      },
    });
    const alertModificationPayload = alertModification.payload as {
      status: string;
      alert: { thresholdPrice: string } | null;
    };
    expect(alertModificationPayload.status).toBe('ok');
    expect(alertModificationPayload.alert?.thresholdPrice).toBe(nearThreshold);

    const filled = await resumedClient.waitForMessage(
      'post-restart pending-order fill',
      (message) =>
        message.type === 'order_result' &&
        (message.payload as { idempotencyKey: string }).idempotencyKey ===
          `pending-order:${pendingOrderId}`,
    );
    expect((filled.payload as { status: string }).status).toBe('filled');

    const notified = await resumedClient.waitForMessage(
      'post-restart alert notification',
      (message) =>
        message.type === 'notification.new' &&
        (message.payload as { notification: { alertId: string } }).notification.alertId === alertId,
    );
    expect((notified.payload as { notification: { alertId: string } }).notification.alertId).toBe(
      alertId,
    );

    // Prevent duplicate fills/notifications: no second event for either
    // arrives on a further burst of ticks, and the DB agrees.
    const extraFills = await resumedClient.observeMessages(
      (message) =>
        message.type === 'order_result' &&
        (message.payload as { idempotencyKey: string }).idempotencyKey ===
          `pending-order:${pendingOrderId}`,
      3000,
    );
    expect(extraFills).toHaveLength(0);
    const extraNotifications = await resumedClient.observeMessages(
      (message) =>
        message.type === 'notification.new' &&
        (message.payload as { notification: { alertId: string } }).notification.alertId === alertId,
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

    // --- Reconcile browser snapshot: a third connection, after everything settled ---
    const reconciledClient = await resumedClient.reconnect();
    const finalSnapshot = await reconciledClient.subscribeAndWait(
      [accountStateChannel(accountId), userNotificationsChannel(userId)],
      'account.snapshot',
    );
    const finalPayload = finalSnapshot.payload as {
      openPositions: { id: string }[];
      pendingOrders: unknown[];
    };
    expect(finalPayload.openPositions.length).toBeGreaterThan(0);
    expect(finalPayload.pendingOrders).toHaveLength(0);

    const finalNotifications = await reconciledClient.waitForMessage(
      'reconciled notifications snapshot',
      (message) => message.type === 'notifications.snapshot',
    );
    const finalNotificationsPayload = finalNotifications.payload as {
      notifications: { alertId: string }[];
      unreadCount: number;
    };
    expect(finalNotificationsPayload.notifications.some((n) => n.alertId === alertId)).toBe(true);
    expect(finalNotificationsPayload.unreadCount).toBeGreaterThan(0);
    reconciledClient.close();
  }, 480000);
});
