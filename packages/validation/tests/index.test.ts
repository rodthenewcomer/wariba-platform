import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/validation scaffold', () => {
  it('exposes its package identity (placeholder until introduced incrementally alongside the first real API boundary (Prompt 03))', () => {
    expect(PACKAGE_NAME).toBe('@wariba/validation');
  });
});
