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
  resolveProfitEligibilityPolicy,
  type ProfitEligibilityPolicyControl,
  type ProfitEligibilitySourceParameters,
} from './profit-eligibility-policy';
export {
  evaluateAccountRisk,
  type EvaluateAccountRiskParams,
  type RiskEngineResult,
  type RiskViolation,
  type RiskRuleCode,
  type DailySnapshotInput,
  type RiskPolicyParameters,
} from './risk-engine';
