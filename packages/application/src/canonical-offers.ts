import { assertPolicyActivationReady, type Db } from '@wariba/database';
import type { ProductFamily } from '@wariba/policies';

export interface CanonicalOfferReadModel {
  offerId: string;
  productFamily: ProductFamily;
  sizeCode: '5K' | '10K' | '25K' | '50K' | '100K';
  nominalBalance: string;
  nominalCurrency: string;
  upfrontPrice: string;
  activationPrice: string;
  totalPriceIfSuccess: string;
  priceCurrency: string;
  publicCatalogueAvailable: true;
  purchaseEnabled: boolean;
  activationEnabled: boolean;
  gateReasonCode: string;
  policyVersionId: string;
  policySemanticVersion: string;
  policyMachineHash: string | null;
  policyStatus: string;
  marginCalibrationStatus: string | null;
  newsSourceReady: boolean;
  sessionSourceReady: boolean;
}

function offerId(family: ProductFamily, code: string): string {
  const prefix = family.replace('WARIBA_', '');
  return `${prefix}-${code.replace('K', '')}`;
}

/**
 * Backend-only source for the complete 15-offer catalogue. Public catalogue
 * membership is unconditional; purchase/activation capability is reported
 * separately with its fail-closed reason.
 */
export async function listCanonicalV2Offers(db: Db): Promise<CanonicalOfferReadModel[]> {
  const rows = await db
    .selectFrom('app.product_versions as version')
    .innerJoin('app.products as product', 'product.id', 'version.product_id')
    .innerJoin('app.policy_versions as policy', 'policy.id', 'version.policy_version_id')
    .leftJoin('app.margin_profiles as margin', 'margin.id', 'policy.margin_profile_id')
    .leftJoin('app.news_calendar_versions as news', 'news.id', 'policy.news_calendar_version_id')
    .leftJoin(
      'app.session_calendar_versions as session',
      'session.id',
      'policy.session_calendar_version_id',
    )
    .leftJoin('app.offer_capability_gates as gate', (join) =>
      join
        .onRef('gate.product_version_id', '=', 'version.id')
        .on('gate.country_code', '=', '*')
        .on('gate.channel', '=', 'all'),
    )
    .select([
      'product.product_family',
      'product.code',
      'product.nominal_balance',
      'product.nominal_currency',
      'version.price_amount',
      'version.activation_price_amount',
      'version.total_price_if_success',
      'version.price_currency',
      'version.purchase_enabled',
      'version.activation_enabled',
      'version.gate_reason_code',
      'policy.id as policy_version_id',
      'policy.semantic_version',
      'policy.machine_hash',
      'policy.status as policy_status',
      'margin.calibration_status',
      'news.source_ready as news_source_ready',
      'session.source_ready as session_source_ready',
      'gate.purchase_enabled as gate_purchase_enabled',
      'gate.activation_enabled as gate_activation_enabled',
      'gate.reason_code as capability_reason_code',
    ])
    .where('version.catalogue_version', '=', 'v2.0.0-candidate')
    .orderBy('product.product_family', 'asc')
    .orderBy('product.nominal_balance', 'asc')
    .execute();

  return rows.map((row) => ({
    offerId: offerId(row.product_family, row.code),
    productFamily: row.product_family,
    sizeCode: row.code,
    nominalBalance: row.nominal_balance,
    nominalCurrency: row.nominal_currency,
    upfrontPrice: row.price_amount,
    activationPrice: row.activation_price_amount,
    totalPriceIfSuccess: row.total_price_if_success,
    priceCurrency: row.price_currency,
    publicCatalogueAvailable: true,
    purchaseEnabled: row.purchase_enabled && row.gate_purchase_enabled === true,
    activationEnabled: row.activation_enabled && row.gate_activation_enabled === true,
    gateReasonCode:
      row.capability_reason_code ?? row.gate_reason_code ?? 'V2_PUBLIC_ACTIVATION_BLOCKED',
    policyVersionId: row.policy_version_id,
    policySemanticVersion: row.semantic_version,
    policyMachineHash: row.machine_hash,
    policyStatus: row.policy_status,
    marginCalibrationStatus: row.calibration_status,
    newsSourceReady: row.news_source_ready === true,
    sessionSourceReady: row.session_source_ready === true,
  }));
}

export type CreateCanonicalV2OrderResult =
  | { kind: 'offer_not_found' }
  | { kind: 'capability_blocked'; reasonCode: string }
  | { kind: 'consent_required'; policyVersionId: string }
  | { kind: 'created' | 'existing'; orderId: string };

/**
 * Future V2 checkout command. It is executable now but returns a capability
 * blocker for every seeded offer; when governance explicitly opens a cell,
 * the exact policy and all three price components are pinned atomically.
 */
export async function createCanonicalV2PurchaseOrder(
  db: Db,
  params: {
    userId: string;
    offerId: string;
    idempotencyKey: string;
    countryCode: string;
    channel: string;
  },
): Promise<CreateCanonicalV2OrderResult> {
  return db.transaction().execute(async (trx) => {
    const catalog = await listCanonicalV2Offers(trx);
    const offer = catalog.find((candidate) => candidate.offerId === params.offerId);
    if (!offer) return { kind: 'offer_not_found' };
    if (!offer.purchaseEnabled) {
      return { kind: 'capability_blocked', reasonCode: offer.gateReasonCode };
    }
    try {
      await assertPolicyActivationReady(trx, offer.policyVersionId);
    } catch (error) {
      return {
        kind: 'capability_blocked',
        reasonCode: error instanceof Error ? error.message : 'V2_CAPABILITY_NOT_READY',
      };
    }

    const consent = await trx
      .selectFrom('app.user_consents')
      .select('id')
      .where('user_id', '=', params.userId)
      .where('consent_type', '=', 'simulated_account_disclosure')
      .where('attached_policy_version_id', '=', offer.policyVersionId)
      .executeTakeFirst();
    if (!consent) return { kind: 'consent_required', policyVersionId: offer.policyVersionId };

    const version = await trx
      .selectFrom('app.product_versions as version')
      .innerJoin('app.products as product', 'product.id', 'version.product_id')
      .select('version.id')
      .where('version.catalogue_version', '=', 'v2.0.0-candidate')
      .where('product.product_family', '=', offer.productFamily)
      .where('product.code', '=', offer.sizeCode)
      .executeTakeFirstOrThrow();
    const created = await trx
      .insertInto('app.purchase_orders')
      .values({
        user_id: params.userId,
        product_version_id: version.id,
        policy_version_id: offer.policyVersionId,
        policy_machine_hash: offer.policyMachineHash,
        policy_human_document_hash: null,
        product_family: offer.productFamily,
        order_kind: 'initial_purchase',
        idempotency_key: params.idempotencyKey,
        status: 'pending_payment',
        total_amount: offer.upfrontPrice,
        total_currency: offer.priceCurrency,
        upfront_price_snapshot: offer.upfrontPrice,
        activation_price_snapshot: offer.activationPrice,
        total_price_if_success_snapshot: offer.totalPriceIfSuccess,
      })
      .onConflict((conflict) => conflict.columns(['user_id', 'idempotency_key']).doNothing())
      .returning('id')
      .executeTakeFirst();
    if (created) return { kind: 'created', orderId: created.id };
    const existing = await trx
      .selectFrom('app.purchase_orders')
      .select('id')
      .where('user_id', '=', params.userId)
      .where('idempotency_key', '=', params.idempotencyKey)
      .executeTakeFirstOrThrow();
    return { kind: 'existing', orderId: existing.id };
  });
}
