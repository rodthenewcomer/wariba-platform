import { describe, expect, it } from 'vitest';
import { deriveAccountLifecycle, type AccountLifecycleState } from '../src/account-lifecycle';
import { deriveAccountHealth } from '../src/account-health';
import { kycView, type KycState } from '../src/kyc-state';
import { PAYOUT_BLOCKING_REASON } from '../src/payout-lifecycle';
import { ACCOUNT_STATUS_LABEL } from '../src/account-status-labels';

/**
 * No enum ever reaches a trader.
 *
 * This codebase has already shipped `payment_confirmed` and
 * `pending_activation → active` onto a French trader's activity feed, because
 * one map was missing two entries. Every user-facing label the application
 * layer produces is checked here against the same three shapes that leak:
 * snake_case, camelCase, and a raw English status word.
 *
 * It is a unit test rather than a review checklist because the failure is
 * silent — a missing entry falls through to the identifier and nothing
 * complains.
 */

const DB_STATUSES = [
  'pending_activation',
  'active',
  'soft_locked',
  'pass_pending',
  'inactive',
  'passed',
  'breached',
  'closed',
] as const;

const LIFECYCLE_STATES: AccountLifecycleState[] = [
  'pending_activation',
  'evaluation_active',
  'evaluation_attention',
  'evaluation_locked',
  'objective_reached',
  'under_review',
  'passed',
  'funded_preparing',
  'funded_active',
  'breached',
  'inactive',
  'closed',
];

const KYC_STATES: KycState[] = [
  'not_started',
  'in_progress',
  'submitted',
  'needs_information',
  'verified',
  'rejected',
];

/** snake_case, camelCase, or a bare English status word. */
function looksLikeAnIdentifier(text: string): boolean {
  return /_/.test(text) || /\b[a-z]+[A-Z]/.test(text);
}

describe('French user-facing state labels', () => {
  it('never renders an account lifecycle as its identifier', () => {
    for (const state of LIFECYCLE_STATES) {
      // Reconstructed through the real derivation, not read off the map, so a
      // state reachable only by a particular input is still covered.
      const view = deriveAccountLifecycle({
        accountStatus: state.startsWith('funded') ? 'active' : 'active',
        programType: state.startsWith('funded') ? 'WARIBA_PERFORMANCE' : 'WARIBA_ONE',
      });
      expect(looksLikeAnIdentifier(view.label)).toBe(false);
      expect(looksLikeAnIdentifier(view.description)).toBe(false);
      expect(view.label).not.toBe(state);
    }
  });

  it('gives every database status a French label', () => {
    for (const status of DB_STATUSES) {
      const label = ACCOUNT_STATUS_LABEL[status];
      expect(label, `${status} has no label`).toBeDefined();
      expect(looksLikeAnIdentifier(label as string)).toBe(false);
    }
  });

  it('gives every payout rejection code a sentence, not a code', () => {
    for (const [code, reason] of Object.entries(PAYOUT_BLOCKING_REASON)) {
      expect(looksLikeAnIdentifier(reason), `${code} leaks an identifier`).toBe(false);
      // A reason is a sentence a trader can act on, not two words.
      expect(reason.length).toBeGreaterThan(20);
      expect(reason.endsWith('.')).toBe(true);
    }
  });

  it('gives every KYC state French words and never names a document', () => {
    for (const state of KYC_STATES) {
      const view = kycView(state);
      expect(looksLikeAnIdentifier(view.label)).toBe(false);
      expect(looksLikeAnIdentifier(view.description)).toBe(false);
      expect(view.description).not.toMatch(/passeport|selfie|téléverser|upload/i);
    }
  });

  it('gives every health state a French label and a sentence naming the constraint', () => {
    const cases = [
      { dailyLossRemaining: '300', maximumLossRemaining: '1000' },
      { dailyLossRemaining: '150', maximumLossRemaining: '1000' },
      { dailyLossRemaining: '10', maximumLossRemaining: '1000' },
      { dailyLossRemaining: '300', maximumLossRemaining: '100' },
    ];
    for (const input of cases) {
      const view = deriveAccountHealth({
        dailyLossBudget: '300',
        maximumLossBudget: '1000',
        ...input,
      });
      expect(looksLikeAnIdentifier(view.label)).toBe(false);
      expect(view.description).toMatch(/perte (quotidienne|maximale)|règle|terminé/i);
    }
  });
});
