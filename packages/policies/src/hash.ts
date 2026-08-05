import { createHash } from 'node:crypto';

/**
 * Prompt 05 "POLICY PIPELINE" step 4 — deterministic machine hash of a
 * policy's parameters, so an account's pinned `policy_version_id` can be
 * verified against tampering/drift without re-parsing the human Rulebook
 * ("Ne pas parser le Markdown en production" — Prompt 05 stop condition).
 *
 * Canonicalization: recursively sort object keys, no whitespace, then
 * sha256 the UTF-8 bytes. This is a fresh, explicit contract — the
 * Legacy rows can still carry pre-pipeline placeholder hashes. Every newly
 * published policy must store the output of this function exactly.
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
