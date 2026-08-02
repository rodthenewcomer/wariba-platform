import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/test-utils scaffold', () => {
  it('exposes its package identity (placeholder until introduced alongside the first tests that need deterministic fixtures (Prompt 03+))', () => {
    expect(PACKAGE_NAME).toBe('@wariba/test-utils');
  });
});
