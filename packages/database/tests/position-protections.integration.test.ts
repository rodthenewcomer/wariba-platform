import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { activateEvaluationAccount } from '../src/activation';
import { createDbClient, type Db } from '../src/client';
import { resolvePositionProtectionTrigger } from '../src/position-protections';
import { closePosition, openPosition } from '../src/trading';
import { triggerPositionProtectionsAsLeader } from './market-trigger-fixture';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;
const NOW = new Date();
const OPEN_MARKET = {
  bid: '1.08450',
  ask: '1.08460',
  timestamp: NOW.toISOString(),
  sequence: '1',
};
const marketsWith = (market: typeof OPEN_MARKET) => ({
  EURUSD: market,
  GBPUSD: {
    bid: '1.26000',
    ask: '1.26020',
    timestamp: market.timestamp,
    sequence: market.sequence,
  },
  USDJPY: {
    bid: '150.100',
    ask: '150.120',
    timestamp: market.timestamp,
    sequence: market.sequence,
  },
  XAUUSD: {
    bid: '2000.00',
    ask: '2000.30',
    timestamp: market.timestamp,
    sequence: market.sequence,
  },
  NAS100: {
    bid: '18000.0',
    ask: '18002.0',
    timestamp: market.timestamp,
    sequence: market.sequence,
  },
});

describeIfDb('server-side attached SL/TP execution', () => {
  let db: Db;
  let userId: string;
  let accountId: string;
  const accountIds: string[] = [];

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `position-protection-${Date.now()}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    userId = ((await response.json()) as { id: string }).id;
  });

  beforeEach(async () => {
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
    accountIds.push(accountId);
  });

  afterAll(async () => {
    for (const id of accountIds) {
      const positions = await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', id)
        .execute();
      for (const position of positions) {
        await db.deleteFrom('app.fills').where('position_id', '=', position.id).execute();
      }
      await db.deleteFrom('app.trade_orders').where('account_id', '=', id).execute();
      await db.deleteFrom('app.positions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
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
        .deleteFrom('app.purchase_orders')
        .where('id', '=', account.source_purchase_order_id)
        .execute();
    }
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    await db.destroy();
  }, 30000);

  it('uses executable bid/ask semantics for buy and sell protections', () => {
    expect(
      resolvePositionProtectionTrigger({
        side: 'buy',
        stopLoss: '1.08300',
        takeProfit: '1.09000',
        bid: '1.08300',
        ask: '1.08310',
      }),
    ).toBe('stop_loss');
    expect(
      resolvePositionProtectionTrigger({
        side: 'sell',
        stopLoss: '1.09000',
        takeProfit: '1.08300',
        bid: '1.08290',
        ask: '1.08300',
      }),
    ).toBe('take_profit');
  });

  it('settles an exact-threshold stop loss once under five concurrent ticks', async () => {
    const opened = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.20',
      stopLoss: '1.08300',
      takeProfit: '1.09000',
      market: OPEN_MARKET,
      marketBySymbol: marketsWith(OPEN_MARKET),
      now: NOW,
    });
    const triggerMarket = {
      bid: '1.08300',
      ask: '1.08310',
      timestamp: new Date(NOW.getTime() + 1000).toISOString(),
      sequence: '2',
    };
    await Promise.all(
      Array.from({ length: 5 }, () =>
        triggerPositionProtectionsAsLeader(db, {
          symbol: 'EURUSD',
          market: triggerMarket,
          marketBySymbol: marketsWith(triggerMarket),
          now: new Date(NOW.getTime() + 1000),
        }),
      ),
    );
    const closes = await db
      .selectFrom('app.fills')
      .select('id')
      .where('position_id', '=', opened.position!.id)
      .where('fill_type', '=', 'close')
      .execute();
    expect(closes).toHaveLength(1);
  });

  it('manual close versus take-profit trigger produces one close fill', async () => {
    const opened = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'sell',
      quantity: '0.20',
      stopLoss: '1.09000',
      takeProfit: '1.08300',
      market: OPEN_MARKET,
      marketBySymbol: marketsWith(OPEN_MARKET),
      now: NOW,
    });
    const triggerMarket = {
      bid: '1.08290',
      ask: '1.08300',
      timestamp: new Date(NOW.getTime() + 1000).toISOString(),
      sequence: '3',
    };
    await Promise.all([
      triggerPositionProtectionsAsLeader(db, {
        symbol: 'EURUSD',
        market: triggerMarket,
        marketBySymbol: marketsWith(triggerMarket),
        now: new Date(NOW.getTime() + 1000),
      }),
      closePosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        positionId: opened.position!.id,
        mode: 'full',
        market: triggerMarket,
        marketBySymbol: marketsWith(triggerMarket),
        now: new Date(NOW.getTime() + 1000),
      }),
    ]);
    const closes = await db
      .selectFrom('app.fills')
      .select('id')
      .where('position_id', '=', opened.position!.id)
      .where('fill_type', '=', 'close')
      .execute();
    expect(closes).toHaveLength(1);
  });
});
