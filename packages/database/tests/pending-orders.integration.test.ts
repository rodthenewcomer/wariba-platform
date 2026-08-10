import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition } from '../src/trading';
import { triggerPendingOrdersAsLeader } from './market-trigger-fixture';
import {
  createPendingOrder,
  modifyPendingOrder,
  cancelPendingOrder,
  cancelAllPendingOrders,
  loadActivePendingOrdersForAccount,
} from '../src/pending-orders';

/**
 * Prompt 7 Appendix 07-D — real integration tests for the Buy/Sell
 * Limit/Stop pending-order lifecycle, against the live hosted database.
 * Requires DATABASE_URL in the environment (via .env.local, gitignored) —
 * same convention as position-reduction-queue.integration.test.ts.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const NOW = new Date();
const FRESH_TICK = NOW.toISOString();
// EURUSD symbol_specs (WARIBA-SANDBOX-SYMBOLS-1.1.0): price_precision 5,
// slippage_points 2 — a fill's slippage-adjusted price is always exactly
// ±0.00002 from the quoted bid/ask, computed once below per test.
const FRESH_MARKET = { bid: '1.08450', ask: '1.08460', timestamp: FRESH_TICK, sequence: '1' };
// Far enough below FRESH_MARKET that a buy_limit/sell_stop trigger placed
// against FRESH_MARKET is guaranteed to be met, and far enough above for a
// sell_limit/buy_stop trigger — never straddling the original spread.
const LOWER_MARKET = { bid: '1.08300', ask: '1.08310', timestamp: FRESH_TICK, sequence: '2' };
const HIGHER_MARKET = { bid: '1.08600', ask: '1.08610', timestamp: FRESH_TICK, sequence: '2' };
const ALL_MARKETS_FRESH = {
  EURUSD: FRESH_MARKET,
  GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '900' },
  USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '900' },
  XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '900' },
  NAS100: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '900' },
};
const marketsWith = (eurusd: typeof FRESH_MARKET) => ({ ...ALL_MARKETS_FRESH, EURUSD: eurusd });

describeIfDb('pending-orders — real database', () => {
  let db: Db;
  let userId: string;
  let accountId: string;
  const cleanupAccountIds: string[] = [];

  const createTestUser = async (email: string): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: randomUUID(), email_confirm: true }),
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

  const createActiveAccount = async (): Promise<string> => {
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
    cleanupAccountIds.push(account.id);
    return account.id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userId = await createTestUser(`pending-orders-test-${Date.now()}@wariba-test.invalid`);
  }, 60000);

  beforeEach(async () => {
    accountId = await createActiveAccount();
  }, 30000);

  afterAll(async () => {
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
  }, 60000);

  it('rejects a buy_limit trigger price that is not below the current ask', async () => {
    const result = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice: '1.08470', // above ask (1.08460) — invalid for buy_limit
      market: FRESH_MARKET,
      now: NOW,
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionCode).toBe('invalid_trigger_price');
  });

  it('rejects a trigger price that does not match the symbol precision', async () => {
    const result = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice: '1.084001', // 6dp — EURUSD is 5dp
      market: FRESH_MARKET,
      now: NOW,
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionCode).toBe('invalid_price_precision');
  });

  it('creates a valid buy_limit order and is idempotent on replay', async () => {
    const idempotencyKey = randomUUID();
    const params = {
      accountId,
      idempotencyKey,
      symbol: 'EURUSD' as const,
      orderType: 'buy_limit' as const,
      quantity: '0.50',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    };
    const first = await createPendingOrder(db, params);
    expect(first.status).toBe('active');
    expect(first.order?.side).toBe('buy');

    const second = await createPendingOrder(db, params);
    expect(second.order?.id).toBe(first.order?.id);

    const active = await loadActivePendingOrdersForAccount(db, accountId);
    expect(active.filter((o) => o.id === first.order?.id)).toHaveLength(1);
  });

  it('modifies an active order under a version guard and rejects a stale version implicitly via re-fetch', async () => {
    const created = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });
    const orderId = created.order!.id;

    const modified = await modifyPendingOrder(db, {
      accountId,
      pendingOrderId: orderId,
      triggerPrice: '1.08410',
      market: FRESH_MARKET,
      now: NOW,
    });
    expect(modified.status).toBe('active');
    expect(modified.order?.triggerPrice).toBe('1.08410');
    expect(modified.order?.version).toBe(created.order!.version + 1);
  });

  it('rejects modifying a pending order that no longer exists', async () => {
    const result = await modifyPendingOrder(db, {
      accountId,
      pendingOrderId: randomUUID(),
      triggerPrice: '1.08410',
      market: FRESH_MARKET,
      now: NOW,
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionCode).toBe('pending_order_not_found');
  });

  it('cancels an active order, and rejects cancelling it again', async () => {
    const created = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });
    const orderId = created.order!.id;

    const cancelled = await cancelPendingOrder(db, {
      accountId,
      pendingOrderId: orderId,
      now: NOW,
    });
    expect(cancelled.status).toBe('active');
    expect(cancelled.order?.status).toBe('cancelled');

    const secondCancel = await cancelPendingOrder(db, {
      accountId,
      pendingOrderId: orderId,
      now: NOW,
    });
    expect(secondCancel.status).toBe('rejected');
    expect(secondCancel.rejectionCode).toBe('pending_order_already_settled');

    const active = await loadActivePendingOrdersForAccount(db, accountId);
    expect(active.filter((o) => o.id === orderId)).toHaveLength(0);
  });

  it('cancels every active order on the account at once', async () => {
    await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.30',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });
    await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'sell_limit',
      quantity: '0.20',
      triggerPrice: '1.08500',
      market: FRESH_MARKET,
      now: NOW,
    });

    const cancelled = await cancelAllPendingOrders(db, { accountId, now: NOW });
    expect(cancelled).toHaveLength(2);
    expect(cancelled.every((o) => o.status === 'cancelled')).toBe(true);

    const active = await loadActivePendingOrdersForAccount(db, accountId);
    expect(active).toHaveLength(0);
  });

  it('triggers a buy_limit order once the ask drops to or below the trigger price, filling through openPosition unchanged', async () => {
    await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice: '1.08400',
      stopLoss: '1.08000',
      takeProfit: '1.09000',
      market: FRESH_MARKET,
      now: NOW,
    });

    // Not yet triggered: FRESH_MARKET's ask (1.08460) is still above 1.08400.
    const notYet = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: FRESH_MARKET,
        marketBySymbol: ALL_MARKETS_FRESH,
        now: NOW,
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(notYet).toHaveLength(0);

    const later = new Date(NOW.getTime() + 1_000);
    const triggered = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: LOWER_MARKET,
        marketBySymbol: marketsWith(LOWER_MARKET),
        now: later,
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(triggered).toHaveLength(1);
    expect(triggered[0]?.order.status).toBe('filled');
    expect(triggered[0]?.commandResult?.order.status).toBe('filled');

    // computeFillPrice(bid=1.08300, ask=1.08310, buy, open, slippage=2,
    // precision=5) = ask + 2 points = 1.08310 + 0.00002, well inside (below)
    // the 1.08400 trigger price, so clampPendingOrderFillPrice never has to
    // clamp it — the trader gets the better, actual market price.
    const position = triggered[0]!.commandResult!.position!;
    expect(position.averageOpenPrice).toBe('1.08312');
    expect(position.side).toBe('buy');
    // Attached SL/TP activate atomically in the same fill — never a second,
    // separate step a trader could see partially applied.
    expect(position.stopLoss).toBe('1.08000');
    expect(position.takeProfit).toBe('1.09000');

    // A second tick at the same or a still-triggering price must never
    // trigger this same order again — it already settled to 'filled'.
    const secondTick = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: LOWER_MARKET,
        marketBySymbol: marketsWith(LOWER_MARKET),
        now: new Date(later.getTime() + 1_000),
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(secondTick).toHaveLength(0);
  });

  it('triggers a sell_stop order once the bid drops to or below the trigger price', async () => {
    await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'sell_stop',
      quantity: '0.50',
      triggerPrice: '1.08400', // valid: sell_stop requires price < bid (1.08450)
      market: FRESH_MARKET,
      now: NOW,
    });

    const triggered = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: LOWER_MARKET, // bid 1.08300 <= 1.08400
        marketBySymbol: marketsWith(LOWER_MARKET),
        now: new Date(NOW.getTime() + 1_000),
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(triggered).toHaveLength(1);
    expect(triggered[0]?.order.status).toBe('filled');
    expect(triggered[0]?.commandResult?.position?.side).toBe('sell');
  });

  /**
   * Appendix 08-A — buy_stop was the one order type with domain-level
   * semantics but no integration trigger proof. A stop order is the case
   * where the fill price may legitimately be *worse* than the trigger (a gap
   * through the stop is not clamped, unlike a limit), so this asserts the
   * gap behaviour explicitly rather than only the trigger condition.
   */
  it('triggers a buy_stop once the ask reaches the stop, filling past it on a gap, exactly once', async () => {
    const created = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_stop',
      quantity: '0.50',
      triggerPrice: '1.08500', // valid: buy_stop requires price > ask (1.08460)
      market: FRESH_MARKET,
      now: NOW,
    });
    expect(created.order?.status).toBe('active');

    // A tick that has not reached the stop leaves the order untouched.
    const beforeTrigger = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: FRESH_MARKET,
        marketBySymbol: marketsWith(FRESH_MARKET),
        now: new Date(NOW.getTime() + 500),
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(beforeTrigger).toHaveLength(0);
    expect(
      (
        await db
          .selectFrom('app.pending_orders')
          .select('status')
          .where('id', '=', created.order?.id as string)
          .executeTakeFirstOrThrow()
      ).status,
    ).toBe('active');

    // The market gaps straight through 1.08500 to an ask of 1.08610. A stop
    // is not clamped, so the fill is allowed to be worse than the stop.
    const triggered = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: HIGHER_MARKET, // ask 1.08610 >= 1.08500
        marketBySymbol: marketsWith(HIGHER_MARKET),
        now: new Date(NOW.getTime() + 1_000),
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(triggered).toHaveLength(1);
    expect(triggered[0]?.order.status).toBe('filled');
    expect(triggered[0]?.commandResult?.position?.side).toBe('buy');
    const entryPrice = triggered[0]?.commandResult?.position?.averageOpenPrice as string;
    expect(Number(entryPrice)).toBeGreaterThanOrEqual(1.085);

    // Trigger-time risk revalidation ran on the canonical open path: the
    // fill produced a real order + position + fill, not a bare status flip.
    expect(triggered[0]?.commandResult?.order.status).toBe('filled');
    expect(triggered[0]?.commandResult?.fill).not.toBeNull();

    // A second evaluation of the same order must not fill it again.
    const replayed = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: HIGHER_MARKET,
        marketBySymbol: marketsWith(HIGHER_MARKET),
        now: new Date(NOW.getTime() + 2_000),
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(replayed).toHaveLength(0);
    const fills = await db
      .selectFrom('app.trade_orders')
      .select('id')
      .where('account_id', '=', accountId)
      .where('idempotency_key', '=', `pending-order:${created.order?.id as string}`)
      .where('status', '=', 'filled')
      .execute();
    expect(fills).toHaveLength(1);
  });

  it('triggers a sell_limit order once the bid rises to or above the trigger price', async () => {
    await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'sell_limit',
      quantity: '0.50',
      triggerPrice: '1.08500', // valid: sell_limit requires price > bid (1.08450)
      market: FRESH_MARKET,
      now: NOW,
    });

    const triggered = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: HIGHER_MARKET, // bid 1.08600 >= 1.08500
        marketBySymbol: marketsWith(HIGHER_MARKET),
        now: new Date(NOW.getTime() + 1_000),
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(triggered).toHaveLength(1);
    expect(triggered[0]?.order.status).toBe('filled');
    expect(triggered[0]?.commandResult?.position?.side).toBe('sell');
  });

  it('fails (never stuck as triggered) when the account would breach its exposure limit by the time the order fills', async () => {
    // Creation-time check only considers currently-open positions — none
    // exist yet, so this 0.50 lot order is accepted.
    await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });

    // A separate, immediate market order now occupies most of the account's
    // 0.60 lot aggregate forex exposure budget (Program Rulebook v1.1 §6) —
    // the pending order's own creation-time check never saw this coming.
    const directOpen = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.50',
      market: FRESH_MARKET,
      marketBySymbol: ALL_MARKETS_FRESH,
      now: NOW,
    });
    expect(directOpen.order.status).toBe('filled');

    const triggered = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: LOWER_MARKET,
        marketBySymbol: marketsWith(LOWER_MARKET),
        now: new Date(NOW.getTime() + 1_000),
      })
    ).filter((entry) => entry.accountId === accountId);
    expect(triggered).toHaveLength(1);
    // Never left dangling as 'triggered' — openPosition's own re-check
    // rejects it, and triggerPendingOrders settles the row to 'failed'
    // with that exact rejection code, the same safety net documented in
    // packages/database/src/pending-orders.ts's own createPendingOrder
    // doc comment.
    expect(triggered[0]?.order.status).toBe('failed');
    expect(triggered[0]?.order.rejectionCode).toBe('exposure_limit_exceeded');
    expect(triggered[0]?.commandResult?.order.status).toBe('rejected');
  });

  it('trigger versus cancel has one terminal outcome and at most one financial fill', async () => {
    const created = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.20',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });
    const pendingOrderId = created.order!.id;
    await Promise.all([
      triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: LOWER_MARKET,
        marketBySymbol: marketsWith(LOWER_MARKET),
        now: new Date(NOW.getTime() + 1000),
      }),
      cancelPendingOrder(db, {
        accountId,
        pendingOrderId,
        now: new Date(NOW.getTime() + 1000),
      }),
    ]);

    const terminal = await db
      .selectFrom('app.pending_orders')
      .select(['status', 'execution_order_id'])
      .where('id', '=', pendingOrderId)
      .executeTakeFirstOrThrow();
    expect(['filled', 'cancelled']).toContain(terminal.status);
    const openingFills = await db
      .selectFrom('app.fills')
      .select('id')
      .where('account_id', '=', accountId)
      .where('fill_type', '=', 'open')
      .execute();
    expect(openingFills.length).toBe(terminal.status === 'filled' ? 1 : 0);
  });

  it('trigger versus price modification uses the row lock and versioned terminal state', async () => {
    const created = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.20',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });
    const pendingOrderId = created.order!.id;
    await Promise.all([
      triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: LOWER_MARKET,
        marketBySymbol: marketsWith(LOWER_MARKET),
        now: new Date(NOW.getTime() + 1000),
      }),
      modifyPendingOrder(db, {
        accountId,
        pendingOrderId,
        triggerPrice: '1.08200',
        market: FRESH_MARKET,
        now: new Date(NOW.getTime() + 1000),
      }),
    ]);

    const final = await db
      .selectFrom('app.pending_orders')
      .select(['status', 'trigger_price', 'version'])
      .where('id', '=', pendingOrderId)
      .executeTakeFirstOrThrow();
    expect(['active', 'filled']).toContain(final.status);
    if (final.status === 'active') {
      expect(final.trigger_price).toBe('1.08200');
      expect(final.version).toBe(created.order!.version + 1);
    }
    const fills = await db
      .selectFrom('app.fills')
      .select('id')
      .where('account_id', '=', accountId)
      .where('fill_type', '=', 'open')
      .execute();
    expect(fills.length).toBe(final.status === 'filled' ? 1 : 0);
  });

  it.each(['soft_locked', 'breached'] as const)(
    'revalidates account status at trigger time and fails under %s',
    async (status) => {
      const created = await createPendingOrder(db, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'EURUSD',
        orderType: 'buy_limit',
        quantity: '0.20',
        triggerPrice: '1.08400',
        market: FRESH_MARKET,
        now: NOW,
      });
      await db
        .updateTable('app.trading_accounts')
        .set({ status })
        .where('id', '=', accountId)
        .execute();
      const triggered = (
        await triggerPendingOrdersAsLeader(db, {
          symbol: 'EURUSD',
          market: LOWER_MARKET,
          marketBySymbol: marketsWith(LOWER_MARKET),
          now: new Date(NOW.getTime() + 1000),
        })
      ).find((entry) => entry.order.id === created.order!.id);
      expect(triggered?.order.status).toBe('failed');
      expect(triggered?.order.rejectionCode).toBe('account_not_active');
    },
  );

  it('never fills a pending trigger from stale market data', async () => {
    const created = await createPendingOrder(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.20',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });
    const staleNow = new Date(NOW.getTime() + 60_000);
    const staleTrigger = { ...LOWER_MARKET, timestamp: NOW.toISOString(), sequence: '3' };
    const triggered = (
      await triggerPendingOrdersAsLeader(db, {
        symbol: 'EURUSD',
        market: staleTrigger,
        marketBySymbol: marketsWith(staleTrigger),
        now: staleNow,
      })
    ).find((entry) => entry.order.id === created.order!.id);
    expect(triggered?.order.status).toBe('failed');
    expect(triggered?.order.rejectionCode).toBe('stale_market_data');
    expect(triggered?.commandResult?.position).toBeNull();
  });
});
