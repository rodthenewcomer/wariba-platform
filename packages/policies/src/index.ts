/**
 * @wariba/policies — Policy version schemas, loaders, validators, hashing,
 * and the WARIBA ONE risk evaluation engine.
 *
 * Scaffolded in Prompt 01 (Repository Foundation); real implementation lands
 * in Prompt 05 (Policy, Risk & Evaluation). See WARIBA_Prompt_Pack_v1.0.md §8
 * and WARIBA_System_Architecture_v1.0.md §10.
 */

export const PACKAGE_NAME = '@wariba/policies';

export {
  evaluationOnePolicyParametersSchema,
  performancePolicyParametersSchema,
  policyVersionRowSchema,
  type EvaluationOnePolicyParameters,
  type PerformancePolicyParameters,
  type PolicyVersionRow,
} from './schema';
export { computeMachineHash } from './hash';
export { parseAndVerifyPolicy, type LoadedPolicy } from './loader';
export {
  V2_POLICY_CONTRACT_VERSION,
  V2_DECISION_RECORD_ID,
  V2_POLICY_PARAMETERS,
  productFamilySchema,
  accountPhaseSchema,
  v2EvaluationPolicyParametersSchema,
  v2PerformancePolicyParametersSchema,
  evaluateV2CapabilityReadiness,
  type ProductFamily,
  type AccountPhase,
  type V2EvaluationPolicyParameters,
  type V2PerformancePolicyParameters,
  type V2CapabilityReadiness,
} from './v2';
export {
  resolveProfitEligibilityPolicy,
  type ProfitEligibilityPolicyControl,
  type ProfitEligibilitySourceParameters,
} from './profit-eligibility-policy';
export {
  CANONICAL_REASON_CODES,
  EXPOSURE_REASON_CODES,
  LEGACY_REASON_CODE_ALIASES,
  LIFECYCLE_REASON_CODES,
  PAYOUT_REASON_CODES,
  RISK_REASON_CODES,
  resolveCanonicalReasonCode,
  type CanonicalReasonCode,
} from './reason-codes';
export {
  evaluateAccountRisk,
  resolveRuleDailyProfit,
  type EvaluateAccountRiskParams,
  type RiskEngineResult,
  type RiskViolation,
  type RiskRuleCode,
  type DailySnapshotInput,
  type RiskPolicyParameters,
} from './risk-engine';
