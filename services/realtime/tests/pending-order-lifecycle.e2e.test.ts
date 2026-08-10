import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';
import {
  accountStateChannel,
  accountOrdersChannel,
  createPendingOrderMessageSchema,
} from '@wariba/contracts';
import { RealtimeTestClient } from './realtime-test-client.js';
import { spawnRealtimeTestProcess, type RealtimeTestProcess } from './realtime-test-process.js';

globalThis.WebSocket ??= class {} as unknown as typeof WebSocket;

/**
 * Appendix 07-D acceptance gate 1 — real end-to-end proof that a pending
 * entry order's attached Stop Loss / Take Profit becomes an authoritative
 * position protection, triggers exactly once, and survives a reconnect.
 * Same spawn-the-real-process-and-drive-it-with-a-real-ws-client technique
 * as auth-isolation.e2e.test.ts (see that file's own doc comment for why —
 * this is the only honest way to exercise the tick-driven trigger path,
 * which lives entirely inside services/realtime's own process, not a
 * unit-testable pure function). A different port (4578, not 4577) so this
 * file's spawned process never collides with auth-isolation's if vitest
 * runs e2e files concurrently.
 *
 * Requires DATABASE_URL/SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY
 * in the environment (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const PORT = 4578;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;
const DOWNWARD_EURUSD_SEED = '295357';

describeIfDb('pending order lifecycle — attached SL/TP (real end-to-end)', () => {
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

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    email = `rt-pending-e2e-${Date.now()}@wariba-test.invalid`;
    userId = await createTestUser(email, password);
    accountId = await createActiveAccount(userId);
    token = await signIn(email, password);

    realtime = await spawnRealtimeTestProcess({
      cwd: process.cwd(),
      healthUrl: `${BASE_URL}/health`,
      healthTimeoutMs: 20000,
      env: {
        ...process.env,
        REALTIME_PORT: String(PORT),
        MARKET_DATA_PROVIDER: 'mock',
        MARKET_DATA_REPLAY_MODE: 'false',
        MARKET_TICK_INTERVAL_MS: '1000',
        SANDBOX_MARKET_SEED: DOWNWARD_EURUSD_SEED,
        ACCOUNT_RISK_PREVIEW_INTERVAL_MS: '5000',
      },
    });
  }, 40000);

  afterAll(async () => {
    await realtime?.stop();
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

  it('a Buy Limit with attached SL/TP triggers exactly once, the fill becomes an authoritative position protection, and a reconnect returns the correct entry/SL/TP', async () => {
    const client = await RealtimeTestClient.connect({
      token,
      url: WS_URL,
      defaultTimeoutMs: 45000,
      serverDiagnostics: () => realtime.logs(),
    });
    await client.subscribeAndWait(
      [accountStateChannel(accountId), accountOrdersChannel(accountId), 'market.symbol.EURUSD'],
      'account.snapshot',
    );

    // Real, live simulated market — the trigger price is derived from an
    // actually-observed tick, not a value this test invents, so the
    // creation-time isPendingOrderCreationPriceValid check (server-side,
    // packages/domain) is satisfied for real, not coincidentally.
    const tickMsg = await client.waitForMessage(
      'initial EURUSD market tick',
      (message) => message.type === 'market.tick',
    );
    const tick = tickMsg.payload as { bid: string; ask: string };
    const pricePrecision = 5;
    const onePoint = Number(`1e-${pricePrecision}`);
    // Just below the observed ask. The creation-time check only requires
    // `triggerPrice < ask` (isPendingOrderCreationPriceValid), so this is
    // still derived from a real tick and still a genuine limit order — but
    // it triggers on the next downtick instead of waiting for the random
    // walk to travel a fixed distance. At 17 points CI saw 61 ticks pass
    // without the market ever falling that far, and the test timed out
    // waiting for a fill that was never going to come.
    const triggerDistancePoints = 2;
    const triggerPrice = (Number(tick.ask) - triggerDistancePoints * onePoint).toFixed(
      pricePrecision,
    );
    // Far enough that the sandbox market cannot reach either one while this
    // test runs. This test is about SL/TP being *attached* atomically by the
    // trigger and surviving a reconnect — position-protections.integration
    // is where they actually firing is proven. At ±50 points the market
    // crossed one of them whenever the machine was loaded enough for the
    // test to take ~60s instead of ~8s, which closed the position and left
    // the reconnect assertions looking for an open position that had
    // legitimately gone.
    const protectionDistancePoints = 1000;
    const stopLoss = (Number(triggerPrice) - protectionDistancePoints * onePoint).toFixed(
      pricePrecision,
    );
    const takeProfit = (Number(triggerPrice) + protectionDistancePoints * onePoint).toFixed(
      pricePrecision,
    );

    const createIdempotencyKey = randomUUID();
    const pendingOrder = createPendingOrderMessageSchema.parse({
      accountId,
      idempotencyKey: createIdempotencyKey,
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice,
      stopLoss,
      takeProfit,
    });
    const created = await client.sendCommandAndAwaitResult({
      expectedEvent: 'pending_order_result',
      command: {
        type: 'create_pending_order',
        pendingOrder,
      },
    });
    const createdPayload = created.payload as {
      status: string;
      order: { id: string; requestedStopLoss: string; requestedTakeProfit: string } | null;
    };
    expect(createdPayload.status).toBe('active');
    expect(createdPayload.order?.requestedStopLoss).toBe(stopLoss);
    expect(createdPayload.order?.requestedTakeProfit).toBe(takeProfit);
    const pendingOrderId = createdPayload.order!.id;

    // The trigger fires through the exact same order_result channel a
    // trader-submitted market order uses (services/realtime/src/
    // websocket.ts's tick-loop hook reuses buildResultMessage) —
    // idempotencyKey is `pending-order:${pendingOrderId}`, never the
    // create command's own key, by design (packages/database/src/
    // pending-orders.ts's triggerPendingOrders doc comment).
    const filled = await client.waitForMessage(
      `authoritative fill for pending order ${pendingOrderId}`,
      (message) =>
        message.type === 'order_result' &&
        (message.payload as { idempotencyKey: string }).idempotencyKey ===
          `pending-order:${pendingOrderId}`,
      60000,
    );
    const filledPayload = filled.payload as {
      status: string;
      position: { id: string; stopLoss: string; takeProfit: string } | null;
    };
    expect(filledPayload.status).toBe('filled');
    expect(filledPayload.position).not.toBeNull();
    // SL/TP became authoritative position protections in the exact same
    // fill that opened the position — never a second, separate step a
    // trader could observe as briefly unprotected.
    expect(filledPayload.position?.stopLoss).toBe(stopLoss);
    expect(filledPayload.position?.takeProfit).toBe(takeProfit);
    const positionId = filledPayload.position!.id;

    // Triggers exactly once: no second order_result for the same
    // pending-order-derived idempotency key arrives on a further burst of
    // ticks, and the DB agrees — exactly one fill, one position, one
    // trade_orders row for this pending order.
    const extraFills = await client.observeMessages(
      (message) =>
        message.type === 'order_result' &&
        (message.payload as { idempotencyKey: string }).idempotencyKey ===
          `pending-order:${pendingOrderId}`,
      3000,
    );
    expect(extraFills).toHaveLength(0);

    // Scoped to opening fills: the guarantee under test is that the
    // trigger fired once, and an *opening* fill is what a trigger produces.
    // Counting every fill on the position also counted the close fill that
    // the attached SL/TP legitimately produces if the sandbox market
    // reaches one of them while the test is still running — which happened
    // whenever the machine was loaded enough for this test to take ~40s
    // instead of ~8s, failing a duplicate-trigger assertion for something
    // that is not a duplicate trigger.
    const fillRows = await db
      .selectFrom('app.fills')
      .select('id')
      .where('position_id', '=', positionId)
      .where('fill_type', '=', 'open')
      .execute();
    expect(fillRows).toHaveLength(1);
    const settledPendingOrder = await db
      .selectFrom('app.pending_orders')
      .select(['status', 'execution_order_id'])
      .where('id', '=', pendingOrderId)
      .executeTakeFirstOrThrow();
    expect(settledPendingOrder.status).toBe('filled');
    expect(settledPendingOrder.execution_order_id).not.toBeNull();

    // No crash can leave a filled position silently unprotected: SL/TP
    // are set in the SAME INSERT INTO app.positions that creates the row
    // (packages/database/src/trading.ts's openPosition), inside the one
    // Postgres transaction that also writes the fill, the ledger entry,
    // and the trade_orders status — ACID guarantees there is no
    // intermediate committed state where the position exists without
    // them. Asserted directly against the row here, not just the WS
    // payload, to prove it's what's actually durable.
    const positionRow = await db
      .selectFrom('app.positions')
      .select(['stop_loss', 'take_profit'])
      .where('id', '=', positionId)
      .executeTakeFirstOrThrow();
    expect(positionRow.stop_loss).toBe(stopLoss);
    expect(positionRow.take_profit).toBe(takeProfit);

    // Reconnect: a brand new connection, fresh subscribe, must see the
    // same entry/SL/TP from the server's own persisted state — never
    // from any client-side cache (there is none to fall back to).
    const reconnectedClient = await client.reconnect();
    const reconnectSnapshot = await reconnectedClient.subscribeAndWait(
      [accountStateChannel(accountId)],
      'account.snapshot',
    );
    const snapshotPayload = reconnectSnapshot.payload as {
      openPositions: { id: string; stopLoss: string; takeProfit: string }[];
      pendingOrders: unknown[];
    };
    const reconnectedPosition = snapshotPayload.openPositions.find((p) => p.id === positionId);
    expect(reconnectedPosition).toBeDefined();
    expect(reconnectedPosition?.stopLoss).toBe(stopLoss);
    expect(reconnectedPosition?.takeProfit).toBe(takeProfit);
    // The now-filled pending order no longer appears among active ones.
    expect(snapshotPayload.pendingOrders).toHaveLength(0);
    reconnectedClient.close();
  }, 150000);
});
