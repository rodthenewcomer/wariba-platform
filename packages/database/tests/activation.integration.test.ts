import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { loadPolicyById } from '../src/policy';
import { recordPaymentEvent } from '../src/payment-events';

/**
 * Real integration tests against the live hosted database — not mocked.
 * Requires DATABASE_URL in the environment (via .env.local, gitignored).
 * Skips gracefully if it's absent (e.g. a CI environment that hasn't been
 * given hosted DB access) rather than failing the whole suite.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('activateEvaluationAccount — real database', () => {
  let db: Db;
  let userId: string;
  let purchaseOrderId: string;

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

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userId = await createTestUser(`activation-test-${Date.now()}@wariba-test.invalid`);

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
        total_amount: '27900.00',
        total_currency: 'XOF',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    purchaseOrderId = order.id;
  }, 30000);

  afterAll(async () => {
    // Cascades: trading_accounts -> account_state_transitions/trading_ledger_entries
    // have no ON DELETE CASCADE by design (ledger is append-only evidence), so
    // clean up explicitly in dependency order rather than relying on cascade.
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('id')
      .where('source_purchase_order_id', '=', purchaseOrderId)
      .executeTakeFirst();
    if (account) {
      await db
        .deleteFrom('app.trading_ledger_entries')
        .where('account_id', '=', account.id)
        .execute();
      await db
        .deleteFrom('app.account_state_transitions')
        .where('account_id', '=', account.id)
        .execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', account.id).execute();
      await db.deleteFrom('app.trading_accounts').where('id', '=', account.id).execute();
    }
    await db
      .deleteFrom('app.payment_events')
      .where('purchase_order_id', '=', purchaseOrderId)
      .execute();
    await db.deleteFrom('app.purchase_orders').where('id', '=', purchaseOrderId).execute();
    await deleteTestUser(userId);
    await db.destroy();
  }, 30000);

  it('creates exactly one account with ledger, transition, and outbox event, and fulfills the order', async () => {
    const result = await activateEvaluationAccount(db, {
      purchaseOrderId,
      userId,
      nominalBalance: '10000.00',
      currency: 'USD',
    });

    expect(result.alreadyExisted).toBe(false);
    expect(result.status).toBe('active');
    expect(result.publicId).toMatch(/^EVAL-10000-[A-F0-9]{8}$/);

    const ledgerEntries = await db
      .selectFrom('app.trading_ledger_entries')
      .selectAll()
      .where('account_id', '=', result.id)
      .execute();
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0]?.entry_type).toBe('initial_balance');
    expect(ledgerEntries[0]?.amount).toBe('10000.00'); // string, not float

    const transitions = await db
      .selectFrom('app.account_state_transitions')
      .selectAll()
      .where('account_id', '=', result.id)
      .execute();
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({
      from_status: 'pending_activation',
      to_status: 'active',
    });

    const outboxEvents = await db
      .selectFrom('app.outbox_events')
      .selectAll()
      .where('aggregate_id', '=', result.id)
      .where('event_type', '=', 'evaluation.activated')
      .execute();
    expect(outboxEvents).toHaveLength(1);

    const order = await db
      .selectFrom('app.purchase_orders')
      .select('status')
      .where('id', '=', purchaseOrderId)
      .executeTakeFirstOrThrow();
    expect(order.status).toBe('fulfilled');
  }, 30000);

  it('pins the published v1.1.0 policy, not the stale v1.0.0 one (regression for the effective_from ordering bug)', async () => {
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('policy_version_id')
      .where('source_purchase_order_id', '=', purchaseOrderId)
      .executeTakeFirstOrThrow();

    const policy = await db
      .selectFrom('app.policy_versions')
      .select(['program', 'semantic_version', 'status'])
      .where('id', '=', account.policy_version_id)
      .executeTakeFirstOrThrow();

    // Both a v1.0.0 and a v1.1.0 WARIBA_ONE row are published; v1.0.0's
    // effective_from is `now()` at migration time while v1.1.0's is a
    // hardcoded earlier timestamp, so ordering by effective_from picks the
    // stale row — activation.ts must order by created_at instead.
    expect(policy.program).toBe('WARIBA_ONE');
    expect(policy.semantic_version).toBe('1.1.0');
    expect(policy.status).toBe('published');
  }, 15000);

  it('the pinned policy machine_hash is verified — regression for the backfill migration', async () => {
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('policy_version_id')
      .where('source_purchase_order_id', '=', purchaseOrderId)
      .executeTakeFirstOrThrow();

    const loaded = await loadPolicyById(db, account.policy_version_id);
    expect(loaded.hashVerified).toBe(true);
    expect(loaded.storedMachineHash).toBe(loaded.machineHash);
  }, 15000);

  it('is idempotent on retry — a second call for the same order returns the same account, no duplicate', async () => {
    const first = await activateEvaluationAccount(db, {
      purchaseOrderId,
      userId,
      nominalBalance: '10000.00',
      currency: 'USD',
    });
    const second = await activateEvaluationAccount(db, {
      purchaseOrderId,
      userId,
      nominalBalance: '10000.00',
      currency: 'USD',
    });

    expect(second.alreadyExisted).toBe(true);
    expect(second.id).toBe(first.id);

    const accounts = await db
      .selectFrom('app.trading_accounts')
      .selectAll()
      .where('source_purchase_order_id', '=', purchaseOrderId)
      .execute();
    expect(accounts).toHaveLength(1);

    const ledgerEntries = await db
      .selectFrom('app.trading_ledger_entries')
      .selectAll()
      .where('account_id', '=', first.id)
      .execute();
    expect(ledgerEntries).toHaveLength(1); // not doubled by the second call
  }, 30000);

  it('stays at exactly one account under real concurrent activation calls', async () => {
    const results = await Promise.all([
      activateEvaluationAccount(db, {
        purchaseOrderId,
        userId,
        nominalBalance: '10000.00',
        currency: 'USD',
      }),
      activateEvaluationAccount(db, {
        purchaseOrderId,
        userId,
        nominalBalance: '10000.00',
        currency: 'USD',
      }),
      activateEvaluationAccount(db, {
        purchaseOrderId,
        userId,
        nominalBalance: '10000.00',
        currency: 'USD',
      }),
      activateEvaluationAccount(db, {
        purchaseOrderId,
        userId,
        nominalBalance: '10000.00',
        currency: 'USD',
      }),
      activateEvaluationAccount(db, {
        purchaseOrderId,
        userId,
        nominalBalance: '10000.00',
        currency: 'USD',
      }),
    ]);

    const uniqueAccountIds = new Set(results.map((r) => r.id));
    expect(uniqueAccountIds.size).toBe(1);

    const accounts = await db
      .selectFrom('app.trading_accounts')
      .selectAll()
      .where('source_purchase_order_id', '=', purchaseOrderId)
      .execute();
    expect(accounts).toHaveLength(1);
  }, 30000);
});

describeIfDb('recordPaymentEvent — real database', () => {
  let db: Db;
  const eventId = `test-evt-${randomUUID()}`;

  beforeAll(() => {
    db = createDbClient(DATABASE_URL as string);
  });

  afterAll(async () => {
    await db.deleteFrom('app.payment_events').where('event_id', '=', eventId).execute();
    await db.destroy();
  });

  it('reports isNewEvent true the first time and false on a duplicate delivery', async () => {
    const first = await recordPaymentEvent(db, {
      provider: 'sandbox',
      eventId,
      eventType: 'payment.confirmed',
      payload: { test: true },
      signatureValid: true,
      purchaseOrderId: null,
    });
    expect(first.isNewEvent).toBe(true);

    const duplicate = await recordPaymentEvent(db, {
      provider: 'sandbox',
      eventId,
      eventType: 'payment.confirmed',
      payload: { test: true },
      signatureValid: true,
      purchaseOrderId: null,
    });
    expect(duplicate.isNewEvent).toBe(false);

    const rows = await db
      .selectFrom('app.payment_events')
      .selectAll()
      .where('event_id', '=', eventId)
      .execute();
    expect(rows).toHaveLength(1); // the unique constraint, not just application logic, prevented a duplicate row
  }, 15000);

  it('a concurrent duplicate delivery is also caught by the DB constraint, not a race', async () => {
    const concurrentEventId = `test-concurrent-${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        recordPaymentEvent(db, {
          provider: 'sandbox',
          eventId: concurrentEventId,
          eventType: 'payment.confirmed',
          payload: {},
          signatureValid: true,
          purchaseOrderId: null,
        }),
      ),
    );
    expect(results.filter((r) => r.isNewEvent)).toHaveLength(1);
    await db.deleteFrom('app.payment_events').where('event_id', '=', concurrentEventId).execute();
  }, 15000);
});
