import { createHash } from 'node:crypto';

/**
 * Prompt 05 "POLICY PIPELINE" step 4 — deterministic machine hash of a
 * policy's parameters, so an account's pinned `policy_version_id` can be
 * verified against tampering/drift without re-parsing the human Rulebook
 * ("Ne pas parser le Markdown en production" — Prompt 05 stop condition).
 *
 * Canonicalization: recursively sort object keys, no whitespace, then
 * sha256 the UTF-8 bytes. This is a fresh, explicit contract — the
 * `machine_hash` value seeded by
 * supabase/migrations/20260804000007_policy_symbol_specs_v1_1.sql does not
 * reproduce under this (or any other canonicalization attempted during
 * design); it is a placeholder and gets recomputed by a follow-up migration
 * once this function exists, not treated as ground truth here.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

export function computeMachineHash(parameters: unknown): string {
  const canonicalJson = JSON.stringify(canonicalize(parameters));
  const digest = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  return `sha256:${digest}`;
}
