import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  activateEvaluationAccount,
  createDbClient,
  evaluateAndApplyAccountRisk,
  type Db,
} from '@wariba/database';
import {
  buildAccountHubView,
  buildAccountMissionView,
  buildAccountRiskView,
  buildOpenPositionsView,
  buildRecentActivityView,
  listAccountsForUser,
} from '../src/index';

/**
 * Real integration tests against the isolated local database — not mocked.
 * Requires DATABASE_URL (via test environment). Skips gracefully if
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

    it('hub view: exposes a balance history point for today and a real activation date', async () => {
      const view = await buildAccountHubView(db, { accountId, now: new Date() });
      expect(view.balanceHistory.length).toBeGreaterThan(0);
      expect(view.balanceHistory[view.balanceHistory.length - 1]?.balance).toBe(5000);
      expect(view.activatedAtLabel).toMatch(/\d{4}/);
    });

    it('open positions view: empty for an account with no positions', async () => {
      const positions = await buildOpenPositionsView(db, { accountId });
      expect(positions).toHaveLength(0);
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

  describe('an account with one open position', () => {
    let accountId: string;

    beforeAll(async () => {
      ({ accountId } = await createActiveAccount('open-position'));
      await db
        .insertInto('app.positions')
        .values({
          account_id: accountId,
          symbol: 'EURUSD',
          side: 'buy',
          opening_quantity: '0.10',
          open_quantity: '0.10',
          average_open_price: '1.08450',
          account_sequence: '1',
        })
        .execute();
    }, 15000);

    it('open positions view: lists the position with no live price or PnL field', async () => {
      const positions = await buildOpenPositionsView(db, { accountId });
      expect(positions).toHaveLength(1);
      expect(positions[0]?.symbol).toBe('EURUSD');
      expect(positions[0]?.sideLabel).toBe('Achat');
      expect(positions[0]?.quantityFormatted).toBe('0.10');
      // Postgres numeric columns return their full declared scale — compare
      // the price numerically rather than assuming an exact trailing-zero count.
      expect(Number.parseFloat(positions[0]?.entryPriceFormatted ?? '')).toBe(1.0845);
      expect(Object.keys(positions[0] ?? {})).not.toContain('pnl');
    });

    it('mission view: "no open positions" condition is now unmet', async () => {
      const view = await buildAccountMissionView(db, { accountId, now: new Date() });
      if (!view.available) throw new Error('expected an available Evaluation mission view');
      const noOpenPositions = view.conditions.find(
        (condition) => condition.label === 'Aucune position ouverte',
      );
      expect(noOpenPositions?.met).toBe(false);
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

  describe('a WARIBA_PERFORMANCE account with its published policy', () => {
    let accountId: string;

    beforeAll(async () => {
      const policy = await db
        .selectFrom('app.policy_versions')
        .select('id')
        .where('program', '=', 'WARIBA_PERFORMANCE')
        .where('status', '=', 'published')
        .orderBy('created_at', 'desc')
        .limit(1)
        .executeTakeFirstOrThrow();

      ({ accountId } = await createActiveAccount('performance'));
      await db
        .updateTable('app.trading_accounts')
        .set({ program_type: 'WARIBA_PERFORMANCE', policy_version_id: policy.id })
        .where('id', '=', accountId)
        .execute();
    }, 15000);

    it('builds the shared Hub state from Performance risk parameters', async () => {
      const view = await buildAccountHubView(db, { accountId, now: new Date() });
      expect(view.state).toBe('active');
      expect(view.balanceFormatted).toBe('5 000 USD');
    });

    it('builds the shared risk ribbon from the published Performance policy', async () => {
      const view = await buildAccountRiskView(db, { accountId, now: new Date() });
      expect(view.status).toBe('normal');
      expect(view.dailyLossRemainingFormatted).toBe('150 USD');
    });
  });
});
