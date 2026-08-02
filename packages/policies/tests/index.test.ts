import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/policies scaffold', () => {
  it('exposes its package identity (placeholder until Prompt 05 — Policy, Risk & Evaluation)', () => {
    expect(PACKAGE_NAME).toBe('@wariba/policies');
  });
});
