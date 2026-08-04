import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activateEvaluationAccount, createDbClient, evaluateAndApplyAccountRisk, type Db } from '@wariba/database';
import {
  buildAccountHubView,
  buildAccountMissionView,
  buildAccountRiskView,
  buildRecentActivityView,
  listAccountsForUser,
  UnsupportedProgramError,
} from '../src/index';

/**
 * Real integration tests against the live hosted database — not mocked.
 * Requires DATABASE_URL (via .env.local, gitignored). Skips gracefully if
 * absent, mirroring packages/database's risk.integration.test.ts, whose
 * direct-activation fixture pattern this file reuses.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('Hub read models — real database', () => {
  let db: Db;
  const cleanupAccountIds: string[] = [];
  const cleanupUserIds: string[] = [];

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

  const createActiveAccount = async (
    label: string,
  ): Promise<{ userId: string; accountId: string }> => {
    const userId = await createTestUser(
      `hub-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
    );
    cleanupUserIds.push(userId);

    const productVersion = await db
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select([
        'app.product_versions.id',
        'app.products.nominal_balance',
        'app.products.nominal_currency',
      ])
      .where('app.products.code', '=', '5K')
      .executeTakeFirstOrThrow();

    const order = await db
      .insertInto('app.purchase_orders')
      .values({
        user_id: userId,
        product_version_id: productVersion.id,
        idempotency_key: randomUUID(),
        status: 'paid',
        total_amount: '22500.00',
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
    return { userId, accountId: account.id };
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  afterAll(async () => {
    for (const id of cleanupAccountIds) {
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
    for (const userId of cleanupUserIds) {
      await db.deleteFrom('app.user_consents').where('user_id', '=', userId).execute();
      await deleteTestUser(userId);
    }
    await db.destroy();
  }, 30000);

  describe('listAccountsForUser', () => {
    it('returns only accounts belonging to the requesting user (multi-account isolation)', async () => {
      const a = await createActiveAccount('iso-a');
      const b = await createActiveAccount('iso-b');

      const forA = await listAccountsForUser(db, { userId: a.userId });
      expect(forA.map((account) => account.id)).toEqual([a.accountId]);

      const forB = await listAccountsForUser(db, { userId: b.userId });
      expect(forB.map((account) => account.id)).toEqual([b.accountId]);
    }, 20000);
  });

  describe('a fresh account with no trades yet', () => {
    let accountId: string;

    beforeAll(async () => {
      ({ accountId } = await createActiveAccount('fresh'));
    }, 15000);

    it('hub view: active state, balance equal to nominal, zero PnL today', async () => {
      const view = await buildAccountHubView(db, { accountId, now: new Date() });
      expect(view.state).toBe('active');
      expect(view.readOnly).toBe(false);
      expect(view.balanceFormatted).toBe('5 000 USD');
      expect(view.pnlTodayFormatted).toBe('0 USD');
    });

    it('mission view: target not yet reached, no consistency figure until a positive day exists', async () => {
      const view = await buildAccountMissionView(db, { accountId, now: new Date() });
      if (!view.available) throw new Error('expected an available Evaluation mission view');
      expect(view.state).toBe('active');
      const target = view.conditions.find((condition) => condition.label === 'Objectif de profit');
      expect(target?.met).toBe(false);
      const noOpenPositions = view.conditions.find(
        (condition) => condition.label === 'Aucune position ouverte',
      );
      expect(noOpenPositions?.met).toBe(true);
      expect(view.consistency).toBeNull();
    });

    it('risk view: normal status, no violations', async () => {
      const view = await buildAccountRiskView(db, { accountId, now: new Date() });
      expect(view.status).toBe('normal');
      expect(view.violations).toHaveLength(0);
    });

    it('activity view: nothing but (at most) the activation transition — no violations or fills', async () => {
      const view = await buildRecentActivityView(db, { accountId });
      expect(view.every((item) => item.kind === 'state_transition')).toBe(true);
    });
  });

  describe('an account pushed past the Daily Loss Limit', () => {
    let accountId: string;

    beforeAll(async () => {
      ({ accountId } = await createActiveAccount('softlock'));
      // 5K nominal, 3% DLL rate -> floor budget is 150 USD; -160 crosses it.
      await db
        .insertInto('app.trading_ledger_entries')
        .values({ account_id: accountId, entry_type: 'realized_pnl', amount: '-160.00' })
        .execute();
      await evaluateAndApplyAccountRisk(db, {
        accountId,
        now: new Date(),
        marketBySymbol: {},
        triggerEventType: 'manual_review',
      });
    }, 15000);

    it('hub view reflects the soft-locked state with the official label', async () => {
      const view = await buildAccountHubView(db, { accountId, now: new Date() });
      expect(view.state).toBe('soft_locked');
      expect(view.statusLabel).toBe('Blocage temporaire');
    });

    it('risk view exposes exactly one soft-lock violation, pre-formatted for EvidencePanel', async () => {
      const view = await buildAccountRiskView(db, { accountId, now: new Date() });
      expect(view.status).toBe('soft-lock');
      expect(view.violations).toHaveLength(1);
      expect(view.violations[0]?.ruleCode).toBe('RISK_DAILY_LOSS_LOCK');
      expect(view.violations[0]?.ruleLabel).toBe('Limite de perte quotidienne');
      expect(view.violations[0]?.thresholdFormatted).toMatch(/USD$/);
    });

    it('activity view surfaces both the status transition and the violation evidence', async () => {
      const view = await buildRecentActivityView(db, { accountId });
      expect(view.some((item) => item.kind === 'state_transition')).toBe(true);
      expect(view.some((item) => item.kind === 'risk_violation')).toBe(true);
    });

    it('surfaces before an unaffected account in listAccountsForUser (attention-first sort)', async () => {
      const { userId, accountId: secondAccountId } = await createActiveAccount('softlock-sibling');
      // Move the soft-locked account under the same user so both compete for
      // sort order — cheaper than a second full activation.
      await db
        .updateTable('app.trading_accounts')
        .set({ user_id: userId })
        .where('id', '=', accountId)
        .execute();

      const accounts = await listAccountsForUser(db, { userId });
      expect(accounts.map((account) => account.id)).toEqual([accountId, secondAccountId]);
    }, 15000);
  });

  describe('a WARIBA_PERFORMANCE account (no published policy yet)', () => {
    let accountId: string;
    let placeholderPolicyId: string;

    beforeAll(async () => {
      const policy = await db
        .insertInto('app.policy_versions')
        .values({
          program: 'WARIBA_PERFORMANCE',
          semantic_version: `0.0.0-test-${randomUUID().slice(0, 8)}`,
          status: 'draft',
          parameters_json: {},
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      placeholderPolicyId = policy.id;

      ({ accountId } = await createActiveAccount('performance'));
      await db
        .updateTable('app.trading_accounts')
        .set({ program_type: 'WARIBA_PERFORMANCE', policy_version_id: placeholderPolicyId })
        .where('id', '=', accountId)
        .execute();
    }, 15000);

    afterAll(async () => {
      // Delete the account itself here (ahead of the shared outer cleanup)
      // so the placeholder policy's FK has nothing referencing it left —
      // then drop it from cleanupAccountIds so the outer afterAll doesn't
      // try to process an already-deleted row.
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', accountId).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', accountId).execute();
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
      await db.deleteFrom('app.policy_versions').where('id', '=', placeholderPolicyId).execute();

      const index = cleanupAccountIds.indexOf(accountId);
      if (index >= 0) cleanupAccountIds.splice(index, 1);
    }, 15000);

    it('mission view returns an honest "unavailable" result instead of inventing data', async () => {
      const view = await buildAccountMissionView(db, { accountId, now: new Date() });
      expect(view.available).toBe(false);
    });

    it('risk view throws a typed, catchable error rather than crashing opaquely', async () => {
      await expect(
        buildAccountRiskView(db, { accountId, now: new Date() }),
      ).rejects.toBeInstanceOf(UnsupportedProgramError);
    });
  });
});
