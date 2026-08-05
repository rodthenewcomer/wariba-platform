import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition, closePosition } from '../src/trading';

/**
 * Real integration tests against the live hosted database, each covering one
 * named invariant from Prompt 04's TESTS/PROPERTY TESTS section that isn't
 * already directly exercised (by name) in trading.integration.test.ts:
 *  - quantity never goes negative
 *  - fills are immutable
 *  - balance = ledger (reconciliation)
 *  - closed position always has zero open quantity (DB-level, not just app-level)
 *  - retry does not duplicate a result (closePosition specifically — the
 *    existing suite only covers this for openPosition)
 *
 * Requires DATABASE_URL in the environment (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const NOW = new Date();
const FRESH_TICK = NOW.toISOString();
// Used only for the post-trade risk evaluation's equity calc (fill pricing
// always uses the per-call `market` param) — full 5-symbol coverage so an
// account with positions in multiple symbols always gets an accurate check.
const ALL_MARKETS = {
  EURUSD: { bid: '1.08450', ask: '1.08460', timestamp: FRESH_TICK, sequence: '900' },
  GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '900' },
  USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '900' },
  XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '900' },
  NAS100: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '900' },
};

describeIfDb('trading invariants — real database', () => {
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

  // 100K by default (not 10K): this suite shares one account across many
  // independent test cases and now runs against the real Prompt 05 risk
  // engine — a 100K nominal gives enough DLL (3%) / Maximum Loss (10%)
  // headroom that ordinary test-sized fills (0.01-1 lot) can't accidentally
  // soft-lock or breach the account and starve a later test of an active one.
  const createActiveAccount = async (
    uid: string,
    productCode: '10K' | '100K' = '100K',
  ): Promise<string> => {
    const productVersion = await db
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select([
        'app.product_versions.id',
        'app.products.nominal_balance',
        'app.products.nominal_currency',
      ])
      .where('app.products.code', '=', productCode)
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
    userId = await createTestUser(`trading-props-${Date.now()}@wariba-test.invalid`);
    accountId = await createActiveAccount(userId);
  }, 30000);

  afterAll(async () => {
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
      // risk_violations references both account_state_transitions and
      // account_daily_snapshots — must be deleted before either.
      await db.deleteFrom('app.risk_violations').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      const acct = await db
        .selectFrom('app.trading_accounts')
        .select('source_purchase_order_id')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      await db.deleteFrom('app.trading_accounts').where('id', '=', id).execute();
      await db
        .deleteFrom('app.payment_events')
        .where('purchase_order_id', '=', acct.source_purchase_order_id)
        .execute();
      await db
        .deleteFrom('app.purchase_orders')
        .where('id', '=', acct.source_purchase_order_id)
        .execute();
    }
    await deleteTestUser(userId);
    await db.destroy();
  }, 30000);

  describe('quantity never goes negative', () => {
    it('a partial close requesting more than open_quantity is rejected, leaving quantity untouched', async () => {
      const open = await openPosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'GBPUSD',
        side: 'buy',
        quantity: '0.10',
        market: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '20' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const positionId = open.position?.id as string;

      const overClose = await closePosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        positionId,
        mode: 'partial',
        quantity: '0.15', // more than the 0.10 that's open
        market: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '21' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      expect(overClose.order.status).toBe('rejected');
      expect(overClose.order.rejectionCode).toBe('invalid_quantity');

      const row = await db
        .selectFrom('app.positions')
        .select('open_quantity')
        .where('id', '=', positionId)
        .executeTakeFirstOrThrow();
      expect(row.open_quantity).toBe('0.1000'); // unchanged
    }, 15000);

    it('a partial close requesting exactly the full open_quantity is rejected (must use full_close)', async () => {
      const open = await openPosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'GBPUSD',
        side: 'sell',
        quantity: '0.10',
        market: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '22' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const positionId = open.position?.id as string;

      const equalClose = await closePosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        positionId,
        mode: 'partial',
        quantity: '0.10', // equal to open — must be strictly less for a partial close
        market: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '23' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      expect(equalClose.order.status).toBe('rejected');
      expect(equalClose.order.rejectionCode).toBe('invalid_quantity');
    }, 15000);

    it('the database itself refuses a negative open_quantity — a CHECK constraint, not just application logic', async () => {
      await expect(
        db
          .insertInto('app.positions')
          .values({
            account_id: accountId,
            symbol: 'GBPUSD',
            side: 'buy',
            opening_quantity: '0.10',
            open_quantity: '-0.01',
            average_open_price: '1.10000',
            account_sequence: '999',
          })
          .execute(),
      ).rejects.toThrow();
    }, 15000);
  });

  describe('fills are immutable', () => {
    it('earlier fills are never mutated by a later operation on the same position', async () => {
      const open = await openPosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'XAUUSD',
        side: 'buy',
        quantity: '0.10',
        market: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '24' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const positionId = open.position?.id as string;
      const fill1Id = open.fill?.id as string;
      const fill1Snapshot = await db
        .selectFrom('app.fills')
        .selectAll()
        .where('id', '=', fill1Id)
        .executeTakeFirstOrThrow();

      const close1 = await closePosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        positionId,
        mode: 'partial',
        quantity: '0.03',
        market: { bid: '2010.00', ask: '2010.30', timestamp: FRESH_TICK, sequence: '25' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const fill2Id = close1.fill?.id as string;
      const fill2Snapshot = await db
        .selectFrom('app.fills')
        .selectAll()
        .where('id', '=', fill2Id)
        .executeTakeFirstOrThrow();

      await closePosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        positionId,
        mode: 'partial',
        quantity: '0.02',
        market: { bid: '2020.00', ask: '2020.30', timestamp: FRESH_TICK, sequence: '26' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });

      const fill1After = await db
        .selectFrom('app.fills')
        .selectAll()
        .where('id', '=', fill1Id)
        .executeTakeFirstOrThrow();
      const fill2After = await db
        .selectFrom('app.fills')
        .selectAll()
        .where('id', '=', fill2Id)
        .executeTakeFirstOrThrow();

      expect(fill1After).toEqual(fill1Snapshot);
      expect(fill2After).toEqual(fill2Snapshot);

      const allFills = await db
        .selectFrom('app.fills')
        .select('id')
        .where('position_id', '=', positionId)
        .execute();
      expect(allFills).toHaveLength(3); // 1 open + 2 partial closes, never merged/updated in place
      // 30s: an open plus two partial closes, each a real round trip in
      // this environment's confirmed latency — not related to any
      // Prompt 07 change (no rejection path here).
    }, 30000);
  });

  describe('balance = ledger (reconciliation)', () => {
    // Isolated account (not the describe-block-shared one) — this test needs
    // its ledger untouched by other tests' opens/closes to hand-verify the sum.
    let reconciliationAccountId: string;

    beforeAll(async () => {
      const uid = await createTestUser(`trading-props-recon-${Date.now()}@wariba-test.invalid`);
      reconciliationAccountId = await createActiveAccount(uid);
    }, 30000);

    it('summed ledger entries equal initial balance plus independently hand-computed PnL and commission', async () => {
      const initialBalance = new Decimal(
        (
          await db
            .selectFrom('app.trading_ledger_entries')
            .select('amount')
            .where('account_id', '=', reconciliationAccountId)
            .where('entry_type', '=', 'initial_balance')
            .executeTakeFirstOrThrow()
        ).amount,
      );

      // EURUSD spec: price_precision 5, slippage_points 2, commission_per_lot
      // 7.00, contract_size 100000 (see the trading_core migration seed data).
      // Open buy 0.10 @ ask 1.10000 -> fill 1.10000 + 0.00002 = 1.10002 (buy-open is adverse).
      // Full close @ bid 1.12000 -> fill 1.12000 - 0.00002 = 1.11998 (buy-close is not adverse).
      // realizedPnl = (1.11998 - 1.10002) * 100000 * 0.10 = 199.60
      // commission = 7.00 * 0.10 = 0.70, charged on both the open and close fill.
      const open = await openPosition(db, {
        accountId: reconciliationAccountId,
        idempotencyKey: randomUUID(),
        symbol: 'EURUSD',
        side: 'buy',
        quantity: '0.10',
        market: { bid: '1.09990', ask: '1.10000', timestamp: FRESH_TICK, sequence: '27' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      expect(open.position?.averageOpenPrice).toBe('1.10002');
      expect(open.fill?.commission).toBe('0.7000'); // numeric(10,4)

      const close = await closePosition(db, {
        accountId: reconciliationAccountId,
        idempotencyKey: randomUUID(),
        positionId: open.position?.id as string,
        mode: 'full',
        market: { bid: '1.12000', ask: '1.12010', timestamp: FRESH_TICK, sequence: '28' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      expect(close.fill?.realizedPnl).toBe('199.60');
      expect(close.fill?.commission).toBe('0.7000'); // numeric(10,4)

      const ledgerRows = await db
        .selectFrom('app.trading_ledger_entries')
        .select('amount')
        .where('account_id', '=', reconciliationAccountId)
        .execute();
      const ledgerSum = ledgerRows.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));

      const expectedTotal = initialBalance.plus('-0.70').plus('199.60').plus('-0.70');
      expect(ledgerSum.toFixed(2)).toBe(expectedTotal.toFixed(2));

      // trading_accounts has no separate "balance" column to drift from the
      // ledger — this is a structural guarantee, not just a coincidence.
      const columns = await sql<{ column_name: string }>`
        select column_name from information_schema.columns
        where table_schema = 'app' and table_name = 'trading_accounts'
      `.execute(db);
      expect(columns.rows.some((c) => c.column_name === 'balance')).toBe(false);
    }, 20000);
  });

  describe('closed position always has zero open quantity (DB-level)', () => {
    it('the database refuses status=closed with a nonzero open_quantity, independent of application logic', async () => {
      await expect(
        db
          .insertInto('app.positions')
          .values({
            account_id: accountId,
            symbol: 'USDJPY',
            side: 'buy',
            opening_quantity: '0.10',
            open_quantity: '0.05', // nonzero
            average_open_price: '150.000',
            status: 'closed',
            account_sequence: '998',
          })
          .execute(),
      ).rejects.toThrow();
    }, 15000);

    it('a real full close ends with open_quantity exactly 0.0000 and status closed', async () => {
      const open = await openPosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'USDJPY',
        side: 'sell',
        quantity: '0.10',
        market: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '29' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const close = await closePosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        positionId: open.position?.id as string,
        mode: 'full',
        market: { bid: '150.200', ask: '150.220', timestamp: FRESH_TICK, sequence: '30' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      expect(close.position?.openQuantity).toBe('0.0000');
      expect(close.position?.status).toBe('closed');
    }, 15000);
  });

  describe('retry does not duplicate a result (closePosition)', () => {
    it('a second closePosition call with the same idempotency key replays the first result, no second fill', async () => {
      const open = await openPosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'NAS100',
        side: 'buy',
        quantity: '1',
        market: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '31' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const positionId = open.position?.id as string;
      const idempotencyKey = randomUUID();
      const closeMarket = { bid: '18010.0', ask: '18012.0', timestamp: FRESH_TICK, sequence: '32' };

      const first = await closePosition(db, {
        accountId,
        idempotencyKey,
        positionId,
        mode: 'full',
        market: closeMarket,
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const second = await closePosition(db, {
        accountId,
        idempotencyKey,
        positionId,
        mode: 'full',
        market: closeMarket,
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });

      expect(second.order.alreadyExisted).toBe(true);
      expect(second.order.orderId).toBe(first.order.orderId);
      expect(second.fill?.id).toBe(first.fill?.id);

      const fills = await db
        .selectFrom('app.fills')
        .select('id')
        .where('position_id', '=', positionId)
        .where('fill_type', '=', 'close')
        .execute();
      expect(fills).toHaveLength(1); // not doubled by the retry
    }, 20000);

    it('stays at exactly one close fill under 5-way concurrent close retries with the same idempotency key', async () => {
      const open = await openPosition(db, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'NAS100',
        side: 'sell',
        quantity: '1',
        market: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '33' },
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      const positionId = open.position?.id as string;
      const idempotencyKey = randomUUID();
      const closeMarket = { bid: '17990.0', ask: '17992.0', timestamp: FRESH_TICK, sequence: '34' };

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          closePosition(db, {
            accountId,
            idempotencyKey,
            positionId,
            mode: 'full',
            market: closeMarket,
            marketBySymbol: ALL_MARKETS,
            now: NOW,
          }),
        ),
      );
      const uniqueFillIds = new Set(results.map((r) => r.fill?.id));
      expect(uniqueFillIds.size).toBe(1);
    }, 20000);
  });
});
