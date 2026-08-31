import { z } from 'zod';
import { evaluationOnePolicyParametersSchema, performancePolicyParametersSchema } from './schema';

export const V2_POLICY_CONTRACT_VERSION = 'WARIBA_POLICY_V2' as const;
export const V2_LEGACY_DECISION_RECORD_ID = 'POLICY-GOV-003' as const;
export const V2_DECISION_RECORD_ID = 'POLICY-GOV-004' as const;

export const productFamilySchema = z.enum(['WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT']);
export const accountPhaseSchema = z.enum(['evaluation', 'performance']);
export type ProductFamily = z.infer<typeof productFamilySchema>;
export type AccountPhase = z.infer<typeof accountPhaseSchema>;

const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'must be an unsigned decimal string');
const fiveRates = z.tuple([
  decimalString,
  decimalString,
  decimalString,
  decimalString,
  decimalString,
]);

const v2CommonSchema = z
  .object({
    contract_version: z.literal(V2_POLICY_CONTRACT_VERSION),
    decision_record_id: z.enum([V2_LEGACY_DECISION_RECORD_ID, V2_DECISION_RECORD_ID]),
    product_family: productFamilySchema,
    account_phase: accountPhaseSchema,
    inactivity_warning_days: z.literal(21),
    inactivity_close_days: z.literal(30),
    minimum_profit_eligible_duration_ms: z.literal(60000),
    payout_debit_risk_neutral: z.literal(true),
    weekend_new_exposure_cutoff_minutes: z.literal(30),
    weekend_minimum_closure_minutes: z.literal(120),
    news_policy: z.enum([
      'evaluation_unrestricted',
      'performance_high_impact_t2_reduce_close_only',
    ]),
    session_calendar_required: z.literal(true),
    news_calendar_required: z.boolean(),
    margin_calibration_status: z.enum(['calibration_required', 'validated']),
    leverage_profile_status: z.literal('candidate'),
    leverage_by_asset_group: z.object({
      FX: z.number().int().positive(),
      METALS: z.number().int().positive(),
      INDICES: z.number().int().positive(),
      ENERGY: z.number().int().positive(),
    }),
    candidate_margin_cap_rate: decimalString,
    gross_exposure_max_multiple: decimalString.optional(),
  })
  .superRefine((policy, context) => {
    if (policy.decision_record_id !== V2_DECISION_RECORD_ID) return;
    if (policy.margin_calibration_status !== 'validated') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'POLICY-GOV-004 successor policies require validated margin calibration.',
        path: ['margin_calibration_status'],
      });
    }
    const expectedMultiple = policy.product_family === 'WARIBA_INSTANT' ? '2.00' : '3.00';
    if (policy.gross_exposure_max_multiple !== expectedMultiple) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${policy.product_family} gross exposure must be ${expectedMultiple}x.`,
        path: ['gross_exposure_max_multiple'],
      });
    }
  });

export const v2EvaluationPolicyParametersSchema = evaluationOnePolicyParametersSchema
  .and(v2CommonSchema)
  .superRefine((policy, context) => {
    if (policy.account_phase !== 'evaluation') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'V2 Evaluation policy must declare account_phase=evaluation.',
        path: ['account_phase'],
      });
    }
    if (policy.product_family === 'WARIBA_INSTANT') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'WARIBA_INSTANT has no Evaluation phase.',
        path: ['product_family'],
      });
    }
  });

export const v2PerformancePolicyParametersSchema = performancePolicyParametersSchema
  .extend({
    payout_split_schedule: fiveRates,
  })
  .and(v2CommonSchema)
  .superRefine((policy, context) => {
    if (policy.account_phase !== 'performance') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'V2 Performance policy must declare account_phase=performance.',
        path: ['account_phase'],
      });
    }
  });

export type V2EvaluationPolicyParameters = z.infer<typeof v2EvaluationPolicyParametersSchema>;
export type V2PerformancePolicyParameters = z.infer<typeof v2PerformancePolicyParametersSchema>;

const payoutCapsByNominalBalance = {
  '5000.00': ['250', '250', '350', '350', '500'],
  '10000.00': ['400', '400', '600', '600', '800'],
  '25000.00': ['900', '900', '1250', '1250', '1750'],
  '50000.00': ['1500', '1500', '2200', '2200', '3000'],
  '100000.00': ['2500', '2500', '3500', '3500', '5000'],
} as const;

const evaluationBase = {
  contract_version: V2_POLICY_CONTRACT_VERSION,
  decision_record_id: V2_DECISION_RECORD_ID,
  account_phase: 'evaluation',
  recognized_profit: 'realized_net_profit_only',
  daily_loss_rate: '0.03',
  daily_loss_action: 'soft_lock',
  maximum_loss_model: 'eod_trailing',
  maximum_loss_floor_formula:
    'min(nominal_balance, max(previous_floor, highest_risk_adjusted_eod_balance - nominal_balance * maximum_loss_rate))',
  maximum_loss_floor_never_decreases: true,
  maximum_loss_locks_at_nominal: true,
  best_day_max_ratio: '0.35',
  best_day_breach_capable: false,
  minimum_trading_days: 0,
  qualified_days_required: null,
  overnight_allowed: true,
  weekend_allowed: true,
  news_allowed: true,
  activation_fee: '0',
  program_eligible_balance_enabled: true,
  minimum_profit_eligible_duration_ms: 60000,
  inactivity_warning_days: 21,
  inactivity_close_days: 30,
  payout_debit_risk_neutral: true,
  weekend_new_exposure_cutoff_minutes: 30,
  weekend_minimum_closure_minutes: 120,
  news_policy: 'evaluation_unrestricted',
  session_calendar_required: true,
  news_calendar_required: false,
  margin_calibration_status: 'validated',
  leverage_profile_status: 'candidate',
  candidate_margin_cap_rate: '0.20',
  leverage_by_asset_group: { FX: 50, METALS: 20, INDICES: 20, ENERGY: 10 },
} as const;

const performanceBase = {
  contract_version: V2_POLICY_CONTRACT_VERSION,
  decision_record_id: V2_DECISION_RECORD_ID,
  account_phase: 'performance',
  daily_loss_action: 'soft_lock',
  maximum_loss_model: 'eod_trailing',
  maximum_loss_floor_formula:
    'min(nominal_balance, max(previous_floor, highest_risk_adjusted_eod_balance - nominal_balance * maximum_loss_rate))',
  maximum_loss_floor_never_decreases: true,
  maximum_loss_locks_at_nominal: true,
  best_day_breach_capable: false,
  overnight_allowed: true,
  weekend_allowed: true,
  news_allowed: false,
  program_eligible_balance_enabled: true,
  minimum_profit_eligible_duration_ms: 60000,
  permanent_buffer_rate: '0.03',
  performance_day_threshold_rate: '0.005',
  performance_days_required_per_payout: 5,
  trader_split_rate_default: '0.80',
  trader_split_rate_final_cycle: '0.90',
  payout_split_schedule: ['0.80', '0.80', '0.85', '0.85', '0.90'],
  max_payout_cycles_before_review: 5,
  payout_caps_by_nominal_balance: payoutCapsByNominalBalance,
  inactivity_warning_days: 21,
  inactivity_close_days: 30,
  payout_debit_risk_neutral: true,
  weekend_new_exposure_cutoff_minutes: 30,
  weekend_minimum_closure_minutes: 120,
  news_policy: 'performance_high_impact_t2_reduce_close_only',
  session_calendar_required: true,
  news_calendar_required: true,
  margin_calibration_status: 'validated',
  leverage_profile_status: 'candidate',
} as const;

export const V2_POLICY_PARAMETERS = {
  oneEvaluation: v2EvaluationPolicyParametersSchema.parse({
    ...evaluationBase,
    product_family: 'WARIBA_ONE',
    profit_target_rate: '0.08',
    maximum_loss_rate: '0.08',
    gross_exposure_max_multiple: '3.00',
  }),
  flexEvaluation: v2EvaluationPolicyParametersSchema.parse({
    ...evaluationBase,
    product_family: 'WARIBA_FLEX',
    profit_target_rate: '0.04',
    maximum_loss_rate: '0.06',
    gross_exposure_max_multiple: '3.00',
    // The monetary obligation is versioned on the offer/order, not copied
    // into the risk policy. This legacy scalar therefore remains zero.
    activation_fee: '0',
  }),
  onePerformance: v2PerformancePolicyParametersSchema.parse({
    ...performanceBase,
    product_family: 'WARIBA_ONE',
    daily_loss_rate: '0.03',
    maximum_loss_rate: '0.08',
    best_day_max_ratio: '0.35',
    permanent_buffer_rate: '0.02',
    candidate_margin_cap_rate: '0.15',
    leverage_by_asset_group: { FX: 30, METALS: 15, INDICES: 10, ENERGY: 10 },
    gross_exposure_max_multiple: '3.00',
  }),
  flexPerformance: v2PerformancePolicyParametersSchema.parse({
    ...performanceBase,
    product_family: 'WARIBA_FLEX',
    daily_loss_rate: '0.03',
    maximum_loss_rate: '0.06',
    best_day_max_ratio: '0.35',
    candidate_margin_cap_rate: '0.15',
    leverage_by_asset_group: { FX: 30, METALS: 15, INDICES: 10, ENERGY: 10 },
    gross_exposure_max_multiple: '3.00',
  }),
  instantPerformance: v2PerformancePolicyParametersSchema.parse({
    ...performanceBase,
    product_family: 'WARIBA_INSTANT',
    daily_loss_rate: '0.02',
    maximum_loss_rate: '0.05',
    best_day_max_ratio: '0.30',
    candidate_margin_cap_rate: '0.10',
    leverage_by_asset_group: { FX: 30, METALS: 10, INDICES: 10, ENERGY: 5 },
    gross_exposure_max_multiple: '2.00',
  }),
} as const;

export type V2CapabilityReadiness = {
  ready: boolean;
  blockingReasonCodes: readonly string[];
};

/**
 * V2 activation is deliberately fail-closed. Candidate leverage values can
 * be stored and inspected, but the margin cap is not enforceable until its
 * calibration is explicitly validated. Performance additionally needs
 * versioned news and session calendars with available sources.
 */
export function evaluateV2CapabilityReadiness(params: {
  policy: V2EvaluationPolicyParameters | V2PerformancePolicyParameters;
  marginCalibrationValidated: boolean;
  sessionCalendarReady: boolean;
  newsCalendarReady: boolean;
  purchaseGateEnabled: boolean;
}): V2CapabilityReadiness {
  const blockingReasonCodes: string[] = [];
  if (!params.purchaseGateEnabled) blockingReasonCodes.push('V2_PURCHASE_GATE_DISABLED');
  if (!params.marginCalibrationValidated) {
    blockingReasonCodes.push('MARGIN_CALIBRATION_REQUIRED');
  }
  if (params.policy.session_calendar_required && !params.sessionCalendarReady) {
    blockingReasonCodes.push('MARKET_SESSION_CALENDAR_NOT_READY');
  }
  if (params.policy.news_calendar_required && !params.newsCalendarReady) {
    blockingReasonCodes.push('NEWS_CALENDAR_NOT_READY');
  }
  return { ready: blockingReasonCodes.length === 0, blockingReasonCodes };
}
