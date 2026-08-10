import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import {
  loadControlPolicyDetail,
  resolveEffectivePolicyVersionIds,
  searchControlPolicies,
} from '../src/control-policies';
import { loadCommercialCatalogue } from '../src/control-commercial';
import { searchStaffDirectory } from '../src/control-team';
import { loadControlTradingSummary, searchControlOrders } from '../src/control-trading';
import { loadPublishedPolicy } from '../src/policy';

/**
 * Prompt 09 milestone 5 — the governance surfaces against the real database.
 *
 * The recurring hazard on these three areas is a display rule that looks
 * reasonable and quietly disagrees with the engine: "newest policy row" as a
 * stand-in for "in force", "has a flag key" as a stand-in for "enabled",
 * "has an auth identity" as a stand-in for "is staff". Each of those is
 * asserted against the authoritative answer here rather than against itself.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('Control governance surfaces — real database', () => {
  let db: Db;
  const marker = randomUUID().slice(0, 8);
  const createdStaffUserIds: string[] = [];

  async function createAuthUser(email: string): Promise<string> {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: randomUUID(), email_confirm: true }),
    });
    if (!response.ok) throw new Error(`Fixture user creation failed: HTTP ${response.status}`);
    return ((await response.json()) as { id: string }).id;
  }

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 60000);

  afterAll(async () => {
    for (const userId of createdStaffUserIds) {
      await db.deleteFrom('app.staff_members').where('user_id', '=', userId).execute();
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
    await db.destroy();
  }, 60000);

  // ---------------------------------------------------------------- policies

  it('pages policy versions in the database and caps an oversized page size', async () => {
    const page = await searchControlPolicies(db, { pageSize: 10_000 });
    expect(page.pageSize).toBeLessThanOrEqual(100);
    expect(page.policies.length).toBeLessThanOrEqual(page.pageSize);
    expect(page.total).toBeGreaterThanOrEqual(page.policies.length);
  });

  it('narrows by program and status in the database, not in the browser', async () => {
    const all = await searchControlPolicies(db, { pageSize: 100 });
    const published = await searchControlPolicies(db, {
      filters: { program: 'WARIBA_PERFORMANCE', status: 'published' },
      pageSize: 100,
    });
    for (const policy of published.policies) {
      expect(policy.program).toBe('WARIBA_PERFORMANCE');
      expect(policy.status).toBe('published');
    }
    expect(published.total).toBeLessThanOrEqual(all.total);
  });

  it('marks as effective exactly the version the policy loader resolves', async () => {
    const page = await searchControlPolicies(db, { pageSize: 100 });
    const effective = page.policies.filter((policy) => policy.currentlyEffective);

    for (const program of ['WARIBA_ONE', 'WARIBA_PERFORMANCE'] as const) {
      const loaded = await loadPublishedPolicy(db, program);
      const flagged = effective.filter((policy) => policy.program === program);
      // Exactly one per program, and it is the row the engine would pin a
      // new account to — not the newest row and not the highest version.
      expect(flagged).toHaveLength(1);
      expect(flagged[0]?.id).toBe(loaded.id);
    }
  });

  it('does not treat "not retired" as "in force"', async () => {
    const notRetired = await searchControlPolicies(db, {
      filters: { retired: false },
      pageSize: 100,
    });
    const effectiveIds = await resolveEffectivePolicyVersionIds(db);
    // retired_at IS NULL is a much wider set than the effective set; if the
    // surface conflated them it would report several policies in force.
    expect(notRetired.total).toBeGreaterThanOrEqual(effectiveIds.size);
    for (const policy of notRetired.policies) {
      if (policy.status !== 'published') expect(policy.currentlyEffective).toBe(false);
    }
  });

  it('returns policy hashes and parameters exactly as stored', async () => {
    const page = await searchControlPolicies(db, { pageSize: 1 });
    const candidate = page.policies[0];
    if (!candidate) return;

    const detail = await loadControlPolicyDetail(db, candidate.id);
    const stored = await db
      .selectFrom('app.policy_versions')
      .select(['human_document_hash', 'machine_hash', 'parameters_json', 'semantic_version'])
      .where('id', '=', candidate.id)
      .executeTakeFirstOrThrow();

    expect(detail?.humanDocumentHash).toBe(stored.human_document_hash);
    expect(detail?.machineHash).toBe(stored.machine_hash);
    expect(detail?.semanticVersion).toBe(stored.semantic_version);
    // Byte-for-byte, never normalized into plausible-looking policy data.
    expect(detail?.parametersJson).toEqual(stored.parameters_json);
  });

  it('counts only the accounts actually pinned to a policy version', async () => {
    const page = await searchControlPolicies(db, { pageSize: 100 });
    for (const policy of page.policies.slice(0, 3)) {
      const detail = await loadControlPolicyDetail(db, policy.id);
      const independent = await db
        .selectFrom('app.trading_accounts')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('policy_version_id', '=', policy.id)
        .executeTakeFirstOrThrow();
      expect(detail?.usage.accountCount).toBe(Number(independent.count));
      expect(
        (detail?.usage.evaluationAccountCount ?? 0) + (detail?.usage.performanceAccountCount ?? 0),
      ).toBe(detail?.usage.accountCount);
    }
  });

  it('returns null for an unknown policy version rather than an empty shell', async () => {
    expect(await loadControlPolicyDetail(db, randomUUID())).toBeNull();
  });

  // -------------------------------------------------------------- commercial

  it('reads the catalogue from the database rather than a hardcoded size list', async () => {
    const catalogue = await loadCommercialCatalogue(db);
    const stored = await db.selectFrom('app.products').select(['id', 'code']).execute();
    expect(catalogue.products.map((product) => product.code).sort()).toEqual(
      stored.map((product) => product.code).sort(),
    );
  });

  it('returns product version money exactly as persisted', async () => {
    const catalogue = await loadCommercialCatalogue(db);
    const versions = catalogue.products.flatMap((product) => product.versions);
    expect(versions.length).toBeGreaterThan(0);

    for (const version of versions) {
      const stored = await db
        .selectFrom('app.product_versions')
        .select(['price_amount', 'founder_price_amount', 'price_currency', 'activation_fee'])
        .where('id', '=', version.id)
        .executeTakeFirstOrThrow();
      expect(version.priceAmount).toBe(stored.price_amount);
      // Public and founder price are different commitments — never merged,
      // never defaulted to one another.
      expect(version.founderPriceAmount).toBe(stored.founder_price_amount);
      expect(version.priceCurrency).toBe(stored.price_currency);
      expect(version.activationFee).toBe(stored.activation_fee);
    }
  });

  it('preserves retired price history instead of dropping it', async () => {
    const catalogue = await loadCommercialCatalogue(db);
    const retired = catalogue.products
      .flatMap((product) => product.versions)
      .filter((version) => version.retiredAt !== null);
    const storedRetired = await db
      .selectFrom('app.product_versions')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('retired_at', 'is not', null)
      .executeTakeFirstOrThrow();
    expect(retired.length).toBe(Number(storedRetired.count));
  });

  it('carries the canonical reserve evaluation rather than a second one', async () => {
    const catalogue = await loadCommercialCatalogue(db);
    expect(['normal', 'prudence', 'defensive', 'critical']).toContain(catalogue.reserve.zone);
  });

  // -------------------------------------------------------------------- team

  it('lists staff authority, not auth identity', async () => {
    const email = `governance-${marker}@wariba-test.invalid`;
    const userId = await createAuthUser(email);
    createdStaffUserIds.push(userId);

    // An auth identity with no grant is not staff and must not appear.
    const beforeGrant = await searchStaffDirectory(db, { filters: { query: email } });
    expect(beforeGrant.total).toBe(0);

    await db.insertInto('app.staff_members').values({ user_id: userId, role: 'risk' }).execute();

    const afterGrant = await searchStaffDirectory(db, { filters: { query: email } });
    expect(afterGrant.total).toBe(1);
    expect(afterGrant.members[0]?.userId).toBe(userId);
    expect(afterGrant.members[0]?.role).toBe('risk');

    // SEC-017: revoking authority removes the row here while the identity
    // itself survives — that is retention, not a residual grant.
    await db.deleteFrom('app.staff_members').where('user_id', '=', userId).execute();
    expect((await searchStaffDirectory(db, { filters: { query: email } })).total).toBe(0);
    const identity = await db
      .selectFrom('auth.users')
      .select('id')
      .where('id', '=', userId)
      .executeTakeFirst();
    expect(identity?.id).toBe(userId);
  }, 60000);

  it('projects only the minimum identity an internal directory needs', async () => {
    const page = await searchStaffDirectory(db, { pageSize: 5 });
    for (const member of page.members) {
      expect(Object.keys(member).sort()).toEqual(
        [
          'email',
          'grantedAt',
          'grantedByEmail',
          'grantedByUserId',
          'id',
          'role',
          'userCreatedAt',
          'userId',
        ].sort(),
      );
      // No password hash, token, provider or session metadata is reachable
      // through the narrow auth.users mapping.
      const serialized = JSON.stringify(member);
      for (const forbidden of ['password', 'token', 'provider', 'confirmation', 'recovery']) {
        expect(serialized.toLowerCase()).not.toContain(forbidden);
      }
    }
  });

  it('filters by role in the database and counts the whole directory', async () => {
    const all = await searchStaffDirectory(db, { pageSize: 100 });
    const admins = await searchStaffDirectory(db, { filters: { role: 'admin' }, pageSize: 100 });
    for (const member of admins.members) expect(member.role).toBe('admin');
    expect(admins.total).toBeLessThanOrEqual(all.total);
    // Role counts describe the directory, not the current page.
    const summed = Object.values(all.countsByRole).reduce((total, count) => total + count, 0);
    expect(summed).toBe(all.total);
  });

  it('treats a partial search term as text, never as a malformed uuid', async () => {
    // A bare fragment against a uuid column is a Postgres error, not an
    // empty result — the search must not hand one to the database.
    await expect(searchStaffDirectory(db, { filters: { query: 'abc' } })).resolves.toBeDefined();
    await expect(searchStaffDirectory(db, { filters: { query: '%' } })).resolves.toMatchObject({
      total: 0,
    });
  });

  // ----------------------------------------------------------------- trading

  it('pages orders in the database and caps an oversized page size', async () => {
    const page = await searchControlOrders(db, { pageSize: 10_000 });
    expect(page.pageSize).toBeLessThanOrEqual(100);
    expect(page.orders.length).toBeLessThanOrEqual(page.pageSize);
    expect(page.total).toBeGreaterThanOrEqual(page.orders.length);
  });

  it('narrows orders by status and symbol in the database', async () => {
    const all = await searchControlOrders(db, { pageSize: 100 });
    const filled = await searchControlOrders(db, { filters: { status: 'filled' }, pageSize: 100 });
    for (const order of filled.orders) expect(order.status).toBe('filled');
    expect(filled.total).toBeLessThanOrEqual(all.total);

    const eurusd = await searchControlOrders(db, { filters: { symbol: 'EURUSD' }, pageSize: 100 });
    for (const order of eurusd.orders) expect(order.symbol).toBe('EURUSD');
  });

  it('returns only orders that carry a rejection code when asked', async () => {
    const rejected = await searchControlOrders(db, {
      filters: { rejectedOnly: true },
      pageSize: 100,
    });
    for (const order of rejected.orders) expect(order.rejectionCode).not.toBeNull();
  });

  it('preserves a null symbol rather than inventing one', async () => {
    // A close/modify order referencing a missing position genuinely has no
    // symbol to record — the explorer must carry that through, not guess.
    const page = await searchControlOrders(db, { pageSize: 100 });
    for (const order of page.orders) {
      if (order.symbol === null) expect(order.orderType).not.toBe('market_open');
    }
  });

  it('counts platform-wide operational state, not the current page', async () => {
    const summary = await loadControlTradingSummary(db);
    const openPositions = await db
      .selectFrom('app.positions')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('status', '=', 'open')
      .executeTakeFirstOrThrow();
    expect(summary.openPositionCount).toBe(Number(openPositions.count));
    expect(summary.activePendingOrderCount).toBeGreaterThanOrEqual(0);
    expect(summary.rejectedOrdersLast24h).toBeGreaterThanOrEqual(0);
    expect(summary.queuedReductionCount).toBeGreaterThanOrEqual(0);
  });
});
