import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/design-tokens scaffold', () => {
  it('exposes its package identity (placeholder until Prompt 02 — Design System & App Shell)', () => {
    expect(PACKAGE_NAME).toBe('@wariba/design-tokens');
  });
});
