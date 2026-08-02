import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@wariba/contracts scaffold', () => {
  it('exposes its package identity (placeholder until Prompt 03/04 — first real HTTP/WebSocket/event contracts land with Commerce and Trading Core)', () => {
    expect(PACKAGE_NAME).toBe('@wariba/contracts');
  });
});
