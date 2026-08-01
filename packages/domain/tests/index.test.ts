import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/domain scaffold', () => {
  it('exposes its package identity (placeholder until Prompts 03-08 — identity, commerce, trading, policy-risk, performance-payout modules)', () => {
    expect(PACKAGE_NAME).toBe('@wariba/domain');
  });
});
