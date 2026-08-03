import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '@wariba/database';
import {
  listActiveProducts,
  createPurchaseOrder,
  processPaymentWebhookEvent,
  recordPaymentAttempt,
  acceptSandboxDisclosure,
} from '../src/index';

/**
 * Real integration tests against the live hosted database — not mocked.
 * Requires DATABASE_URL in the environment (via .env.local, gitignored).
 * Skips gracefully if it's absent, mirroring packages/database's integration tests.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('commerce application layer — real database', () => {
  let db: Db;
  let userId: string;
  const purchaseOrderIds: string[] = [];

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
    userId = await createTestUser(`commerce-test-${Date.now()}@wariba-test.invalid`);
  }, 30000);

  afterAll(async () => {
    // Cascades: trading_accounts -> account_state_transitions/trading_ledger_entries/
    // outbox_events have no ON DELETE CASCADE by design (ledger is append-only
    // evidence), so clean up explicitly in dependency order rather than relying
    // on cascade — mirrors packages/database's activation.integration.test.ts.
    for (const orderId of purchaseOrderIds) {
      const account = await db
        .selectFrom('app.trading_accounts')
        .select('id')
        .where('source_purchase_order_id', '=', orderId)
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
      await db.deleteFrom('app.receipts').where('purchase_order_id', '=', orderId).execute();
      await db
        .deleteFrom('app.payment_attempts')
        .where('purchase_order_id', '=', orderId)
        .execute();
      await db.deleteFrom('app.payment_events').where('purchase_order_id', '=', orderId).execute();
      await db.deleteFrom('app.purchase_orders').where('id', '=', orderId).execute();
    }
    const consents = await db
      .selectFrom('app.user_consents')
      .select('id')
      .where('user_id', '=', userId)
      .execute();
    if (consents.length > 0) {
      await db
        .deleteFrom('audit.audit_events')
        .where(
          'target_id',
          'in',
          consents.map((consent) => consent.id),
        )
        .execute();
    }
    await db.deleteFrom('app.user_consents').where('user_id', '=', userId).execute();
    await deleteTestUser(userId);
    await db.destroy();
  }, 30000);

  it('refuses order creation until the current simulated-account disclosure is accepted', async () => {
    const result = await createPurchaseOrder(db, {
      userId,
      productCode: '5K',
      idempotencyKey: randomUUID(),
    });
    expect(result.kind).toBe('consent_required');
  });

  it('records the published policy consent exactly once under concurrent retries', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        acceptSandboxDisclosure(db, { userId, locale: 'fr', correlationId: randomUUID() }),
      ),
    );
    expect(results.filter((result) => !result.alreadyExisted)).toHaveLength(1);

    const rows = await db
      .selectFrom('app.user_consents')
      .selectAll()
      .where('user_id', '=', userId)
      .where('consent_type', '=', 'simulated_account_disclosure')
      .execute();
    expect(rows).toHaveLength(1);
  });

  it('listActiveProducts exposes all five sandbox offers in ascending order', async () => {
    const products = await listActiveProducts(db);
    expect(products.map((product) => product.code)).toEqual(['5K', '10K', '25K', '50K', '100K']);
  });

  it('creates a server-priced sandbox order for every enabled account size', async () => {
    for (const productCode of ['5K', '10K', '25K', '50K', '100K'] as const) {
      const result = await createPurchaseOrder(db, {
        userId,
        productCode,
        idempotencyKey: randomUUID(),
      });
      if (result.kind !== 'created') throw new Error(`expected ${productCode} to be available`);
      purchaseOrderIds.push(result.order.id);
      expect(result.order.totalCurrency).toBe('XOF');
    }
  });

  it('createPurchaseOrder is idempotent under concurrent double clicks', async () => {
    const idempotencyKey = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        createPurchaseOrder(db, { userId, productCode: '5K', idempotencyKey }),
      ),
    );
    const orders = results.flatMap((result) =>
      result.kind === 'created' || result.kind === 'existing' ? [result.order] : [],
    );
    expect(orders).toHaveLength(5);
    expect(new Set(orders.map((order) => order.id)).size).toBe(1);
    purchaseOrderIds.push(orders[0]?.id ?? '');

    const rows = await db
      .selectFrom('app.purchase_orders')
      .selectAll()
      .where('user_id', '=', userId)
      .where('idempotency_key', '=', idempotencyKey)
      .execute();
    expect(rows).toHaveLength(1);
  }, 15000);

  it('records one sandbox payment attempt under concurrent retries', async () => {
    const result = await createPurchaseOrder(db, {
      userId,
      productCode: '25K',
      idempotencyKey: randomUUID(),
    });
    if (result.kind !== 'created') throw new Error('expected a new 25K order');
    purchaseOrderIds.push(result.order.id);

    await Promise.all(
      Array.from({ length: 5 }, () =>
        recordPaymentAttempt(db, {
          purchaseOrderId: result.order.id,
          providerReference: `sandbox_${result.order.id}`,
          amount: result.order.totalAmount,
          currency: result.order.totalCurrency,
        }),
      ),
    );

    const attempts = await db
      .selectFrom('app.payment_attempts')
      .selectAll()
      .where('purchase_order_id', '=', result.order.id)
      .execute();
    expect(attempts).toHaveLength(1);
  }, 15000);

  describe('processPaymentWebhookEvent — confirmation, replay, and double fulfillment', () => {
    let orderId: string;
    let totalAmount: string;
    let totalCurrency: string;

    beforeAll(async () => {
      const result = await createPurchaseOrder(db, {
        userId,
        productCode: '10K',
        idempotencyKey: randomUUID(),
      });
      if (result.kind !== 'created') throw new Error('setup: expected a new order');
      orderId = result.order.id;
      totalAmount = result.order.totalAmount;
      totalCurrency = result.order.totalCurrency;
      purchaseOrderIds.push(orderId);
    }, 15000);

    it('rejects an unknown order, recording the event with a null purchase_order_id (FK-safe)', async () => {
      // recordPaymentEvent is called before we know the order exists, so an
      // unknown order must never be handed to it as a foreign key — it's
      // recorded with purchase_order_id: null instead. Clean up by event_id
      // rather than by purchaseOrderIds (this row was never tied to one).
      const eventId = randomUUID();
      const result = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId,
        eventType: 'payment.confirmed',
        purchaseOrderId: randomUUID(),
        amount: '1.00',
        currency: 'XOF',
        payload: {},
        signatureValid: true,
      });
      expect(result.kind).toBe('unknown_order');
      await db.deleteFrom('app.payment_events').where('event_id', '=', eventId).execute();
    });

    it('rejects a wrong amount without touching the order', async () => {
      const result = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId: randomUUID(),
        eventType: 'payment.confirmed',
        purchaseOrderId: orderId,
        amount: '1.00',
        currency: totalCurrency,
        payload: {},
        signatureValid: true,
      });
      expect(result.kind).toBe('amount_mismatch');

      const order = await db
        .selectFrom('app.purchase_orders')
        .select('status')
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow();
      expect(order.status).toBe('pending_payment');
    });

    it('rejects a wrong currency without touching the order', async () => {
      const result = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId: randomUUID(),
        eventType: 'payment.confirmed',
        purchaseOrderId: orderId,
        amount: totalAmount,
        currency: 'EUR',
        payload: {},
        signatureValid: true,
      });
      expect(result.kind).toBe('amount_mismatch');

      const order = await db
        .selectFrom('app.purchase_orders')
        .select('status')
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow();
      expect(order.status).toBe('pending_payment');
    });

    it('records an invalid signature as evidence without touching the order', async () => {
      const result = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId: randomUUID(),
        eventType: 'payment.confirmed',
        purchaseOrderId: orderId,
        amount: totalAmount,
        currency: totalCurrency,
        payload: {},
        signatureValid: false,
      });
      expect(result.kind).toBe('invalid_signature');

      const order = await db
        .selectFrom('app.purchase_orders')
        .select('status')
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow();
      expect(order.status).toBe('pending_payment');
    });

    it('confirms payment, activates exactly one account, fulfills the order, and is safe under replay + a second delivery', async () => {
      const eventId = randomUUID();
      const first = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId,
        eventType: 'payment.confirmed',
        purchaseOrderId: orderId,
        amount: totalAmount,
        currency: totalCurrency,
        payload: {},
        signatureValid: true,
      });
      if (first.kind !== 'confirmed') throw new Error('expected confirmed');
      expect(first.account.alreadyExisted).toBe(false);

      const order = await db
        .selectFrom('app.purchase_orders')
        .select('status')
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow();
      expect(order.status).toBe('fulfilled');

      const receipts = await db
        .selectFrom('app.receipts')
        .selectAll()
        .where('purchase_order_id', '=', orderId)
        .execute();
      expect(receipts).toHaveLength(1);

      // Replay: the exact same event id again — the payment_events unique
      // constraint must catch it, not application logic.
      const replay = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId,
        eventType: 'payment.confirmed',
        purchaseOrderId: orderId,
        amount: totalAmount,
        currency: totalCurrency,
        payload: {},
        signatureValid: true,
      });
      expect(replay.kind).toBe('duplicate');

      // Double fulfillment via a DIFFERENT event id for the same order (e.g. a
      // provider retry with a new delivery id) must still land on exactly one
      // account — activation's own idempotency (source_purchase_order_id
      // unique), not just the event-id gate.
      const secondDelivery = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId: randomUUID(),
        eventType: 'payment.confirmed',
        purchaseOrderId: orderId,
        amount: totalAmount,
        currency: totalCurrency,
        payload: {},
        signatureValid: true,
      });
      if (secondDelivery.kind !== 'confirmed') throw new Error('expected confirmed');
      expect(secondDelivery.account.alreadyExisted).toBe(true);
      expect(secondDelivery.account.id).toBe(first.account.id);

      const accounts = await db
        .selectFrom('app.trading_accounts')
        .selectAll()
        .where('source_purchase_order_id', '=', orderId)
        .execute();
      expect(accounts).toHaveLength(1);

      const receiptsAfter = await db
        .selectFrom('app.receipts')
        .selectAll()
        .where('purchase_order_id', '=', orderId)
        .execute();
      expect(receiptsAfter).toHaveLength(1); // onConflict doNothing — not doubled

      const processedEvents = await db
        .selectFrom('app.payment_events')
        .select('processed_at')
        .where('purchase_order_id', '=', orderId)
        .where('signature_valid', '=', true)
        .execute();
      expect(processedEvents.every((event) => event.processed_at !== null)).toBe(true);
    }, 30000);
  });

  describe('processPaymentWebhookEvent — payment.failed', () => {
    let orderId: string;

    beforeAll(async () => {
      const result = await createPurchaseOrder(db, {
        userId,
        productCode: '5K',
        idempotencyKey: randomUUID(),
      });
      if (result.kind !== 'created') throw new Error('setup: expected a new order');
      orderId = result.order.id;
      purchaseOrderIds.push(orderId);
    }, 15000);

    it('moves the order to payment_failed and does not activate an account', async () => {
      const seed = await db
        .selectFrom('app.purchase_orders')
        .selectAll()
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow();

      const result = await processPaymentWebhookEvent(db, {
        provider: 'sandbox',
        eventId: randomUUID(),
        eventType: 'payment.failed',
        purchaseOrderId: orderId,
        amount: seed.total_amount,
        currency: seed.total_currency,
        payload: {},
        signatureValid: true,
      });
      expect(result.kind).toBe('failed_recorded');

      const order = await db
        .selectFrom('app.purchase_orders')
        .select('status')
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow();
      expect(order.status).toBe('payment_failed');

      const accounts = await db
        .selectFrom('app.trading_accounts')
        .selectAll()
        .where('source_purchase_order_id', '=', orderId)
        .execute();
      expect(accounts).toHaveLength(0);
    }, 15000);
  });
});
