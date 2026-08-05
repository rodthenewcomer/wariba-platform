import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';

export interface TradeAccount {
  userId: string;
  email: string;
  password: string;
  accountId: string;
  /** What the UI shows — accountId.slice(0, 8).toUpperCase(), see AccountContext/OrderTicket. */
  accountPublicId: string;
}

async function createTestUser(email: string, password: string): Promise<string> {
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
}

async function activateTradeAccount(db: Db, userId: string): Promise<string> {
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

/**
 * One fresh user + one active WARIBA ONE account per test — every E2E
 * scenario here needs a real, isolated account (open positions/orders from
 * one test must never bleed into another's assertions). No teardown: this
 * points at the shared hosted Supabase dev project, same as every
 * integration test in this repo — orphaned fixture rows are an accepted,
 * already-established cost here, not something worth a cleanup pass per run.
 */
export const test = base.extend<{ tradeAccount: TradeAccount }>({
  // Playwright's fixture API requires this literal `{}` destructuring shape
  // to statically detect which fixtures a given fixture depends on — this
  // one depends on none.
  // eslint-disable-next-line no-empty-pattern
  tradeAccount: async ({}, use) => {
    const db = createDbClient(process.env.DATABASE_URL as string);
    const email = `e2e-trade-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`;
    const password = randomUUID();
    const userId = await createTestUser(email, password);
    const accountId = await activateTradeAccount(db, userId);
    await db.destroy();

    await use({
      userId,
      email,
      password,
      accountId,
      accountPublicId: accountId.slice(0, 8).toUpperCase(),
    });
  },
});

export { expect };
