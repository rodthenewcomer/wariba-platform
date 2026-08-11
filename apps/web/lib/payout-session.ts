'use client';

import { accountStateChannel, type PayoutResultMessage } from '@wariba/contracts';
import type { RealtimeClient } from './realtime-client';
import { payoutRejectionDetailFor } from './payout-copy';

/**
 * The single canonical payout client semantics, shared by every surface that
 * can request a payout.
 *
 * W2 relocated the Payout Center out of the execution dock and onto `/payouts`
 * (W2 §16). That relocation must not fork the payout path: two independently
 * evolving `requestPayout` implementations, or two different readings of
 * `payout_result`, is exactly how a financial command drifts between surfaces.
 * So the *semantics* live here once, and each surface supplies only its own
 * transport and its own state setters.
 *
 * Nothing in this module computes eligibility, a cap, a split or an amount.
 * Every one of those remains server-authoritative; the only client-side check
 * is the non-positive shortcut that `invalid_requested_amount` already guards
 * server-side, kept solely to save a round trip.
 */
export interface PayoutSessionEffects {
  setPending(pending: boolean): void;
  setPayoutAmountError(message: string | null): void;
  /** Visually-hidden aria-live announcement for a settled command. */
  announce(message: string): void;
  /**
   * Clears whatever *other* command-error channel the host surface owns.
   * WariX clears its shared `orderError`; a payout-only surface has none and
   * passes a no-op. Kept explicit rather than optional so a new host has to
   * decide rather than inherit silence.
   */
  clearCommandError(): void;
}

/**
 * The trader picks the amount (Prompt 08 §5) — this only rejects a
 * non-positive figure client-side, the same shortcut
 * `invalid_requested_amount` guards against server-side. Everything else
 * (buffer / days / consistency / open position / pending order / KYC / payout
 * method) is `PayoutCenterPanel`'s own proactive disable via
 * `performanceProgress`, never re-checked here.
 */
export function requestPayoutCommand(
  client: RealtimeClient | null,
  accountId: string,
  amount: string,
  effects: PayoutSessionEffects,
): void {
  if (!client) return;
  if (!(Number(amount) > 0)) {
    effects.setPayoutAmountError('Le montant demandé doit être positif.');
    return;
  }
  effects.setPayoutAmountError(null);
  effects.setPending(true);
  effects.clearCommandError();
  client.requestPayout({
    accountId,
    idempotencyKey: crypto.randomUUID(),
    requestedNetTraderCash: amount,
  });
}

/**
 * Re-subscribing for a fresh `account.snapshot` (rather than upserting
 * `result.request` into local state) picks up the new `payoutRequests` entry
 * AND the recomputed `performanceProgress` (cycle moves to `payout_pending`)
 * in one round trip — the same "resubscribe for truth" convention
 * `pending_order_result` / `alert_result` already use.
 */
export function applyPayoutResult(
  client: RealtimeClient,
  accountId: string,
  result: PayoutResultMessage,
  effects: PayoutSessionEffects,
): void {
  effects.setPending(false);
  if (result.status === 'rejected') {
    const detail = payoutRejectionDetailFor(result.rejectionCode);
    effects.setPayoutAmountError(detail);
    effects.announce(`Refusé : ${detail}`);
  } else {
    effects.setPayoutAmountError(null);
    effects.announce('Demande de payout envoyée.');
  }
  client.resync([accountStateChannel(accountId)]);
}
