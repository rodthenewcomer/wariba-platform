import { computeMachineHash } from './hash';
import {
  evaluationOnePolicyParametersSchema,
  performancePolicyParametersSchema,
  policyVersionRowSchema,
  type EvaluationOnePolicyParameters,
  type PerformancePolicyParameters,
} from './schema';

export interface LoadedPolicy {
  id: string;
  program: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE';
  semanticVersion: string;
  parameters: EvaluationOnePolicyParameters | PerformancePolicyParameters;
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

  const parameters =
    parsedRow.program === 'WARIBA_ONE'
      ? evaluationOnePolicyParametersSchema.parse(parsedRow.parameters_json)
      : performancePolicyParametersSchema.parse(parsedRow.parameters_json);
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
    semanticVersion: parsedRow.semantic_version,
    parameters,
    machineHash,
    storedMachineHash: parsedRow.machine_hash,
    hashVerified,
  };
}
