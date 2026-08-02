import {
  activateEvaluationAccount,
  recordPaymentEvent,
  type Db,
  type ActivatedAccount,
} from '@wariba/database';
import { assertPurchaseOrderTransition } from '@wariba/domain';
import type { ProductCode } from '@wariba/validation';

export interface ProductDTO {
  code: string;
  nominalBalance: string;
  nominalCurrency: string;
  productVersionId: string;
  priceAmount: string;
  priceCurrency: string;
}

// Mirrors RULESET.json commercial_offers.feature_flags. Flag evaluation is a
// hardcoded record here rather than a real feature-flag service, which is
// explicitly later scope (System Architecture §68) — this is not a shortcut
// around the invariant, it's an honest placeholder for a system that
// doesn't exist yet. 5K/10K are commercially enabled; 25K/50K/100K are
// implemented but disabled by default (DECISION_LOG OFFER-021).
const FEATURE_FLAGS: Record<string, boolean> = {
  product_25k_enabled: false,
  product_50k_enabled: false,
  product_100k_enabled: false,
};

function isPurchasable(featureFlagKey: string | null): boolean {
  return featureFlagKey === null || FEATURE_FLAGS[featureFlagKey] === true;
}

/**
 * Public product catalog — the client never independently decides whether
 * 25K is purchasable (AGENTS.md); this function is the single place that
 * evaluates the flag, for both the listing and order-creation paths.
 */
export async function listActiveProducts(db: Db): Promise<ProductDTO[]> {
  const rows = await db
    .selectFrom('app.product_versions')
    .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
    .select([
      'app.products.code',
      'app.products.nominal_balance',
      'app.products.nominal_currency',
      'app.product_versions.id as productVersionId',
      'app.product_versions.price_amount',
      'app.product_versions.price_currency',
      'app.product_versions.feature_flag_key',
    ])
    .where('app.product_versions.retired_at', 'is', null)
    .orderBy('app.products.nominal_balance', 'asc')
    .execute();

  return rows
    .filter((row) => isPurchasable(row.feature_flag_key))
    .map((row) => ({
      code: row.code,
      nominalBalance: row.nominal_balance,
      nominalCurrency: row.nominal_currency,
      productVersionId: row.productVersionId,
      priceAmount: row.price_amount,
      priceCurrency: row.price_currency,
    }));
}

export interface PurchaseOrderDTO {
  id: string;
  status: string;
  totalAmount: string;
  totalCurrency: string;
  productVersionId: string;
  userId: string;
}

export interface CreatePurchaseOrderParams {
  userId: string;
  productCode: ProductCode;
  idempotencyKey: string;
}

export type CreatePurchaseOrderResult =
  | { kind: 'product_not_available' }
  | { kind: 'created'; order: PurchaseOrderDTO }
  | { kind: 'existing'; order: PurchaseOrderDTO };

function toPurchaseOrderDTO(row: {
  id: string;
  status: string;
  total_amount: string;
  total_currency: string;
  product_version_id: string;
  user_id: string;
}): PurchaseOrderDTO {
  return {
    id: row.id,
    status: row.status,
    totalAmount: row.total_amount,
    totalCurrency: row.total_currency,
    productVersionId: row.product_version_id,
    userId: row.user_id,
  };
}

/**
 * Creates a purchase order. Price and currency are looked up server-side
 * from product_version — the caller has no way to pass either. AGENTS.md
 * invariant: "prix serveur uniquement."
 *
 * Idempotent insert: unique(user_id, idempotency_key). A retry with the
 * same key returns the original order instead of creating a second one.
 */
export async function createPurchaseOrder(
  db: Db,
  params: CreatePurchaseOrderParams,
): Promise<CreatePurchaseOrderResult> {
  const productVersion = await db
    .selectFrom('app.product_versions')
    .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
    .select([
      'app.product_versions.id as productVersionId',
      'app.product_versions.price_amount',
      'app.product_versions.price_currency',
      'app.product_versions.feature_flag_key',
    ])
    .where('app.products.code', '=', params.productCode)
    .where('app.product_versions.retired_at', 'is', null)
    .executeTakeFirst();

  if (!productVersion || !isPurchasable(productVersion.feature_flag_key)) {
    return { kind: 'product_not_available' };
  }

  const existing = await db
    .selectFrom('app.purchase_orders')
    .selectAll()
    .where('user_id', '=', params.userId)
    .where('idempotency_key', '=', params.idempotencyKey)
    .executeTakeFirst();

  if (existing) {
    return { kind: 'existing', order: toPurchaseOrderDTO(existing) };
  }

  const created = await db
    .insertInto('app.purchase_orders')
    .values({
      user_id: params.userId,
      product_version_id: productVersion.productVersionId,
      idempotency_key: params.idempotencyKey,
      status: 'pending_payment',
      total_amount: productVersion.price_amount,
      total_currency: productVersion.price_currency,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { kind: 'created', order: toPurchaseOrderDTO(created) };
}

export async function getOrderForUser(
  db: Db,
  orderId: string,
  userId: string,
): Promise<PurchaseOrderDTO | undefined> {
  const order = await db
    .selectFrom('app.purchase_orders')
    .selectAll()
    .where('id', '=', orderId)
    .where('user_id', '=', userId) // ownership check — can't simulate payment on someone else's order
    .executeTakeFirst();

  return order ? toPurchaseOrderDTO(order) : undefined;
}

export interface RecordPaymentAttemptParams {
  purchaseOrderId: string;
  providerReference: string;
  amount: string;
  currency: string;
}

export async function recordPaymentAttempt(
  db: Db,
  params: RecordPaymentAttemptParams,
): Promise<void> {
  await db
    .insertInto('app.payment_attempts')
    .values({
      purchase_order_id: params.purchaseOrderId,
      provider: 'sandbox',
      status: 'initiated',
      amount: params.amount,
      currency: params.currency,
      provider_reference: params.providerReference,
    })
    .execute();
}

export interface ProcessPaymentWebhookEventParams {
  provider: string;
  eventId: string;
  eventType: 'payment.confirmed' | 'payment.failed';
  purchaseOrderId: string;
  amount: string;
  currency: string;
  payload: unknown;
  signatureValid: boolean;
}

export type ProcessPaymentWebhookEventResult =
  | { kind: 'duplicate' }
  | { kind: 'invalid_signature' }
  | { kind: 'unknown_order' }
  | { kind: 'amount_mismatch'; expected: string; received: string }
  | { kind: 'failed_recorded' }
  | { kind: 'confirmed'; account: ActivatedAccount };

/**
 * Order of operations matters:
 *
 *  1. Look up the order (read-only) so `recordPaymentEvent` can be given a
 *     valid, existing id or `null` — `payment_events.purchase_order_id` is
 *     a real FK, so handing it an id that doesn't exist would crash the
 *     insert instead of letting us record-and-reject the event cleanly.
 *     The raw payload (which still contains whatever order id the webhook
 *     claimed) is preserved regardless, for the audit trail.
 *  2. Record the event with `recordPaymentEvent` before any WRITE — the
 *     real idempotency gate (`unique(provider, event_id)`). If this reports
 *     the event already existed, this is a no-op: a retried or duplicated
 *     delivery must not have a second side effect.
 *  3. Only after a NEW event with a VALID signature AND a known order do we
 *     ever touch purchase_orders/trading_accounts. An invalid signature or
 *     an unknown order is recorded (evidence trail) but never acted on.
 *     Signature verification itself happens in the caller (it needs the
 *     raw request body and the provider's secret — a presentation/
 *     infrastructure concern) and is passed in as `signatureValid`.
 *
 * The browser is never involved in confirming payment — this is the only
 * path that can move an order from pending_payment to paid.
 */
export async function processPaymentWebhookEvent(
  db: Db,
  params: ProcessPaymentWebhookEventParams,
): Promise<ProcessPaymentWebhookEventResult> {
  const order = await db
    .selectFrom('app.purchase_orders')
    .selectAll()
    .where('id', '=', params.purchaseOrderId)
    .executeTakeFirst();

  const { isNewEvent } = await recordPaymentEvent(db, {
    provider: params.provider,
    eventId: params.eventId,
    eventType: params.eventType,
    payload: params.payload,
    signatureValid: params.signatureValid,
    purchaseOrderId: order ? order.id : null,
  });

  if (!isNewEvent) {
    return { kind: 'duplicate' };
  }

  if (!params.signatureValid) {
    return { kind: 'invalid_signature' };
  }

  if (!order) {
    return { kind: 'unknown_order' };
  }

  // Server controls the amount/currency check — never trust the webhook
  // body's amount over what the order actually says.
  if (order.total_amount !== params.amount || order.total_currency !== params.currency) {
    return {
      kind: 'amount_mismatch',
      expected: `${order.total_amount} ${order.total_currency}`,
      received: `${params.amount} ${params.currency}`,
    };
  }

  if (params.eventType === 'payment.failed') {
    if (order.status === 'pending_payment') {
      assertPurchaseOrderTransition('pending_payment', 'payment_failed');
      await db
        .updateTable('app.purchase_orders')
        .set({ status: 'payment_failed', updated_at: new Date() })
        .where('id', '=', order.id)
        .where('status', '=', 'pending_payment')
        .execute();
    }
    await db
      .updateTable('app.payment_attempts')
      .set({ status: 'failed', updated_at: new Date() })
      .where('purchase_order_id', '=', order.id)
      .execute();
    return { kind: 'failed_recorded' };
  }

  // params.eventType === 'payment.confirmed'
  if (order.status === 'pending_payment') {
    assertPurchaseOrderTransition('pending_payment', 'paid');
    await db
      .updateTable('app.purchase_orders')
      .set({ status: 'paid', updated_at: new Date() })
      .where('id', '=', order.id)
      .where('status', '=', 'pending_payment')
      .execute();
    await db
      .updateTable('app.payment_attempts')
      .set({ status: 'confirmed', updated_at: new Date() })
      .where('purchase_order_id', '=', order.id)
      .execute();
    await db
      .insertInto('app.receipts')
      .values({
        purchase_order_id: order.id,
        amount: order.total_amount,
        currency: order.total_currency,
      })
      .onConflict((oc) => oc.column('purchase_order_id').doNothing())
      .execute();
  }
  // If status is already 'paid' or 'fulfilled', this is a retried/duplicate
  // webhook past the first update — fall through to activation, which is
  // itself idempotent (see activateEvaluationAccount).

  const productVersion = await db
    .selectFrom('app.product_versions')
    .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
    .select(['app.products.nominal_balance', 'app.products.nominal_currency'])
    .where('app.product_versions.id', '=', order.product_version_id)
    .executeTakeFirstOrThrow();

  const account = await activateEvaluationAccount(db, {
    purchaseOrderId: order.id,
    userId: order.user_id,
    nominalBalance: productVersion.nominal_balance,
    currency: productVersion.nominal_currency,
  });

  return { kind: 'confirmed', account };
}
