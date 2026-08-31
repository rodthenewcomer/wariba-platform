import { assertPolicyActivationReady, type Db } from '@wariba/database';
import Decimal from 'decimal.js';
import {
  v2EvaluationPolicyParametersSchema,
  v2PerformancePolicyParametersSchema,
  type ProductFamily,
  type V2EvaluationPolicyParameters,
  type V2PerformancePolicyParameters,
} from '@wariba/policies';

export type CanonicalOfferSize = '5K' | '10K' | '25K' | '50K' | '100K';

export interface PublicEvaluationRules {
  profitTargetRate: string;
  dailyLossRate: string;
  dailyLossAmount: string;
  maximumLossRate: string;
  maximumLossAmount: string;
  bestDayMaximumRate: string;
  minimumTradingDays: number;
  marginCapRate: string;
  grossExposureMaximumMultiple: string;
}

export interface PublicPerformanceRules {
  dailyLossRate: string;
  dailyLossAmount: string;
  maximumLossRate: string;
  maximumLossAmount: string;
  bestDayMaximumRate: string;
  permanentBufferRate: string;
  performanceDaysRequired: number;
  performanceDayThresholdRate: string;
  payoutSplitSchedule: readonly string[];
  payoutCaps: readonly string[];
  marginCapRate: string;
  grossExposureMaximumMultiple: string;
}

export interface CanonicalOfferReadModel {
  offerId: string;
  productVersionId: string;
  productFamily: ProductFamily;
  sizeCode: CanonicalOfferSize;
  nominalBalance: string;
  nominalCurrency: string;
  upfrontPrice: string;
  activationPrice: string;
  totalPriceIfSuccess: string;
  priceCurrency: string;
  entryPhase: 'evaluation' | 'performance';
  evaluationRules: PublicEvaluationRules | null;
  performanceRules: PublicPerformanceRules;
  publicCatalogueAvailable: true;
  purchaseEnabled: boolean;
  activationEnabled: boolean;
  gateReasonCode: string;
  policyVersionId: string;
  policySemanticVersion: string;
  policyMachineHash: string | null;
  policyHumanDocumentHash: string | null;
  policyStatus: string;
  decisionRecordId: string | null;
  marginCalibrationStatus: string | null;
  newsSourceReady: boolean;
  sessionSourceReady: boolean;
}

function canonicalOfferId(family: ProductFamily, code: string): string {
  return `${family.replace('WARIBA_', '')}-${code.replace('K', '')}`;
}

function policyAmount(nominalBalance: string, rate: string): string {
  return new Decimal(nominalBalance).times(rate).toFixed(2);
}

function evaluationRules(
  policy: V2EvaluationPolicyParameters,
  nominalBalance: string,
): PublicEvaluationRules {
  return {
    profitTargetRate: policy.profit_target_rate,
    dailyLossRate: policy.daily_loss_rate,
    dailyLossAmount: policyAmount(nominalBalance, policy.daily_loss_rate),
    maximumLossRate: policy.maximum_loss_rate,
    maximumLossAmount: policyAmount(nominalBalance, policy.maximum_loss_rate),
    bestDayMaximumRate: policy.best_day_max_ratio,
    minimumTradingDays: policy.minimum_trading_days,
    marginCapRate: policy.candidate_margin_cap_rate,
    grossExposureMaximumMultiple: policy.gross_exposure_max_multiple ?? '0',
  };
}

function performanceRules(
  policy: V2PerformancePolicyParameters,
  nominalBalance: string,
): PublicPerformanceRules {
  const payoutCaps = policy.payout_caps_by_nominal_balance[nominalBalance];
  if (!payoutCaps) {
    throw new Error(`Missing V2 payout caps for nominal balance ${nominalBalance}.`);
  }
  return {
    dailyLossRate: policy.daily_loss_rate,
    dailyLossAmount: policyAmount(nominalBalance, policy.daily_loss_rate),
    maximumLossRate: policy.maximum_loss_rate,
    maximumLossAmount: policyAmount(nominalBalance, policy.maximum_loss_rate),
    bestDayMaximumRate: policy.best_day_max_ratio,
    permanentBufferRate: policy.permanent_buffer_rate,
    performanceDaysRequired: policy.performance_days_required_per_payout,
    performanceDayThresholdRate: policy.performance_day_threshold_rate,
    payoutSplitSchedule: policy.payout_split_schedule,
    payoutCaps,
    marginCapRate: policy.candidate_margin_cap_rate,
    grossExposureMaximumMultiple: policy.gross_exposure_max_multiple ?? '0',
  };
}

/** Complete V2 catalogue. Prices and rules come from exact immutable DB versions. */
export async function listCanonicalV2Offers(db: Db): Promise<CanonicalOfferReadModel[]> {
  const [rows, links] = await Promise.all([
    db
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
        'version.id as product_version_id',
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
        'policy.human_document_hash',
        'policy.parameters_json',
        'policy.account_phase',
        'policy.status as policy_status',
        'policy.decision_record_id',
        'margin.calibration_status',
        'news.source_ready as news_source_ready',
        'session.source_ready as session_source_ready',
        'gate.purchase_enabled as gate_purchase_enabled',
        'gate.activation_enabled as gate_activation_enabled',
        'gate.reason_code as capability_reason_code',
      ])
      .where('version.catalogue_status', '=', 'public_candidate')
      .where('version.retired_at', 'is', null)
      .orderBy('product.product_family', 'asc')
      .orderBy('product.nominal_balance', 'asc')
      .execute(),
    db
      .selectFrom('app.policy_performance_links as link')
      .innerJoin(
        'app.policy_versions as performance',
        'performance.id',
        'link.performance_policy_version_id',
      )
      .select(['link.evaluation_policy_version_id', 'performance.parameters_json'])
      .execute(),
  ]);

  const performanceByEvaluation = new Map(
    links.map((link) => [link.evaluation_policy_version_id, link.parameters_json]),
  );

  return rows.map((row) => {
    const directPerformance = row.account_phase === 'performance';
    const evaluation = directPerformance
      ? null
      : v2EvaluationPolicyParametersSchema.parse(row.parameters_json);
    const rawPerformance = directPerformance
      ? row.parameters_json
      : performanceByEvaluation.get(row.policy_version_id);
    if (!rawPerformance) {
      throw new Error(`Offer ${row.product_family}/${row.code} has no linked Performance policy.`);
    }
    const performance = v2PerformancePolicyParametersSchema.parse(rawPerformance);

    return {
      offerId: canonicalOfferId(row.product_family, row.code),
      productVersionId: row.product_version_id,
      productFamily: row.product_family,
      sizeCode: row.code,
      nominalBalance: row.nominal_balance,
      nominalCurrency: row.nominal_currency,
      upfrontPrice: row.price_amount,
      activationPrice: row.activation_price_amount,
      totalPriceIfSuccess: row.total_price_if_success,
      priceCurrency: row.price_currency,
      entryPhase: directPerformance ? 'performance' : 'evaluation',
      evaluationRules: evaluation ? evaluationRules(evaluation, row.nominal_balance) : null,
      performanceRules: performanceRules(performance, row.nominal_balance),
      publicCatalogueAvailable: true,
      purchaseEnabled: row.purchase_enabled && row.gate_purchase_enabled === true,
      activationEnabled: row.activation_enabled && row.gate_activation_enabled === true,
      gateReasonCode:
        row.capability_reason_code ?? row.gate_reason_code ?? 'V2_PUBLIC_ACTIVATION_BLOCKED',
      policyVersionId: row.policy_version_id,
      policySemanticVersion: row.semantic_version,
      policyMachineHash: row.machine_hash,
      policyHumanDocumentHash: row.human_document_hash,
      policyStatus: row.policy_status,
      decisionRecordId: row.decision_record_id,
      marginCalibrationStatus: row.calibration_status,
      newsSourceReady: row.news_source_ready === true,
      sessionSourceReady: row.session_source_ready === true,
    };
  });
}

export async function getCanonicalV2Offer(
  db: Db,
  offerId: string,
): Promise<CanonicalOfferReadModel | undefined> {
  return (await listCanonicalV2Offers(db)).find((offer) => offer.offerId === offerId);
}

export type CreateCanonicalV2OrderResult =
  | { kind: 'offer_not_found' }
  | { kind: 'capability_blocked'; reasonCode: string }
  | { kind: 'consent_required'; policyVersionId: string }
  | { kind: 'created' | 'existing'; orderId: string };

export type CheckoutCapabilityMode = 'public' | 'local_sandbox';

/**
 * Creates an order pinned to an exact V2 offer. `local_sandbox` is selected
 * only from trusted server configuration and never changes public DB gates.
 */
export async function createCanonicalV2PurchaseOrder(
  db: Db,
  params: {
    userId: string;
    offerId: string;
    idempotencyKey: string;
    countryCode: string;
    channel: string;
    capabilityMode?: CheckoutCapabilityMode;
  },
): Promise<CreateCanonicalV2OrderResult> {
  return db.transaction().execute(async (trx) => {
    const offer = await getCanonicalV2Offer(trx, params.offerId);
    if (!offer) return { kind: 'offer_not_found' };
    const localSandbox = params.capabilityMode === 'local_sandbox';
    if (!localSandbox && !offer.purchaseEnabled) {
      return { kind: 'capability_blocked', reasonCode: offer.gateReasonCode };
    }
    if (!localSandbox) {
      try {
        await assertPolicyActivationReady(trx, offer.policyVersionId);
      } catch (error) {
        return {
          kind: 'capability_blocked',
          reasonCode: error instanceof Error ? error.message : 'V2_CAPABILITY_NOT_READY',
        };
      }
    }

    const consent = await trx
      .selectFrom('app.user_consents')
      .select('id')
      .where('user_id', '=', params.userId)
      .where('consent_type', '=', 'simulated_account_disclosure')
      .where('attached_policy_version_id', '=', offer.policyVersionId)
      .executeTakeFirst();
    if (!consent) return { kind: 'consent_required', policyVersionId: offer.policyVersionId };

    const created = await trx
      .insertInto('app.purchase_orders')
      .values({
        user_id: params.userId,
        product_version_id: offer.productVersionId,
        policy_version_id: offer.policyVersionId,
        policy_machine_hash: offer.policyMachineHash,
        policy_human_document_hash: offer.policyHumanDocumentHash,
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
