/**
 * What each identity-review action must be able to point at.
 *
 * Pure by construction — no database import anywhere in this module's graph —
 * so the Control form and the command it submits to read the same contract
 * instead of each carrying their own copy of it. That mattered: the form
 * already required a reference for a positive verification while the command
 * accepted one without, so the rule lived in the half a browser can change.
 */
export type IdentityDecisionStatus =
  'under_review' | 'needs_information' | 'verified' | 'unable_to_verify';

export type IdentityEvidenceRequirement = 'optional' | 'required' | 'required_or_detailed_reason';

export class IdentityEvidenceError extends Error {
  override readonly name = 'IdentityEvidenceError';
}

/** A reason short enough to be a shrug is not a reason a reviewer can audit later. */
const DETAILED_REASON_MIN_LENGTH = 40;

/**
 * Phase 3.3.2 B2 — what each identity action must be able to point at.
 *
 * Advancing a case or asking the trader for more information changes nothing
 * about who the trader is, so neither needs an external reference. Recording a
 * verification does: it sets `trading_accounts.kyc_sandbox_verified`, the flag
 * every payout gate reads. A positive verification with no provenance is an
 * assertion no later reviewer, auditor or dispute can check. A refusal may
 * stand on a specific written reason instead, because the refusal itself is
 * the record — but "non conforme" is not one.
 */
export function identityEvidenceRequirement(
  nextStatus: IdentityDecisionStatus,
): IdentityEvidenceRequirement {
  switch (nextStatus) {
    case 'under_review':
    case 'needs_information':
      return 'optional';
    case 'verified':
      return 'required';
    case 'unable_to_verify':
      return 'required_or_detailed_reason';
  }
}

export function assertIdentityEvidenceSufficient(params: {
  nextStatus: IdentityDecisionStatus;
  decisionReason: string;
  evidenceReference?: string | undefined;
}): void {
  const requirement = identityEvidenceRequirement(params.nextStatus);
  if (requirement === 'optional') return;
  const reference = params.evidenceReference?.trim() ?? '';
  if (reference.length > 0) return;
  if (
    requirement === 'required_or_detailed_reason' &&
    params.decisionReason.trim().length >= DETAILED_REASON_MIN_LENGTH
  ) {
    return;
  }
  throw new IdentityEvidenceError(
    requirement === 'required'
      ? 'Une vérification positive exige une référence externe : sans provenance, la décision ne peut pas être auditée.'
      : `Un refus exige une référence externe ou un motif d’au moins ${DETAILED_REASON_MIN_LENGTH} caractères.`,
  );
}
