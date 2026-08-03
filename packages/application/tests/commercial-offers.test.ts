import { describe, expect, it } from 'vitest';
import { SANDBOX_PRODUCT_FEATURE_FLAGS, isSandboxProductFeatureEnabled } from '../src/commerce';

describe('OFFER-023 sandbox product feature flags', () => {
  it('keeps every gated WARIBA ONE size enabled independently', () => {
    expect(SANDBOX_PRODUCT_FEATURE_FLAGS).toEqual({
      product_25k_enabled: true,
      product_50k_enabled: true,
      product_100k_enabled: true,
    });
    expect(isSandboxProductFeatureEnabled(null)).toBe(true);
    expect(isSandboxProductFeatureEnabled('product_25k_enabled')).toBe(true);
    expect(isSandboxProductFeatureEnabled('product_50k_enabled')).toBe(true);
    expect(isSandboxProductFeatureEnabled('product_100k_enabled')).toBe(true);
    expect(isSandboxProductFeatureEnabled('unknown_product')).toBe(false);
  });
});
