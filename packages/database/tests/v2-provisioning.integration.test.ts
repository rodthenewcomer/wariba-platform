import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import {
  activateV2PerformanceFromOrderInTransaction,
  createFlexActivationObligationInTransaction,
} from '../src/v2-provisioning';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

interface ReadyPolicy {
  id: string;
  machineHash: string;
  humanDocumentHash: string | null;
}

interface OfferFixture {
  productVersionId: string;
  nominalBalance: string;
  nominalCurrency: string;
  upfrontPrice: string;
  activationPrice: string;
  totalPrice: string;
  priceCurrency: string;
}

const ROLLBACK = new Error('V2 lifecycle fixture rollback');

async function withRollback(db: Db, run: (trx: Db) => Promise<void>): Promise<void> {
  try {
    await db.transaction().execute(async (trx) => {
      await run(trx);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }
}

async function installReadyPolicy(
  trx: Db,
  productFamily: 'WARIBA_FLEX' | 'WARIBA_INSTANT',
  accountPhase: 'evaluation' | 'performance',
  now: Date,
): Promise<ReadyPolicy> {
  const source = await trx
    .selectFrom('app.policy_versions')
    .select(['program', 'parameters_json', 'machine_hash', 'human_document_hash'])
    .where('product_family', '=', productFamily)
    .where('account_phase', '=', accountPhase)
    .where('status', '=', 'pilot_ready')
    .executeTakeFirstOrThrow();
  if (source.machine_hash === null) throw new Error('Seeded V2 policy has no machine hash.');

  const suffix = randomUUID();
  const margin = await trx
    .insertInto('app.margin_profiles')
    .values({
      profile_code: `TEST-${productFamily}-${accountPhase}-${suffix}`,
      product_family: productFamily,
      account_phase: accountPhase,
      candidate_margin_cap_rate: accountPhase === 'evaluation' ? '0.20' : '0.15',
      leverage_by_asset_group: { FX: 30, METALS: 15, INDICES: 10, ENERGY: 10 },
      calibration_status: 'validated',
      decision_record_id: 'TEST-PHASE-3-4-2',
      validated_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  const session = await trx
    .insertInto('app.session_calendar_versions')
    .values({
      version_code: `TEST-SESSION-${suffix}`,
      provider: 'deterministic-test',
      status: 'ready',
      source_ready: true,
      published_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  const news =
    accountPhase === 'performance'
      ? await trx
          .insertInto('app.news_calendar_versions')
          .values({
            version_code: `TEST-NEWS-${suffix}`,
            provider: 'deterministic-test',
            status: 'ready',
            source_ready: true,
            published_at: now,
          })
          .returning('id')
          .executeTakeFirstOrThrow()
      : undefined;

  const policy = await trx
    .insertInto('app.policy_versions')
    .values({
      program: source.program,
      product_family: productFamily,
      account_phase: accountPhase,
      semantic_version: `2.0.0-test-${suffix}`,
      status: 'published',
      parameters_json: source.parameters_json,
      human_document_hash: source.human_document_hash,
      machine_hash: source.machine_hash,
      effective_from: now,
      published_at: now,
      decision_record_id: 'TEST-PHASE-3-4-2',
      news_calendar_version_id: news?.id ?? null,
      session_calendar_version_id: session.id,
      margin_profile_id: margin.id,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return {
    id: policy.id,
    machineHash: source.machine_hash,
    humanDocumentHash: source.human_document_hash,
  };
}

async function loadOffer(
  trx: Db,
  productFamily: 'WARIBA_FLEX' | 'WARIBA_INSTANT',
): Promise<OfferFixture> {
  const offer = await trx
    .selectFrom('app.product_versions as version')
    .innerJoin('app.products as product', 'product.id', 'version.product_id')
    .select([
      'version.id as productVersionId',
      'product.nominal_balance as nominalBalance',
      'product.nominal_currency as nominalCurrency',
      'version.price_amount as upfrontPrice',
      'version.activation_price_amount as activationPrice',
      'version.total_price_if_success as totalPrice',
      'version.price_currency as priceCurrency',
    ])
    .where('product.product_family', '=', productFamily)
    .where('product.code', '=', '10K')
    .where('version.catalogue_version', '=', 'v2.0.0-candidate')
    .executeTakeFirstOrThrow();
  return offer;
}

describeIfDb('V2 provisioning foundation — real database', () => {
  let db: Db;
  let userId: string;

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
        email: `v2-provisioning-${Date.now()}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    if (!response.ok) throw new Error(`Could not create V2 test user: ${response.status}.`);
    userId = ((await response.json()) as { id: string }).id;
  }, 30_000);

  afterAll(async () => {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    await db.destroy();
  }, 30_000);

  it('provisions INSTANT directly into exactly one Performance account with no fake Evaluation', async () => {
    await withRollback(db, async (trx) => {
      const now = new Date('2026-08-27T12:00:00.000Z');
      const policy = await installReadyPolicy(trx, 'WARIBA_INSTANT', 'performance', now);
      const offer = await loadOffer(trx, 'WARIBA_INSTANT');
      const order = await trx
        .insertInto('app.purchase_orders')
        .values({
          user_id: userId,
          product_version_id: offer.productVersionId,
          policy_version_id: policy.id,
          policy_machine_hash: policy.machineHash,
          policy_human_document_hash: policy.humanDocumentHash,
          product_family: 'WARIBA_INSTANT',
          idempotency_key: randomUUID(),
          status: 'paid',
          total_amount: offer.upfrontPrice,
          total_currency: offer.priceCurrency,
          upfront_price_snapshot: offer.upfrontPrice,
          activation_price_snapshot: offer.activationPrice,
          total_price_if_success_snapshot: offer.totalPrice,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const first = await activateV2PerformanceFromOrderInTransaction(trx, {
        purchaseOrderId: order.id,
        now,
      });
      const retry = await activateV2PerformanceFromOrderInTransaction(trx, {
        purchaseOrderId: order.id,
        now,
      });
      const accounts = await trx
        .selectFrom('app.trading_accounts')
        .select(['id', 'program_type', 'product_family', 'policy_version_id'])
        .where('source_purchase_order_id', '=', order.id)
        .execute();

      expect(first.alreadyExisted).toBe(false);
      expect(retry).toMatchObject({ id: first.id, alreadyExisted: true });
      expect(accounts).toEqual([
        {
          id: first.id,
          program_type: 'WARIBA_PERFORMANCE',
          product_family: 'WARIBA_INSTANT',
          policy_version_id: policy.id,
        },
      ]);
    });
  }, 30_000);

  it('freezes FLEX activation price and provisions one Performance child after payment', async () => {
    await withRollback(db, async (trx) => {
      const now = new Date('2026-08-27T12:00:00.000Z');
      const evaluationPolicy = await installReadyPolicy(trx, 'WARIBA_FLEX', 'evaluation', now);
      const performancePolicy = await installReadyPolicy(trx, 'WARIBA_FLEX', 'performance', now);
      await trx
        .insertInto('app.policy_performance_links')
        .values({
          evaluation_policy_version_id: evaluationPolicy.id,
          performance_policy_version_id: performancePolicy.id,
          decision_record_id: 'TEST-PHASE-3-4-2',
        })
        .execute();
      const offer = await loadOffer(trx, 'WARIBA_FLEX');
      const order = await trx
        .insertInto('app.purchase_orders')
        .values({
          user_id: userId,
          product_version_id: offer.productVersionId,
          policy_version_id: evaluationPolicy.id,
          policy_machine_hash: evaluationPolicy.machineHash,
          policy_human_document_hash: evaluationPolicy.humanDocumentHash,
          product_family: 'WARIBA_FLEX',
          idempotency_key: randomUUID(),
          status: 'fulfilled',
          total_amount: offer.upfrontPrice,
          total_currency: offer.priceCurrency,
          upfront_price_snapshot: offer.upfrontPrice,
          activation_price_snapshot: offer.activationPrice,
          total_price_if_success_snapshot: offer.totalPrice,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      const symbolSpec = await trx
        .selectFrom('app.symbol_spec_sets')
        .select('id')
        .where('status', '=', 'sandbox_candidate')
        .orderBy('published_at', 'desc')
        .executeTakeFirstOrThrow();
      const evaluation = await trx
        .insertInto('app.trading_accounts')
        .values({
          public_id: `FLEX-TEST-${randomUUID()}`,
          user_id: userId,
          source_purchase_order_id: order.id,
          program_type: 'WARIBA_FLEX',
          product_family: 'WARIBA_FLEX',
          nominal_balance: offer.nominalBalance,
          currency: offer.nominalCurrency,
          status: 'passed',
          policy_version_id: evaluationPolicy.id,
          symbol_spec_set_id: symbolSpec.id,
          activated_at: now,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const due = await createFlexActivationObligationInTransaction(trx, {
        evaluationAccountId: evaluation.id,
        now,
      });
      const retryDue = await createFlexActivationObligationInTransaction(trx, {
        evaluationAccountId: evaluation.id,
        now,
      });
      expect(retryDue).toMatchObject({
        obligationId: due.obligationId,
        activationOrderId: due.activationOrderId,
        alreadyExisted: true,
      });
      const activationOrder = await trx
        .selectFrom('app.purchase_orders')
        .select(['activation_price_snapshot', 'total_amount', 'activation_due_at'])
        .where('id', '=', due.activationOrderId)
        .executeTakeFirstOrThrow();
      expect(activationOrder.activation_price_snapshot).toBe(offer.activationPrice);
      expect(activationOrder.total_amount).toBe(offer.activationPrice);
      expect(activationOrder.activation_due_at?.toISOString()).toBe('2026-09-26T12:00:00.000Z');

      await trx
        .updateTable('app.purchase_orders')
        .set({ status: 'paid', updated_at: now })
        .where('id', '=', due.activationOrderId)
        .execute();
      const first = await activateV2PerformanceFromOrderInTransaction(trx, {
        purchaseOrderId: due.activationOrderId,
        now,
      });
      const retry = await activateV2PerformanceFromOrderInTransaction(trx, {
        purchaseOrderId: due.activationOrderId,
        now,
      });
      const children = await trx
        .selectFrom('app.trading_accounts')
        .select(['id', 'program_type', 'product_family', 'policy_version_id'])
        .where('source_evaluation_account_id', '=', evaluation.id)
        .execute();
      const obligation = await trx
        .selectFrom('app.flex_activation_obligations')
        .select(['status', 'amount_snapshot'])
        .where('id', '=', due.obligationId)
        .executeTakeFirstOrThrow();

      expect(first.alreadyExisted).toBe(false);
      expect(retry).toMatchObject({ id: first.id, alreadyExisted: true });
      expect(children).toEqual([
        {
          id: first.id,
          program_type: 'WARIBA_PERFORMANCE',
          product_family: 'WARIBA_FLEX',
          policy_version_id: performancePolicy.id,
        },
      ]);
      expect(obligation).toEqual({ status: 'fulfilled', amount_snapshot: offer.activationPrice });
    });
  }, 30_000);

  it('expires late FLEX activation without erasing the acquired Evaluation pass', async () => {
    await withRollback(db, async (trx) => {
      const now = new Date('2026-08-27T12:00:00.000Z');
      const evaluationPolicy = await installReadyPolicy(trx, 'WARIBA_FLEX', 'evaluation', now);
      const performancePolicy = await installReadyPolicy(trx, 'WARIBA_FLEX', 'performance', now);
      await trx
        .insertInto('app.policy_performance_links')
        .values({
          evaluation_policy_version_id: evaluationPolicy.id,
          performance_policy_version_id: performancePolicy.id,
          decision_record_id: 'TEST-PHASE-3-4-2',
        })
        .execute();
      const offer = await loadOffer(trx, 'WARIBA_FLEX');
      const order = await trx
        .insertInto('app.purchase_orders')
        .values({
          user_id: userId,
          product_version_id: offer.productVersionId,
          policy_version_id: evaluationPolicy.id,
          policy_machine_hash: evaluationPolicy.machineHash,
          policy_human_document_hash: evaluationPolicy.humanDocumentHash,
          product_family: 'WARIBA_FLEX',
          idempotency_key: randomUUID(),
          status: 'fulfilled',
          total_amount: offer.upfrontPrice,
          total_currency: offer.priceCurrency,
          upfront_price_snapshot: offer.upfrontPrice,
          activation_price_snapshot: offer.activationPrice,
          total_price_if_success_snapshot: offer.totalPrice,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      const symbolSpec = await trx
        .selectFrom('app.symbol_spec_sets')
        .select('id')
        .where('status', '=', 'sandbox_candidate')
        .orderBy('published_at', 'desc')
        .executeTakeFirstOrThrow();
      const evaluation = await trx
        .insertInto('app.trading_accounts')
        .values({
          public_id: `FLEX-EXPIRED-${randomUUID()}`,
          user_id: userId,
          source_purchase_order_id: order.id,
          program_type: 'WARIBA_FLEX',
          product_family: 'WARIBA_FLEX',
          nominal_balance: offer.nominalBalance,
          currency: offer.nominalCurrency,
          status: 'passed',
          policy_version_id: evaluationPolicy.id,
          symbol_spec_set_id: symbolSpec.id,
          activated_at: now,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      const due = await createFlexActivationObligationInTransaction(trx, {
        evaluationAccountId: evaluation.id,
        now,
      });
      await trx
        .updateTable('app.purchase_orders')
        .set({ status: 'paid', updated_at: now })
        .where('id', '=', due.activationOrderId)
        .execute();

      await expect(
        activateV2PerformanceFromOrderInTransaction(trx, {
          purchaseOrderId: due.activationOrderId,
          now: new Date('2026-09-26T12:00:00.001Z'),
        }),
      ).rejects.toThrow('FLEX activation window expired');
      const obligation = await trx
        .selectFrom('app.flex_activation_obligations')
        .select('status')
        .where('id', '=', due.obligationId)
        .executeTakeFirstOrThrow();
      const preserved = await trx
        .selectFrom('app.trading_accounts')
        .select('status')
        .where('id', '=', evaluation.id)
        .executeTakeFirstOrThrow();
      const children = await trx
        .selectFrom('app.trading_accounts')
        .select('id')
        .where('source_evaluation_account_id', '=', evaluation.id)
        .execute();

      expect(obligation.status).toBe('expired');
      expect(preserved.status).toBe('passed');
      expect(children).toHaveLength(0);
    });
  }, 30_000);
});
