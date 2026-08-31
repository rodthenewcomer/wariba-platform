import {
  activateEvaluationAccountInTransaction,
  activateV2PerformanceFromOrderInTransaction,
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
      'app.product_versions.purchase_enabled',
    ])
    .where('app.products.product_family', '=', 'WARIBA_ONE')
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
        row.purchase_enabled &&
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

export interface CommerceOrderStatusDTO extends PurchaseOrderDTO {
  orderKind: 'initial_purchase' | 'flex_activation';
  productFamily: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';
  productCode: ProductCode;
  nominalBalance: string;
  policyVersionId: string;
  policyVersion: string;
  activationDueAt: string | null;
  accountId: string | null;
  accountPublicId: string | null;
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
      'app.product_versions.activation_price_amount',
      'app.product_versions.total_price_if_success',
      'app.product_versions.purchase_enabled',
    ])
    .where('app.products.code', '=', params.productCode)
    .where('app.products.product_family', '=', 'WARIBA_ONE')
    .where('app.product_versions.purchase_enabled', '=', true)
    .where('app.product_versions.retired_at', 'is', null)
    .executeTakeFirst();

  if (
    !productVersion ||
    !productVersion.purchase_enabled ||
    !(await isCommerciallyAvailable(db, params.productCode, productVersion.feature_flag_key))
  ) {
    return { kind: 'product_not_available' };
  }

  const publishedPolicy = await db
    .selectFrom('app.policy_versions')
    .select(['id', 'semantic_version', 'machine_hash', 'human_document_hash'])
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
    .where('attached_policy_version_id', '=', publishedPolicy.id)
    .executeTakeFirst();
  if (!consent) {
    return { kind: 'consent_required' };
  }

  const created = await db
    .insertInto('app.purchase_orders')
    .values({
      user_id: params.userId,
      product_version_id: productVersion.productVersionId,
      policy_version_id: publishedPolicy.id,
      policy_machine_hash: publishedPolicy.machine_hash,
      policy_human_document_hash: publishedPolicy.human_document_hash,
      product_family: 'WARIBA_ONE',
      order_kind: 'initial_purchase',
      idempotency_key: params.idempotencyKey,
      status: 'pending_payment',
      total_amount: productVersion.price_amount,
      total_currency: productVersion.price_currency,
      upfront_price_snapshot: productVersion.price_amount,
      activation_price_snapshot: productVersion.activation_price_amount,
      total_price_if_success_snapshot: productVersion.total_price_if_success,
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

export async function getCommerceOrderStatusForUser(
  db: Db,
  orderId: string,
  userId: string,
): Promise<CommerceOrderStatusDTO | undefined> {
  const row = await db
    .selectFrom('app.purchase_orders as purchase')
    .innerJoin('app.product_versions as version', 'version.id', 'purchase.product_version_id')
    .innerJoin('app.products as product', 'product.id', 'version.product_id')
    .innerJoin('app.policy_versions as policy', 'policy.id', 'purchase.policy_version_id')
    .select([
      'purchase.id',
      'purchase.status',
      'purchase.total_amount',
      'purchase.total_currency',
      'purchase.product_version_id',
      'purchase.user_id',
      'purchase.order_kind',
      'purchase.product_family',
      'purchase.source_evaluation_account_id',
      'purchase.activation_due_at',
      'product.code',
      'product.nominal_balance',
      'policy.id as policy_version_id',
      'policy.semantic_version',
    ])
    .where('purchase.id', '=', orderId)
    .where('purchase.user_id', '=', userId)
    .executeTakeFirst();
  if (!row || row.product_family === null) return undefined;
  const account = row.source_evaluation_account_id
    ? await db
        .selectFrom('app.trading_accounts')
        .select(['id', 'public_id'])
        .where('source_evaluation_account_id', '=', row.source_evaluation_account_id)
        .executeTakeFirst()
    : await db
        .selectFrom('app.trading_accounts')
        .select(['id', 'public_id'])
        .where('source_purchase_order_id', '=', row.id)
        .executeTakeFirst();
  return {
    id: row.id,
    status: row.status,
    totalAmount: row.total_amount,
    totalCurrency: row.total_currency,
    productVersionId: row.product_version_id,
    userId: row.user_id,
    orderKind: row.order_kind,
    productFamily: row.product_family,
    productCode: row.code as ProductCode,
    nominalBalance: row.nominal_balance,
    policyVersionId: row.policy_version_id,
    policyVersion: row.semantic_version,
    activationDueAt: row.activation_due_at?.toISOString() ?? null,
    accountId: account?.id ?? null,
    accountPublicId: account?.public_id ?? null,
  };
}

export type PreparePaymentResult =
  | { kind: 'ready'; order: PurchaseOrderDTO }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'already_processed'; status: string }
  | { kind: 'unavailable'; status: string };

/** Reopens a failed attempt on the same order; no second order or price lookup. */
export async function preparePurchaseOrderForPayment(
  db: Db,
  params: { orderId: string; userId: string; now?: Date },
): Promise<PreparePaymentResult> {
  return db.transaction().execute(async (trx) => {
    const now = params.now ?? new Date();
    const order = await trx
      .selectFrom('app.purchase_orders')
      .selectAll()
      .where('id', '=', params.orderId)
      .where('user_id', '=', params.userId)
      .forUpdate()
      .executeTakeFirst();
    if (!order) return { kind: 'not_found' };
    if (order.activation_due_at && now > order.activation_due_at) {
      if (order.source_evaluation_account_id) {
        await trx
          .updateTable('app.flex_activation_obligations')
          .set({ status: 'expired', updated_at: now })
          .where('activation_order_id', '=', order.id)
          .where('status', '=', 'activation_due')
          .execute();
      }
      return { kind: 'expired' };
    }
    if (order.status === 'paid' || order.status === 'fulfilled') {
      return { kind: 'already_processed', status: order.status };
    }
    if (order.status === 'payment_failed') {
      assertPurchaseOrderTransition('payment_failed', 'pending_payment');
      await trx
        .updateTable('app.purchase_orders')
        .set({ status: 'pending_payment', updated_at: now })
        .where('id', '=', order.id)
        .where('status', '=', 'payment_failed')
        .execute();
      order.status = 'pending_payment';
    }
    if (order.status !== 'pending_payment') {
      return { kind: 'unavailable', status: order.status };
    }
    return { kind: 'ready', order: toPurchaseOrderDTO(order) };
  });
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
      oc.columns(['provider', 'attempt_key']).where('attempt_key', 'is not', null).doUpdateSet({
        status: 'initiated',
        provider_reference: params.providerReference,
        amount: params.amount,
        currency: params.currency,
        updated_at: new Date(),
      }),
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
  /** False only for a trusted local sandbox run; production always enforces readiness. */
  enforceCapabilityReadiness?: boolean;
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

    const account =
      order.product_family === 'WARIBA_INSTANT' || order.order_kind === 'flex_activation'
        ? await activateV2PerformanceFromOrderInTransaction(trx, {
            purchaseOrderId: order.id,
            now: timestamp,
            ...(params.enforceCapabilityReadiness !== undefined && {
              enforceCapabilityReadiness: params.enforceCapabilityReadiness,
            }),
          })
        : await activateEvaluationAccountInTransaction(trx, {
            purchaseOrderId: order.id,
            userId: order.user_id,
            nominalBalance: productVersion.nominal_balance,
            currency: productVersion.nominal_currency,
            now: () => timestamp,
            ...(params.enforceCapabilityReadiness !== undefined && {
              enforceCapabilityReadiness: params.enforceCapabilityReadiness,
            }),
          });
    await markProcessed();
    return { kind: 'confirmed', account };
  });
}
