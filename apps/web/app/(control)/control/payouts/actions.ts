'use server';

import { revalidatePath } from 'next/cache';
import {
  approvePayoutRequest,
  rejectPayoutRequest,
  settlePayoutRequest,
  setPerformanceComplianceFlags,
} from '@wariba/application';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

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
    await approvePayoutRequest(getDb(), { payoutRequestId, staffUserId: session.userId });
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
    await rejectPayoutRequest(getDb(), {
      payoutRequestId,
      staffUserId: session.userId,
      reason: reason.trim(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Échec du refus.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function settlePayoutAction(payoutRequestId: string): Promise<PayoutActionResult> {
  await requireStaffRole('finance');
  try {
    await settlePayoutRequest(getDb(), { payoutRequestId });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Échec du règlement.' };
  }
  revalidatePath('/control/payouts');
  return {};
}

export async function setKycVerifiedAction(
  accountId: string,
  verified: boolean,
): Promise<PayoutActionResult> {
  await requireStaffRole('compliance');
  try {
    await setPerformanceComplianceFlags(getDb(), { accountId, kycVerified: verified });
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
  await requireStaffRole('compliance');
  try {
    await setPerformanceComplianceFlags(getDb(), {
      accountId,
      payoutMethodConfigured: configured,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Échec de la mise à jour du moyen de paiement.',
    };
  }
  revalidatePath('/control/payouts');
  return {};
}
