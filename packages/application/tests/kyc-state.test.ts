import { describe, expect, it } from 'vitest';
import {
  deriveKycState,
  kycView,
  reachableKycStates,
  KYC_PROVIDER_INTEGRATED,
} from '../src/kyc-state';

describe('KYC state', () => {
  it('derives from the account flag when no case exists', () => {
    expect(deriveKycState({ verified: true })).toBe('verified');
    expect(deriveKycState({ verified: false })).toBe('not_started');
  });

  /**
   * Phase 3.3.2 B1 — the contradiction this closes.
   *
   * A trader whose file was already `under_review` used to be told
   * "Vérification requise" and, further down the same page, to contact support
   * to trigger the verification support had already started. The case is a row
   * this deployment really writes, so the state has to read it.
   */
  it('reads the open case rather than the account flag alone', () => {
    expect(deriveKycState({ verified: false, reviewStatus: 'requested' })).toBe('submitted');
    expect(deriveKycState({ verified: false, reviewStatus: 'under_review' })).toBe('submitted');
    expect(deriveKycState({ verified: false, reviewStatus: 'needs_information' })).toBe(
      'needs_information',
    );
    expect(deriveKycState({ verified: false, reviewStatus: 'unable_to_verify' })).toBe('rejected');
  });

  it('lets a closed case fall back to the account flag', () => {
    expect(deriveKycState({ verified: false, reviewStatus: 'closed' })).toBe('not_started');
    expect(deriveKycState({ verified: true, reviewStatus: 'closed' })).toBe('verified');
  });

  it('never contradicts a recorded verification', () => {
    for (const reviewStatus of ['requested', 'under_review', 'needs_information'] as const) {
      expect(deriveKycState({ verified: true, reviewStatus })).toBe('verified');
    }
  });

  /**
   * The union is still the contract an external provider will fill, and the
   * assertion still exists to stop the UI being built around states nothing
   * produces. It was widened in Phase 3.3.2 because the private-beta identity
   * queue landed in Phase 3.3 and now really writes these rows — `in_progress`
   * stays out, because nothing resumes a partially-completed capture.
   */
  it('reaches only states produced by the private-beta manual workflow', () => {
    expect(reachableKycStates()).toEqual([
      'not_started',
      'submitted',
      'needs_information',
      'verified',
      'rejected',
    ]);
    expect(reachableKycStates()).not.toContain('in_progress');
    expect(KYC_PROVIDER_INTEGRATED).toBe(false);
  });

  it('never asks for documents the platform cannot receive', () => {
    for (const state of reachableKycStates()) {
      expect(kycView(state).description).not.toMatch(/document|pièce|selfie|passeport/i);
    }
    expect(kycView('not_started').actionable).toBe(true);
  });

  it('stops offering an action once the trader is waiting on someone else', () => {
    expect(kycView('submitted').actionable).toBe(false);
    expect(kycView('verified').actionable).toBe(false);
    expect(kycView('needs_information').actionable).toBe(true);
  });
});
