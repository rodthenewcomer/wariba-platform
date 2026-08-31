import { computeMachineHash } from './hash';
import {
  evaluationOnePolicyParametersSchema,
  performancePolicyParametersSchema,
  policyVersionRowSchema,
  type EvaluationOnePolicyParameters,
  type PerformancePolicyParameters,
} from './schema';
import {
  V2_POLICY_CONTRACT_VERSION,
  v2EvaluationPolicyParametersSchema,
  v2PerformancePolicyParametersSchema,
  type AccountPhase,
  type ProductFamily,
  type V2EvaluationPolicyParameters,
  type V2PerformancePolicyParameters,
} from './v2';

export interface LoadedPolicy {
  id: string;
  program: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_PERFORMANCE';
  productFamily: ProductFamily;
  accountPhase: AccountPhase;
  semanticVersion: string;
  parameters:
    | EvaluationOnePolicyParameters
    | PerformancePolicyParameters
    | V2EvaluationPolicyParameters
    | V2PerformancePolicyParameters;
  /** Freshly computed from the parsed parameters — always trustworthy. */
  machineHash: string;
  /** Whatever is stored on the row — may be a stale/placeholder value; compare against machineHash. */
  storedMachineHash: string | null;
  hashVerified: boolean;
}

/**
 * Prompt 05 "POLICY PIPELINE" (extended by Prompt 08 for WARIBA_PERFORMANCE)
 * — parses and type-checks an `app.policy_versions` row already fetched by
 * the caller (this function is pure; it does not query the database
 * itself). Dispatches on `program` to the matching parameters schema —
 * callers that need program-specific fields must narrow on
 * `loadedPolicy.program` themselves (see packages/database/src/risk-engine
 * callers, which only ever touch the shared risk-relevant subset and don't
 * need to narrow).
 *
 * `strict: true` throws on a machine_hash mismatch. Defaults to non-strict
 * for callers (tooling, one-off scripts) that only need `hashVerified` as an
 * informational flag rather than a hard failure — every production call site
 * must pass `strict: true` (supabase/migrations/20260805000001_backfill_policy_machine_hash.sql
 * backfilled the real hash for every seeded row so this can never spuriously
 * throw against known-good data).
 */
export function parseAndVerifyPolicy(row: unknown, opts?: { strict?: boolean }): LoadedPolicy {
  const parsedRow = policyVersionRowSchema.parse(row);
  const rawParameters = parsedRow.parameters_json as { contract_version?: unknown };
  const isV2 = rawParameters.contract_version === V2_POLICY_CONTRACT_VERSION;
  let parameters:
    | EvaluationOnePolicyParameters
    | PerformancePolicyParameters
    | V2EvaluationPolicyParameters
    | V2PerformancePolicyParameters;
  let productFamily: ProductFamily;
  let accountPhase: AccountPhase;
  if (isV2) {
    const v2Parameters =
      parsedRow.account_phase === 'evaluation'
        ? v2EvaluationPolicyParametersSchema.parse(parsedRow.parameters_json)
        : v2PerformancePolicyParametersSchema.parse(parsedRow.parameters_json);
    parameters = v2Parameters;
    productFamily = v2Parameters.product_family;
    accountPhase = v2Parameters.account_phase;
  } else {
    parameters =
      parsedRow.program === 'WARIBA_ONE'
        ? evaluationOnePolicyParametersSchema.parse(parsedRow.parameters_json)
        : performancePolicyParametersSchema.parse(parsedRow.parameters_json);
    productFamily = parsedRow.product_family ?? 'WARIBA_ONE';
    accountPhase =
      parsedRow.account_phase ??
      (parsedRow.program === 'WARIBA_PERFORMANCE' ? 'performance' : 'evaluation');
  }

  if (isV2 && parsedRow.product_family !== productFamily) {
    throw new Error(`Policy ${parsedRow.id} row/product family mismatch.`);
  }
  if (isV2 && parsedRow.account_phase !== accountPhase) {
    throw new Error(`Policy ${parsedRow.id} row/account phase mismatch.`);
  }
  const machineHash = computeMachineHash(parameters);
  const hashVerified = parsedRow.machine_hash === machineHash;

  if (opts?.strict && !hashVerified) {
    throw new Error(
      `parseAndVerifyPolicy: machine_hash mismatch for policy ${parsedRow.id} ` +
        `(${parsedRow.program} v${parsedRow.semantic_version}) — ` +
        `stored=${parsedRow.machine_hash ?? 'null'} computed=${machineHash}`,
    );
  }

  return {
    id: parsedRow.id,
    program: parsedRow.program,
    productFamily,
    accountPhase,
    semanticVersion: parsedRow.semantic_version,
    parameters,
    machineHash,
    storedMachineHash: parsedRow.machine_hash,
    hashVerified,
  };
}
