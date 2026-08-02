import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '@wariba/database';
import { listActiveProducts, createPurchaseOrder, processPaymentWebhookEvent } from '../src/index';

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
    await deleteTestUser(userId);
    await db.destroy();
  }, 30000);

  it('listActiveProducts excludes the 25K product (feature-flagged off)', async () => {
    const products = await listActiveProducts(db);
    expect(products.some((p) => p.code === '5K')).toBe(true);
    expect(products.some((p) => p.code === '10K')).toBe(true);
    expect(products.some((p) => p.code === '25K')).toBe(false);
  });

  it('createPurchaseOrder rejects the 25K product as not available', async () => {
    const result = await createPurchaseOrder(db, {
      userId,
      productCode: '25K',
      idempotencyKey: randomUUID(),
    });
    expect(result.kind).toBe('product_not_available');
  });

  it('createPurchaseOrder is idempotent on the same idempotency key — a double click creates only one order', async () => {
    const idempotencyKey = randomUUID();
    const first = await createPurchaseOrder(db, { userId, productCode: '5K', idempotencyKey });
    if (first.kind !== 'created') throw new Error('expected the first call to create the order');
    purchaseOrderIds.push(first.order.id);

    const second = await createPurchaseOrder(db, { userId, productCode: '5K', idempotencyKey });
    if (second.kind === 'product_not_available')
      throw new Error('unexpected product_not_available');
    expect(second.kind).toBe('existing');
    expect(second.order.id).toBe(first.order.id);

    const rows = await db
      .selectFrom('app.purchase_orders')
      .selectAll()
      .where('user_id', '=', userId)
      .where('idempotency_key', '=', idempotencyKey)
      .execute();
    expect(rows).toHaveLength(1);
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
