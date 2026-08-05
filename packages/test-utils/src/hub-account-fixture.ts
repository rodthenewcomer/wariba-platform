import { randomUUID } from 'node:crypto';
import { activateEvaluationAccount, createDbClient, type Db } from '@wariba/database';

/**
 * E2E fixture helpers for the Hub spec suite — real DB seeding for
 * Playwright, same reasoning as trade-account-fixture.ts for why this
 * lives in @wariba/test-utils rather than apps/web (AGENTS.md §7.1).
 */
export const E2E_TEST_PASSWORD = `Hub-e2e-${randomUUID().slice(0, 12)}!`;

export interface E2eFixtureAccount {
  userId: string;
  email: string;
  accountId: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} for E2E fixtures.`);
  return value;
}

export function createFixtureDb(): Db {
  return createDbClient(requireEnv('DATABASE_URL'));
}

async function createTestUser(email: string): Promise<string> {
  const res = await fetch(`${requireEnv('SUPABASE_URL')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${requireEnv('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: E2E_TEST_PASSWORD, email_confirm: true }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function deleteTestUser(id: string): Promise<void> {
  await fetch(`${requireEnv('SUPABASE_URL')}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      apikey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${requireEnv('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
  });
}

/** Same direct-activation pattern as the packages' integration tests — real DB, no mocks. */
export async function createFixtureAccount(
  db: Db,
  label: string,
  productCode: '5K' | '10K' = '5K',
): Promise<E2eFixtureAccount> {
  const email = `hub-e2e-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`;
  const userId = await createTestUser(email);

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
      total_amount: productCode === '5K' ? '22500.00' : '39900.00',
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

  return { userId, email, accountId: account.id };
}

/** For a second account under the SAME user (e.g. testing the account switcher). */
export async function attachFixtureAccountToUser(
  db: Db,
  fixture: E2eFixtureAccount,
  userId: string,
): Promise<void> {
  await db
    .updateTable('app.trading_accounts')
    .set({ user_id: userId })
    .where('id', '=', fixture.accountId)
    .execute();
}

export async function deleteFixtureAccount(db: Db, fixture: E2eFixtureAccount): Promise<void> {
  const positions = await db
    .selectFrom('app.positions')
    .select('id')
    .where('account_id', '=', fixture.accountId)
    .execute();
  await db.deleteFrom('app.fills').where('account_id', '=', fixture.accountId).execute();
  await db.deleteFrom('app.trade_orders').where('account_id', '=', fixture.accountId).execute();
  await db.deleteFrom('app.positions').where('account_id', '=', fixture.accountId).execute();
  await db
    .deleteFrom('app.trading_ledger_entries')
    .where('account_id', '=', fixture.accountId)
    .execute();
  for (const position of positions) {
    await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', position.id).execute();
  }
  await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', fixture.accountId).execute();
  await db.deleteFrom('app.risk_violations').where('account_id', '=', fixture.accountId).execute();
  await db
    .deleteFrom('app.account_daily_snapshots')
    .where('account_id', '=', fixture.accountId)
    .execute();
  await db
    .deleteFrom('app.account_state_transitions')
    .where('account_id', '=', fixture.accountId)
    .execute();
  const account = await db
    .selectFrom('app.trading_accounts')
    .select('source_purchase_order_id')
    .where('id', '=', fixture.accountId)
    .executeTakeFirst();
  await db.deleteFrom('app.trading_accounts').where('id', '=', fixture.accountId).execute();
  if (account) {
    await db
      .deleteFrom('app.payment_events')
      .where('purchase_order_id', '=', account.source_purchase_order_id)
      .execute();
    await db
      .deleteFrom('app.purchase_orders')
      .where('id', '=', account.source_purchase_order_id)
      .execute();
  }
  await db.deleteFrom('app.user_consents').where('user_id', '=', fixture.userId).execute();
  await deleteTestUser(fixture.userId);
}
