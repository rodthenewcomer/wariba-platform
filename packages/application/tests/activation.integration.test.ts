import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';
import { getLatestAccountForUser } from '../src/index';

/**
 * Real integration tests against the live hosted database — not mocked.
 * Requires DATABASE_URL in the environment (via .env.local, gitignored).
 * Skips gracefully if it's absent, mirroring commerce.integration.test.ts.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('getLatestAccountForUser — real database', () => {
  let db: Db;
  let userId: string;
  const accountIds: string[] = [];

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

  const createAccount = async (productCode: '5K' | '10K'): Promise<string> => {
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
    accountIds.push(account.id);
    return account.id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userId = await createTestUser(`activation-test-${Date.now()}@wariba-test.invalid`);
  }, 30000);

  afterAll(async () => {
    for (const id of accountIds) {
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
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

  // Regression: the join against app.policy_versions (which also has its own
  // created_at column) made a bare `.orderBy('created_at', 'desc')` ambiguous
  // to Postgres — a real, unguarded runtime error that broke /trade, /hub,
  // and /bienvenue entirely, caught via a real browser check against /trade.
  it('does not throw an ambiguous-column error joining trading_accounts to policy_versions', async () => {
    await createAccount('10K');
    await expect(getLatestAccountForUser(db, { userId })).resolves.toBeDefined();
  });

  it('returns the most recently created account when a user has more than one', async () => {
    const first = await createAccount('5K');
    const second = await createAccount('10K');
    const result = await getLatestAccountForUser(db, { userId });
    expect(result?.id).toBe(second);
    expect(result?.id).not.toBe(first);
  });

  it('prefers the account tied to a specific purchaseOrderId over the most recent one', async () => {
    const older = await createAccount('5K');
    await createAccount('10K');
    const olderAccountRow = await db
      .selectFrom('app.trading_accounts')
      .select('source_purchase_order_id')
      .where('id', '=', older)
      .executeTakeFirstOrThrow();

    const result = await getLatestAccountForUser(db, {
      userId,
      purchaseOrderId: olderAccountRow.source_purchase_order_id,
    });
    expect(result?.id).toBe(older);
  });
});
