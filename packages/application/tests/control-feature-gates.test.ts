import { describe, expect, it } from 'vitest';
import { SANDBOX_PRODUCT_FEATURE_FLAGS } from '../src/commerce';
import {
  evaluateCommercialGate,
  resolveFeatureFlagState,
  FEATURE_FLAG_STATE_SOURCE,
  FOUNDER_COHORT_GATE_IMPLEMENTED,
} from '../src/control-feature-gates';

/**
 * Prompt 09 milestone 5 — feature-gate honesty.
 *
 * The failure this guards against is small and very easy to ship: rendering
 * a green "Enabled" badge because `feature_flag_key` is not null. A flag key
 * is an identifier. Whether a product is purchasable is a different question
 * with a different, canonical answer — and a second, genuinely runtime
 * input (the reserve zone) that the key knows nothing about.
 */
describe('resolveFeatureFlagState', () => {
  it('reports a version with no key as not gated, not as disabled', () => {
    expect(resolveFeatureFlagState(null)).toEqual({ kind: 'not_gated' });
  });

  it('reports a key the canonical map defines, with its value', () => {
    expect(resolveFeatureFlagState('product_25k_enabled')).toEqual({
      kind: 'known',
      enabled: SANDBOX_PRODUCT_FEATURE_FLAGS.product_25k_enabled,
    });
  });

  it('distinguishes an unrecognised key from a deliberate off', () => {
    // The resolver fails closed on an unknown key, which is right — but
    // "nobody defined this" and "someone turned this off" are different
    // facts and an operator must be able to tell them apart.
    expect(resolveFeatureFlagState('product_500k_enabled')).toEqual({ kind: 'unknown_key' });
  });

  it('names the canonical source rather than leaving it implicit', () => {
    expect(FEATURE_FLAG_STATE_SOURCE).toContain('SANDBOX_PRODUCT_FEATURE_FLAGS');
    expect(FEATURE_FLAG_STATE_SOURCE).toContain('commerce.ts');
  });
});

describe('evaluateCommercialGate', () => {
  it('never treats a flag key as proof of availability on its own', () => {
    // Key present, canonical map says nothing about it: not available.
    const unknown = evaluateCommercialGate({
      featureFlagKey: 'product_unknown_enabled',
      productCode: '25K',
      zone: 'normal',
    });
    expect(unknown.flagAllows).toBe(false);
    expect(unknown.commerciallyAvailable).toBe(false);
  });

  it('keeps the flag half and the reserve half separate', () => {
    const defensive = evaluateCommercialGate({
      featureFlagKey: 'product_100k_enabled',
      productCode: '100K',
      zone: 'defensive',
    });
    // The flag is on; the reserve zone is what suppresses this size. An
    // operator reading a single merged verdict could not tell which lever
    // to pull.
    expect(defensive.flagAllows).toBe(true);
    expect(defensive.zoneAllows).toBe(false);
    expect(defensive.commerciallyAvailable).toBe(false);
  });

  it('suppresses every size in the critical zone regardless of flags', () => {
    for (const productCode of ['5K', '10K', '25K', '50K', '100K'] as const) {
      const gate = evaluateCommercialGate({
        featureFlagKey: null,
        productCode,
        zone: 'critical',
      });
      expect(gate.flagAllows).toBe(true);
      expect(gate.zoneAllows).toBe(false);
      expect(gate.commerciallyAvailable).toBe(false);
    }
  });

  it('allows an ungated size in a normal zone', () => {
    const gate = evaluateCommercialGate({
      featureFlagKey: null,
      productCode: '5K',
      zone: 'normal',
    });
    expect(gate.commerciallyAvailable).toBe(true);
  });

  it('leaves the prudence zone selling normally', () => {
    // PRUDENCE tightens promotion and review cadence, not availability.
    const gate = evaluateCommercialGate({
      featureFlagKey: 'product_50k_enabled',
      productCode: '50K',
      zone: 'prudence',
    });
    expect(gate.commerciallyAvailable).toBe(true);
  });
});

describe('founder pricing', () => {
  it('states that no cohort gate exists', () => {
    // RULESET commercial_constraints.founder_price_must_have_real_cohort.
    // Showing a founder price without this would imply a working programme.
    expect(FOUNDER_COHORT_GATE_IMPLEMENTED).toBe(false);
  });
});
