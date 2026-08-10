'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  approvePayoutRequest,
  rejectPayoutRequest,
  submitPayoutRequest,
  settlePayoutRequest,
  reversePayoutRequest,
  setPerformanceComplianceFlags,
  authorizeSensitiveStaffAction,
} from '@wariba/application';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { loadWebConfig } from '../../../../lib/config';

export interface PayoutActionResult {
  error?: string;
}

/**
 * Every action re-checks the staff role itself — a Server Action is a
 * directly callable endpoint (not gated by the page having already checked
 * requireStaffRole), so the page's own check is UX only, never the real
 * authorization boundary. Same reasoning as (auth)/actions.ts's Server
 * Actions each doing their own validation rather than trusting the caller.
 */
export async function approvePayoutAction(payoutRequestId: string): Promise<PayoutActionResult> {
  const session = await requireStaffRole('finance');
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'payout.approve',
    });
    await approvePayoutRequest(getDb(), {
      payoutRequestId,
      staffUserId: session.userId,
      staffRole: session.role,
      correlationId: randomUUID(),
      providerName: loadWebConfig().PAYOUT_PROVIDER,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Échec de l’approbation.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function rejectPayoutAction(
  payoutRequestId: string,
  reason: string,
): Promise<PayoutActionResult> {
  const session = await requireStaffRole('finance');
  if (reason.trim().length === 0) {
    return { error: 'Un motif de refus est requis.' };
  }
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'payout.reject',
    });
    await rejectPayoutRequest(getDb(), {
      payoutRequestId,
      staffUserId: session.userId,
      staffRole: session.role,
      correlationId: randomUUID(),
      reason: reason.trim(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Échec du refus.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function settlePayoutAction(payoutRequestId: string): Promise<PayoutActionResult> {
  const session = await requireStaffRole('finance');
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'payout.settle',
    });
    await settlePayoutRequest(getDb(), {
      payoutRequestId,
      staffUserId: session.userId,
      staffRole: session.role,
      correlationId: randomUUID(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Échec du règlement.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function reversePayoutAction(
  payoutRequestId: string,
  reason: string,
  evidence: string,
): Promise<PayoutActionResult> {
  const session = await requireStaffRole('finance');
  if (!reason.trim()) return { error: 'Un motif de reversal est requis.' };
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'payout.reverse',
      limit: 5,
    });
    await reversePayoutRequest(getDb(), {
      payoutRequestId,
      staffUserId: session.userId,
      staffRole: session.role,
      reason: reason.trim(),
      evidence: { operatorEvidence: evidence.trim() },
      correlationId: randomUUID(),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Échec du reversal.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function submitPayoutAction(payoutRequestId: string): Promise<PayoutActionResult> {
  const session = await requireStaffRole('finance');
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'payout.approve',
    });
    await submitPayoutRequest(getDb(), {
      payoutRequestId,
      providerName: loadWebConfig().PAYOUT_PROVIDER,
      staffUserId: session.userId,
      staffRole: session.role,
      correlationId: randomUUID(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Échec de la soumission.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function setKycVerifiedAction(
  accountId: string,
  verified: boolean,
): Promise<PayoutActionResult> {
  const session = await requireStaffRole('compliance');
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'sandbox_kyc.modify',
    });
    await setPerformanceComplianceFlags(getDb(), {
      accountId,
      kycVerified: verified,
      staffUserId: session.userId,
      staffRole: session.role,
      correlationId: randomUUID(),
      reason: verified ? 'Sandbox KYC verified in Control' : 'Sandbox KYC revoked in Control',
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Échec de la mise à jour KYC.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function setPayoutMethodConfiguredAction(
  accountId: string,
  configured: boolean,
): Promise<PayoutActionResult> {
  const session = await requireStaffRole('compliance');
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'payout_method.modify',
    });
    await setPerformanceComplianceFlags(getDb(), {
      accountId,
      payoutMethodConfigured: configured,
      staffUserId: session.userId,
      staffRole: session.role,
      correlationId: randomUUID(),
      reason: configured
        ? 'Sandbox payout method configured in Control'
        : 'Sandbox payout method removed in Control',
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Échec de la mise à jour du moyen de paiement.',
    };
  }
  revalidatePath('/control/payouts');
  return {};
}
