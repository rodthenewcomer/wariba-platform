import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/adapters scaffold', () => {
  it('exposes its package identity (placeholder until Prompt 03/04 — sandbox Payment/MarketData adapters)', () => {
    expect(PACKAGE_NAME).toBe('@wariba/adapters');
  });
});
