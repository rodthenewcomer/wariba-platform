import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/database scaffold', () => {
  it('exposes its package identity (placeholder until Prompt 03 onward — first real tables/migrations land with Identity & Commerce)', () => {
    expect(PACKAGE_NAME).toBe('@wariba/database');
  });
});
