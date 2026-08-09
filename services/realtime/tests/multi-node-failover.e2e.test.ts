import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activateEvaluationAccount, createDbClient, type Db } from '@wariba/database';
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

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;
const PORT_A = 4580;
const PORT_B = 4581;
const BASE_A = `http://127.0.0.1:${PORT_A}`;
const BASE_B = `http://127.0.0.1:${PORT_B}`;

interface HealthPayload {
  leader: boolean;
  standby_ready: boolean;
  instance_id: string;
  fencing_epoch: string | null;
}

describeIfDb('two-node PostgreSQL-fenced realtime failover', () => {
  let db: Db;
  let nodeA: RealtimeTestProcess;
  let nodeB: RealtimeTestProcess;
  let userId: string;
  let accountId: string;
  let token: string;
  let email: string;
  const password = randomUUID();

  const health = async (baseUrl: string): Promise<HealthPayload> => {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) throw new Error(`health ${baseUrl}: ${response.status}`);
    return (await response.json()) as HealthPayload;
  };

  const spawnNode = (
    instanceId: string,
    port: number,
    baseUrl: string,
  ): Promise<RealtimeTestProcess> =>
    spawnRealtimeTestProcess({
      cwd: process.cwd(),
      healthUrl: `${baseUrl}/health`,
      healthTimeoutMs: 60000,
      env: {
        ...process.env,
        APP_ENV: 'local',
        LOG_LEVEL: 'info',
        INSTANCE_ID: instanceId,
        REALTIME_PORT: String(port),
        LEADER_LEASE_DURATION_MS: '4000',
        LEADER_RENEW_INTERVAL_MS: '750',
        MARKET_DATA_PROVIDER: 'mock',
        MARKET_DATA_REPLAY_MODE: 'false',
        MARKET_TICK_INTERVAL_MS: '500',
        SANDBOX_MARKET_SEED: '25231836',
        ACCOUNT_RISK_PREVIEW_INTERVAL_MS: '1000',
      },
    });

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    await db
      .updateTable('app.realtime_leadership')
      .set({
        leader_instance_id: null,
        fencing_epoch: '0',
        lease_expires_at: new Date(0),
        acquired_at: null,
        renewed_at: null,
        previous_leader_instance_id: null,
        takeover_count: 0,
      })
      .where('service_name', '=', 'market-trigger-writer')
      .execute();

    email = `multi-node-${Date.now()}@wariba-test.invalid`;
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    userId = ((await response.json()) as { id: string }).id;
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
    const purchase = await db
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
    accountId = (
      await activateEvaluationAccount(db, {
        purchaseOrderId: purchase.id,
        userId,
        nominalBalance: productVersion.nominal_balance,
        currency: productVersion.nominal_currency,
      })
    ).id;
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string,
    );
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.data.session) throw new Error(signIn.error?.message ?? 'sign-in failed');
    token = signIn.data.session.access_token;

    nodeA = await spawnNode('realtime-node-a', PORT_A, BASE_A);
    await waitForCondition('node A leadership', async () => (await health(BASE_A)).leader, 15000);
    nodeB = await spawnNode('realtime-node-b', PORT_B, BASE_B);
    await waitForCondition(
      'node B standby readiness',
      async () => (await health(BASE_B)).standby_ready,
      15000,
    );
  }, 120000);

  afterAll(async () => {
    await nodeA?.stop();
    await nodeB?.stop();
    await db.deleteFrom('app.alert_notifications').where('user_id', '=', userId).execute();
    await db.deleteFrom('app.price_alerts').where('user_id', '=', userId).execute();
    await db.deleteFrom('app.pending_orders').where('account_id', '=', accountId).execute();
    const positions = await db
      .selectFrom('app.positions')
      .select('id')
      .where('account_id', '=', accountId)
      .execute();
    for (const position of positions) {
      await db.deleteFrom('app.fills').where('position_id', '=', position.id).execute();
    }
    await db.deleteFrom('app.trade_orders').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.positions').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', accountId).execute();
    await db.deleteFrom('app.risk_violations').where('account_id', '=', accountId).execute();
    await db
      .deleteFrom('app.account_daily_snapshots')
      .where('account_id', '=', accountId)
      .execute();
    await db
      .deleteFrom('app.account_state_transitions')
      .where('account_id', '=', accountId)
      .execute();
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('source_purchase_order_id')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
    await db
      .deleteFrom('app.purchase_orders')
      .where('id', '=', account.source_purchase_order_id)
      .execute();
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    await db.destroy();
  }, 60000);

  it('takes over after SIGKILL in under 10s without duplicate fills, alerts, or lost state', async () => {
    const leaderHealth = await health(BASE_A);
    expect(leaderHealth.instance_id).toBe('realtime-node-a');
    const originalEpoch = BigInt(leaderHealth.fencing_epoch as string);
    const clientA = await RealtimeTestClient.connect({
      token,
      url: `ws://127.0.0.1:${PORT_A}/ws`,
      defaultTimeoutMs: 120000,
      serverDiagnostics: () => nodeA.logs(),
    });
    await clientA.subscribeAndWait(
      [
        accountStateChannel(accountId),
        accountOrdersChannel(accountId),
        userNotificationsChannel(userId),
        'market.symbol.EURUSD',
      ],
      'account.snapshot',
    );
    const tickMessage = await clientA.waitForMessage(
      'leader market tick',
      (message) => message.type === 'market.tick',
    );
    const tick = tickMessage.payload as { bid: string; ask: string };

    const marketOrderKey = randomUUID();
    const marketOrder = await clientA.sendCommandAndAwaitResult({
      expectedEvent: 'order_result',
      command: {
        type: 'submit_order',
        order: {
          accountId,
          idempotencyKey: marketOrderKey,
          orderType: 'market_open',
          symbol: 'EURUSD',
          side: 'buy',
          quantity: '0.10',
        },
      },
    });
    expect((marketOrder.payload as { status: string }).status).toBe('filled');

    const onePoint = 0.00001;
    const farTrigger = (Number(tick.bid) + 0.01).toFixed(5);
    const pendingCreated = await clientA.sendCommandAndAwaitResult({
      expectedEvent: 'pending_order_result',
      command: {
        type: 'create_pending_order',
        pendingOrder: {
          accountId,
          idempotencyKey: randomUUID(),
          symbol: 'EURUSD',
          orderType: 'sell_limit',
          quantity: '0.10',
          triggerPrice: farTrigger,
        },
      },
    });
    const pendingOrderId = (pendingCreated.payload as { order: { id: string } }).order.id;
    const farThreshold = (Number(tick.ask) + 0.01).toFixed(5);
    const alertCreated = await clientA.sendCommandAndAwaitResult({
      expectedEvent: 'alert_result',
      command: {
        type: 'create_price_alert',
        alert: {
          idempotencyKey: randomUUID(),
          symbol: 'EURUSD',
          direction: 'cross_above',
          thresholdPrice: farThreshold,
          source: 'mid',
          recurrence: 'once',
        },
      },
    });
    const alertId = (alertCreated.payload as { alert: { id: string } }).alert.id;
    await waitForCondition(
      'leader persisted alert baseline',
      async () =>
        (
          await db
            .selectFrom('app.price_alerts')
            .select('last_observed_side_above')
            .where('id', '=', alertId)
            .executeTakeFirstOrThrow()
        ).last_observed_side_above !== null,
      10000,
    );

    clientA.close();
    const killedAt = Date.now();
    nodeA.kill('SIGKILL');
    await waitForCondition(
      'node A SIGKILL exit',
      async () => nodeA.child.exitCode !== null || nodeA.child.signalCode !== null,
      5000,
    );
    try {
      await waitForCondition('node B takeover', async () => (await health(BASE_B)).leader, 10000);
    } catch (error) {
      const lease = await db
        .selectFrom('app.realtime_leadership')
        .selectAll()
        .where('service_name', '=', 'market-trigger-writer')
        .executeTakeFirstOrThrow();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\n` +
          `lease=${JSON.stringify(lease)}\n--- node B ---\n${nodeB.logs()}`,
      );
    }
    const takeoverMs = Date.now() - killedAt;
    expect(takeoverMs).toBeLessThan(10000);
    process.stdout.write(`FAILOVER_TAKEOVER_MS=${takeoverMs}\n`);
    const takeoverHealth = await health(BASE_B);
    expect(BigInt(takeoverHealth.fencing_epoch as string)).toBeGreaterThan(originalEpoch);

    const clientB = await RealtimeTestClient.connect({
      token,
      url: `ws://127.0.0.1:${PORT_B}/ws`,
      defaultTimeoutMs: 120000,
      serverDiagnostics: () => nodeB.logs(),
    });
    const snapshot = await clientB.subscribeAndWait(
      [
        accountStateChannel(accountId),
        accountOrdersChannel(accountId),
        userNotificationsChannel(userId),
        'market.symbol.EURUSD',
      ],
      'account.snapshot',
    );
    const snapshotPayload = snapshot.payload as {
      openPositions: unknown[];
      pendingOrders: { id: string }[];
    };
    expect(snapshotPayload.openPositions.length).toBeGreaterThan(0);
    expect(snapshotPayload.pendingOrders.some((order) => order.id === pendingOrderId)).toBe(true);

    const resumedTickMessage = await clientB.waitForMessage(
      'standby post-takeover tick',
      (message) => message.type === 'market.tick',
    );
    const resumedTick = resumedTickMessage.payload as { bid: string; ask: string };
    const nearTrigger = (Number(resumedTick.bid) + 9 * onePoint).toFixed(5);
    const nearThreshold = (
      (Number(resumedTick.bid) + Number(resumedTick.ask)) / 2 +
      9 * onePoint
    ).toFixed(5);
    await clientB.sendCommandAndAwaitResult({
      expectedEvent: 'pending_order_result',
      command: {
        type: 'modify_pending_order',
        pendingOrder: { accountId, pendingOrderId, triggerPrice: nearTrigger },
      },
    });
    await clientB.sendCommandAndAwaitResult({
      expectedEvent: 'alert_result',
      command: {
        type: 'modify_price_alert',
        alert: { alertId, thresholdPrice: nearThreshold },
      },
    });

    await clientB.waitForMessage(
      'fenced pending order fill',
      (message) =>
        message.type === 'order_result' &&
        (message.payload as { idempotencyKey: string }).idempotencyKey ===
          `pending-order:${pendingOrderId}`,
    );
    await clientB.waitForMessage(
      'deduplicated alert notification',
      (message) =>
        message.type === 'notification.new' &&
        (message.payload as { notification: { alertId: string } }).notification.alertId === alertId,
    );

    const pendingFillCount = await db
      .selectFrom('app.trade_orders')
      .select((expression) => expression.fn.countAll().as('count'))
      .where('account_id', '=', accountId)
      .where('idempotency_key', '=', `pending-order:${pendingOrderId}`)
      .where('status', '=', 'filled')
      .executeTakeFirstOrThrow();
    expect(Number(pendingFillCount.count)).toBe(1);
    const notificationCount = await db
      .selectFrom('app.alert_notifications')
      .select((expression) => expression.fn.countAll().as('count'))
      .where('alert_id', '=', alertId)
      .executeTakeFirstOrThrow();
    expect(Number(notificationCount.count)).toBe(1);

    const reconciled = await clientB.reconnect();
    const finalSnapshot = await reconciled.subscribeAndWait(
      [accountStateChannel(accountId), userNotificationsChannel(userId)],
      'account.snapshot',
    );
    expect((finalSnapshot.payload as { pendingOrders: unknown[] }).pendingOrders).toHaveLength(0);
    reconciled.close();
  }, 480000);
});
