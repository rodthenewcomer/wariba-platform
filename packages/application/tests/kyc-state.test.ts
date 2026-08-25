import { describe, expect, it } from 'vitest';
import {
  deriveKycState,
  kycView,
  reachableKycStates,
  KYC_PROVIDER_INTEGRATED,
} from '../src/kyc-state';

describe('KYC state', () => {
  it('derives only from the one fact the platform holds', () => {
    expect(deriveKycState({ verified: true })).toBe('verified');
    expect(deriveKycState({ verified: false })).toBe('not_started');
  });

  /**
   * The union is the contract an external provider will fill. This asserts the
   * product does not pretend those intermediate states already happen — there
   * is no document upload, so nothing can be "submitted".
   */
  it('reaches only states produced by the private-beta manual workflow', () => {
    expect(reachableKycStates()).toEqual(['not_started', 'verified']);
    expect(KYC_PROVIDER_INTEGRATED).toBe(false);
  });

  it('never asks for documents the platform cannot receive', () => {
    const view = kycView('not_started');
    expect(view.description).not.toMatch(/document|pièce|selfie|passeport/i);
    expect(view.actionable).toBe(true);
  });

  it('stops offering an action once the trader is waiting on someone else', () => {
    expect(kycView('submitted').actionable).toBe(false);
    expect(kycView('verified').actionable).toBe(false);
    expect(kycView('needs_information').actionable).toBe(true);
  });
});
