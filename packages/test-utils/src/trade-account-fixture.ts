import { randomUUID } from 'node:crypto';
import { createDbClient, activateEvaluationAccount, type Db } from '@wariba/database';
import { createAuthFixtureUser } from './supabase-auth-fixture';

/**
 * E2E fixture helper — real DB seeding for Playwright specs. Lives here
 * (not in apps/web) because apps/web may never import @wariba/database
 * directly (AGENTS.md §7.1 / Engineering Constitution §6.2, enforced by
 * scripts/check-boundaries.mjs) — that boundary is about the shipped
 * frontend never bypassing the server-authoritative layer, which doesn't
 * apply to Node-side test setup, but keeping the rule absolute (no
 * test-file carve-outs in the boundary checker) is simpler to reason about
 * than a pattern-matched exception that could later mask a real violation.
 */
export interface TradeAccountFixture {
  userId: string;
  email: string;
  password: string;
  accountId: string;
  /**
   * The account's canonical `public_id`, which is what every surface shows
   * since W1 — the Hub selector always did, and WariX stopped rendering
   * `accountId.slice(0, 8)` (an internal detail the trader saw nowhere else)
   * when the workstation account switcher replaced the terminal header.
   */
  accountPublicId: string;
}

async function createTestUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string,
): Promise<string> {
  return createAuthFixtureUser({
    supabaseUrl,
    serviceRoleKey,
    email,
    password,
  });
}

async function activateTradeAccount(
  db: Db,
  userId: string,
): Promise<{ id: string; publicId: string }> {
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
  const row = await db
    .selectFrom('app.trading_accounts')
    .select('public_id')
    .where('id', '=', account.id)
    .executeTakeFirstOrThrow();
  return { id: account.id, publicId: row.public_id };
}

/**
 * One fresh user + one active WARIBA ONE account. The Playwright fixture
 * owns teardown so both failed and successful runs remove synthetic data.
 */
export async function seedTradeAccount(env: {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}): Promise<TradeAccountFixture> {
  const db = createDbClient(env.databaseUrl);
  const email = `e2e-trade-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`;
  const password = randomUUID();
  const userId = await createTestUser(env.supabaseUrl, env.supabaseServiceRoleKey, email, password);
  const account = await activateTradeAccount(db, userId);
  await db.destroy();

  return {
    userId,
    email,
    password,
    accountId: account.id,
    accountPublicId: account.publicId,
  };
}
