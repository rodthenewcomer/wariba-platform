import {
  activateEvaluationAccountInTransaction,
  recordPaymentEvent,
  evaluateReserveStatus,
  type Db,
  type ActivatedAccount,
} from '@wariba/database';
import { assertPurchaseOrderTransition, isSizeCommerciallyAvailableInZone } from '@wariba/domain';
import type { ProductCode } from '@wariba/validation';
import { formatPolicyRate, HELP_FACT_UNPUBLISHED } from './help-policy-facts';

export interface ProductDTO {
  code: string;
  nominalBalance: string;
  nominalCurrency: string;
  productVersionId: string;
  priceAmount: string;
  priceCurrency: string;
}

/** Une règle telle qu'elle s'affiche sur l'écran d'acceptation. */
export interface CheckoutRuleDTO {
  label: string;
  /** Formaté depuis la policy publiée, ou « non publié » si elle l'omet. */
  value: string;
}

export interface CheckoutContextDTO {
  offer: ProductDTO;
  policyVersion: string;
  /**
   * Les règles que le trader accepte, lues depuis la version publiée.
   *
   * Cet écran listait « Objectif net réalisé : 10 % », « Perte quotidienne :
   * 3 % », « Perte maximale : 10 % », « Best Day Rule : 50 % » en dur dans le
   * composant. C'est le pire endroit de tout le produit pour une valeur
   * recopiée : la case cochée juste en dessous est un consentement versionné
   * et horodaté, conservé comme preuve. Le jour où la policy change, la preuve
   * dit une chose et l'écran en disait une autre.
   */
  rules: readonly CheckoutRuleDTO[];
}

// Mirrors RULESET.json commercial_offers.feature_flags. Flag evaluation is a
// hardcoded record here rather than a real feature-flag service, which is
// explicitly later scope (System Architecture §68) — this is not a shortcut
// around the invariant, it's an honest placeholder for a system that
// doesn't exist yet. All five sizes are enabled for the private sandbox
// journey by OFFER-023. These booleans remain independent kill switches and
// do not authorize a public paid launch.
export const SANDBOX_PRODUCT_FEATURE_FLAGS = {
  product_25k_enabled: true,
  product_50k_enabled: true,
  product_100k_enabled: true,
};

export function isSandboxProductFeatureEnabled(featureFlagKey: string | null): boolean {
  return (
    featureFlagKey === null ||
    SANDBOX_PRODUCT_FEATURE_FLAGS[featureFlagKey as keyof typeof SANDBOX_PRODUCT_FEATURE_FLAGS] ===
      true
  );
}

/**
 * Prompt 08 Phase E, TREASURY-002 — the reserve-zone-driven half of
 * availability, layered on top of the static feature flag above rather
 * than replacing it: either one being "off" is enough to hide a product.
 * A zone check failing open (treated as available) on a query error would
 * be the wrong default for something that exists specifically to protect
 * the reserve, so this is the only availability signal here that's ever
 * awaited per call rather than computed from an already-fetched row.
 */
async function isCommerciallyAvailable(
  db: Db,
  productCode: ProductCode,
  featureFlagKey: string | null,
): Promise<boolean> {
  if (!isSandboxProductFeatureEnabled(featureFlagKey)) return false;
  const reserveStatus = await evaluateReserveStatus(db);
  return isSizeCommerciallyAvailableInZone({ zone: reserveStatus.zone, productCode });
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

  // One reserve-status read for the whole listing, not one per row — the
  // zone doesn't vary by product, only which sizes it hides.
  const reserveStatus = await evaluateReserveStatus(db);

  return rows
    .filter(
      (row) =>
        isSandboxProductFeatureEnabled(row.feature_flag_key) &&
        isSizeCommerciallyAvailableInZone({
          zone: reserveStatus.zone,
          productCode: row.code as ProductCode,
        }),
    )
    .map((row) => ({
      code: row.code,
      nominalBalance: row.nominal_balance,
      nominalCurrency: row.nominal_currency,
      productVersionId: row.productVersionId,
      priceAmount: row.price_amount,
      priceCurrency: row.price_currency,
    }));
}

export async function getCheckoutContext(
  db: Db,
  productCode: ProductCode,
): Promise<CheckoutContextDTO | undefined> {
  const [offers, policy] = await Promise.all([
    listActiveProducts(db),
    db
      .selectFrom('app.policy_versions')
      .select(['semantic_version', 'parameters_json'])
      .where('program', '=', 'WARIBA_ONE')
      .where('status', '=', 'published')
      .orderBy('effective_from', 'desc')
      .executeTakeFirst(),
  ]);
  const offer = offers.find((candidate) => candidate.code === productCode);
  if (!offer || !policy) return undefined;
  return {
    offer,
    policyVersion: policy.semantic_version,
    rules: checkoutRules(policy.parameters_json),
  };
}

/**
 * Les règles WARIBA ONE, dans l'ordre où un trader se les pose.
 *
 * Une valeur que la policy publiée ne porte pas rend « non publié » plutôt
 * qu'un chiffre plausible — la même règle que `buildHelpPolicyFacts`
 * applique. Un écran d'acceptation qui invente une limite serait la pire
 * version de ce défaut.
 */
function checkoutRules(parameters: unknown): readonly CheckoutRuleDTO[] {
  const one = (parameters ?? {}) as {
    profit_target_rate?: string;
    daily_loss_rate?: string;
    maximum_loss_rate?: string;
    best_day_max_ratio?: string;
    minimum_trading_days?: number;
  };
  const rate = (value: string | undefined) => formatPolicyRate(value) ?? HELP_FACT_UNPUBLISHED;

  return [
    { label: 'Objectif de profit réalisé', value: rate(one.profit_target_rate) },
    {
      label: 'Perte quotidienne',
      value: `${rate(one.daily_loss_rate)} — blocage jusqu’au prochain reset`,
    },
    {
      label: 'Perte maximale',
      value: `${rate(one.maximum_loss_rate)} — plancher recalculé en fin de journée`,
    },
    {
      label: 'Meilleur Jour',
      value: `${rate(one.best_day_max_ratio)} — ne termine jamais le compte`,
    },
    {
      label: 'Nombre minimum de jours',
      value:
        one.minimum_trading_days === undefined
          ? HELP_FACT_UNPUBLISHED
          : one.minimum_trading_days === 0
            ? 'Aucun'
            : `${one.minimum_trading_days.toLocaleString('fr-FR')} jours`,
    },
  ];
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
  | { kind: 'consent_required' }
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

  if (
    !productVersion ||
    !(await isCommerciallyAvailable(db, params.productCode, productVersion.feature_flag_key))
  ) {
    return { kind: 'product_not_available' };
  }

  const publishedPolicy = await db
    .selectFrom('app.policy_versions')
    .select('semantic_version')
    .where('program', '=', 'WARIBA_ONE')
    .where('status', '=', 'published')
    .orderBy('effective_from', 'desc')
    .executeTakeFirst();
  if (!publishedPolicy) {
    return { kind: 'product_not_available' };
  }
  const consent = await db
    .selectFrom('app.user_consents')
    .select('id')
    .where('user_id', '=', params.userId)
    .where('consent_type', '=', 'simulated_account_disclosure')
    .where('policy_version_id', '=', publishedPolicy.semantic_version)
    .executeTakeFirst();
  if (!consent) {
    return { kind: 'consent_required' };
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
    .onConflict((oc) => oc.columns(['user_id', 'idempotency_key']).doNothing())
    .returningAll()
    .executeTakeFirst();

  if (!created) {
    const existing = await db
      .selectFrom('app.purchase_orders')
      .selectAll()
      .where('user_id', '=', params.userId)
      .where('idempotency_key', '=', params.idempotencyKey)
      .executeTakeFirstOrThrow();
    return { kind: 'existing', order: toPurchaseOrderDTO(existing) };
  }

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
      attempt_key: params.purchaseOrderId,
    })
    .onConflict((oc) =>
      oc.columns(['provider', 'attempt_key']).where('attempt_key', 'is not', null).doNothing(),
    )
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
  | { kind: 'ignored_order_state'; status: string }
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
  return db.transaction().execute(async (trx) => {
    const timestamp = new Date();
    const orderQuery = trx
      .selectFrom('app.purchase_orders')
      .selectAll()
      .where('id', '=', params.purchaseOrderId);
    const order = params.signatureValid
      ? await orderQuery.forUpdate().executeTakeFirst()
      : await orderQuery.executeTakeFirst();

    const { isNewEvent } = await recordPaymentEvent(trx, {
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

    const markProcessed = async (): Promise<void> => {
      await trx
        .updateTable('app.payment_events')
        .set({ processed_at: timestamp })
        .where('provider', '=', params.provider)
        .where('event_id', '=', params.eventId)
        .execute();
    };

    if (!params.signatureValid) {
      await markProcessed();
      return { kind: 'invalid_signature' };
    }

    if (!order) {
      await markProcessed();
      return { kind: 'unknown_order' };
    }

    if (order.total_amount !== params.amount || order.total_currency !== params.currency) {
      await markProcessed();
      return {
        kind: 'amount_mismatch',
        expected: `${order.total_amount} ${order.total_currency}`,
        received: `${params.amount} ${params.currency}`,
      };
    }

    if (params.eventType === 'payment.failed') {
      if (order.status === 'pending_payment') {
        assertPurchaseOrderTransition('pending_payment', 'payment_failed');
        await trx
          .updateTable('app.purchase_orders')
          .set({ status: 'payment_failed', updated_at: timestamp })
          .where('id', '=', order.id)
          .where('status', '=', 'pending_payment')
          .execute();
        await trx
          .updateTable('app.payment_attempts')
          .set({ status: 'failed', updated_at: timestamp })
          .where('purchase_order_id', '=', order.id)
          .execute();
      }
      await markProcessed();
      return { kind: 'failed_recorded' };
    }

    if (!['pending_payment', 'paid', 'fulfilled'].includes(order.status)) {
      await markProcessed();
      return { kind: 'ignored_order_state', status: order.status };
    }

    if (order.status === 'pending_payment') {
      assertPurchaseOrderTransition('pending_payment', 'paid');
      await trx
        .updateTable('app.purchase_orders')
        .set({ status: 'paid', updated_at: timestamp })
        .where('id', '=', order.id)
        .where('status', '=', 'pending_payment')
        .execute();
      await trx
        .updateTable('app.payment_attempts')
        .set({ status: 'confirmed', updated_at: timestamp })
        .where('purchase_order_id', '=', order.id)
        .execute();
      await trx
        .insertInto('app.receipts')
        .values({
          purchase_order_id: order.id,
          amount: order.total_amount,
          currency: order.total_currency,
        })
        .onConflict((oc) => oc.column('purchase_order_id').doNothing())
        .execute();
    }

    const productVersion = await trx
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select(['app.products.nominal_balance', 'app.products.nominal_currency'])
      .where('app.product_versions.id', '=', order.product_version_id)
      .executeTakeFirstOrThrow();

    const account = await activateEvaluationAccountInTransaction(trx, {
      purchaseOrderId: order.id,
      userId: order.user_id,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
      now: () => timestamp,
    });
    await markProcessed();
    return { kind: 'confirmed', account };
  });
}
