import { describe, expect, it } from 'vitest';
import {
  assertIdentityEvidenceSufficient,
  identityEvidenceRequirement,
  IdentityEvidenceError,
} from '../src/identity-evidence';

/**
 * Phase 3.3.2 B2 — provenance is required where the decision creates a fact.
 *
 * Moving a case along and asking the trader for more information change
 * nothing about who the trader is, so neither needs an external reference.
 * Recording a positive verification does: it flips
 * `trading_accounts.kyc_sandbox_verified`, which is the fact every payout gate
 * reads. A verification with no provenance is an assertion nobody can audit.
 */
describe('identity evidence contract', () => {
  it('leaves the working actions optional', () => {
    expect(identityEvidenceRequirement('under_review')).toBe('optional');
    expect(identityEvidenceRequirement('needs_information')).toBe('optional');
  });

  it('requires provenance for a positive verification', () => {
    expect(identityEvidenceRequirement('verified')).toBe('required');
  });

  it('requires provenance or a specific reason for a refusal', () => {
    expect(identityEvidenceRequirement('unable_to_verify')).toBe('required_or_detailed_reason');
  });

  it('accepts a working action with no reference at all', () => {
    expect(() =>
      assertIdentityEvidenceSufficient({
        nextStatus: 'under_review',
        decisionReason: 'Prise en charge du dossier.',
      }),
    ).not.toThrow();
  });

  it('refuses a verification with no reference', () => {
    expect(() =>
      assertIdentityEvidenceSufficient({
        nextStatus: 'verified',
        decisionReason: 'Le dossier est conforme aux exigences de la bêta privée.',
      }),
    ).toThrow(IdentityEvidenceError);
  });

  it('refuses a verification whose reference is only whitespace', () => {
    expect(() =>
      assertIdentityEvidenceSufficient({
        nextStatus: 'verified',
        decisionReason: 'Le dossier est conforme aux exigences de la bêta privée.',
        evidenceReference: '   ',
      }),
    ).toThrow(IdentityEvidenceError);
  });

  it('accepts a verification carrying a reference', () => {
    expect(() =>
      assertIdentityEvidenceSufficient({
        nextStatus: 'verified',
        decisionReason: 'Le dossier est conforme aux exigences de la bêta privée.',
        evidenceReference: 'OPS-2026-08-25-114',
      }),
    ).not.toThrow();
  });

  it('accepts a refusal justified by a detailed reason instead of a reference', () => {
    expect(() =>
      assertIdentityEvidenceSufficient({
        nextStatus: 'unable_to_verify',
        decisionReason:
          'Le nom déclaré ne correspond pas au titulaire du compte et le trader n’a pas répondu sous 14 jours.',
      }),
    ).not.toThrow();
  });

  it('refuses a refusal with neither a reference nor a specific reason', () => {
    expect(() =>
      assertIdentityEvidenceSufficient({
        nextStatus: 'unable_to_verify',
        decisionReason: 'Non conforme.',
      }),
    ).toThrow(IdentityEvidenceError);
  });
});
