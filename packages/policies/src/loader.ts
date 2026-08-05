import { computeMachineHash } from './hash';
import {
  evaluationOnePolicyParametersSchema,
  policyVersionRowSchema,
  type EvaluationOnePolicyParameters,
} from './schema';

export interface LoadedPolicy {
  id: string;
  program: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE';
  semanticVersion: string;
  parameters: EvaluationOnePolicyParameters;
  /** Freshly computed from the parsed parameters — always trustworthy. */
  machineHash: string;
  /** Whatever is stored on the row — may be a stale/placeholder value; compare against machineHash. */
  storedMachineHash: string | null;
  hashVerified: boolean;
}

/**
 * Prompt 05 "POLICY PIPELINE" — parses and type-checks an
 * `app.policy_versions` row already fetched by the caller (this function is
 * pure; it does not query the database itself). Only `WARIBA_ONE` has a
 * published schema today — `WARIBA_PERFORMANCE` throws a clear error rather
 * than validating a guessed shape, since no such row has been seeded yet.
 *
 * `strict: true` throws on a machine_hash mismatch. Defaults to non-strict
 * because the seeded v1.1.0 row's `machine_hash` is a known legacy placeholder
 * (see hash.ts) until the backfill migration lands — callers that need a
 * verified hash should pass `strict: true` and check `hashVerified`
 * otherwise.
 */
export function parseAndVerifyPolicy(row: unknown, opts?: { strict?: boolean }): LoadedPolicy {
  const parsedRow = policyVersionRowSchema.parse(row);

  if (parsedRow.program !== 'WARIBA_ONE') {
    throw new Error(
      `parseAndVerifyPolicy: no parameters schema implemented yet for program "${parsedRow.program}"`,
    );
  }

  const parameters = evaluationOnePolicyParametersSchema.parse(parsedRow.parameters_json);
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
