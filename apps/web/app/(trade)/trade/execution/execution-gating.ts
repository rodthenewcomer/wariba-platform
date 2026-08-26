import type { AccountRisk, MarketTick } from '@wariba/contracts';
import { deriveRiskRibbonStatus } from '../risk-status';

/**
 * W4 §6/§15/§36/§37/§57/§58 — the client's entry gate, as one pure function.
 *
 * **This is UX, not policy.** Every branch below mirrors a rule the server
 * already enforces and would reject on its own; none of them is a risk rule
 * invented in the browser. The order is the pre-W4 ticket's order — connection,
 * then market, then risk lock, then the field checks — kept deliberately so
 * the message a trader sees for a given state does not change with the
 * redesign.
 *
 * Two things it must never do, and does not:
 *
 * - **Gate risk reduction.** Closing or reducing a position stays available in
 *   every state below (W4 §36/§37/§44). The gate returned here is consumed
 *   only by the Buy/Sell actions.
 * - **Recompute a limit.** `AccountRisk` arrives already evaluated by
 *   services/realtime; this reads its verdict fields and never re-derives one
 *   from balance or equity.
 */
export type EntryBlockReason =
  | 'resyncing'
  | 'disconnected'
  | 'quote_unavailable'
  | 'market_stale'
  | 'market_closed'
  | 'short_duration_entry_locked'
  | 'risk_hard_breach'
  | 'risk_soft_lock'
  | 'invalid_quantity'
  | 'invalid_trigger_price'
  | 'invalid_protection';

export interface ExecutionGate {
  /** Whether the two side actions may be activated at all. */
  entryBlocked: boolean;
  reason: EntryBlockReason | null;
  /** French explanation for the blocked state — null when entry is available. */
  message: string | null;
  /** Risk-reducing actions are never gated here; surfaced so the panel can say so. */
  reductionAvailable: true;
}

const BLOCK_MESSAGE: Record<EntryBlockReason, string> = {
  resyncing:
    'Resynchronisation en cours. Les nouveaux ordres restent bloqués tant que WARIBA n’a pas confirmé l’état exact de votre compte.',
  disconnected: 'Connexion en cours…',
  quote_unavailable: 'Aucune cotation en cours pour cet instrument.',
  market_stale: 'Les nouvelles positions sont bloquées tant que le marché n’est pas à jour.',
  market_closed:
    'Marché fermé pour cet instrument — le dernier prix affiché n’est plus négociable.',
  short_duration_entry_locked:
    'Les nouvelles ouvertures sont suspendues pour revue après six profits sous 60 secondes sur 24 h.',
  risk_hard_breach: 'La limite maximale de perte est dépassée. Aucun nouvel ordre possible.',
  risk_soft_lock: 'Votre compte est en blocage temporaire jusqu’au prochain reset à 00:00 UTC.',
  invalid_quantity: 'Quantité invalide.',
  invalid_trigger_price: 'Prix de déclenchement invalide.',
  invalid_protection: 'Protection invalide.',
};

export interface ExecutionGateInput {
  connectionOk: boolean;
  isResyncing: boolean;
  tick: MarketTick | null;
  risk: AccountRisk | null;
  quantityError: string | null;
  triggerPriceError: string | null;
  protectionError: string | null;
}

export function deriveExecutionGate(input: ExecutionGateInput): ExecutionGate {
  const reason = deriveEntryBlockReason(input);
  if (reason === null) {
    return { entryBlocked: false, reason: null, message: null, reductionAvailable: true };
  }
  // Field errors are already displayed inline on the field itself; repeating a
  // generic sentence in the status area would say less than the field does.
  const message =
    reason === 'invalid_quantity'
      ? input.quantityError
      : reason === 'invalid_trigger_price'
        ? input.triggerPriceError
        : reason === 'invalid_protection'
          ? input.protectionError
          : BLOCK_MESSAGE[reason];
  return {
    entryBlocked: true,
    reason,
    message: message ?? BLOCK_MESSAGE[reason],
    reductionAvailable: true,
  };
}

function deriveEntryBlockReason(input: ExecutionGateInput): EntryBlockReason | null {
  // `isResyncing` and `connectionOk` are the same connection state read two
  // ways (see trade-session.ts) — resync is checked first only so it gets the
  // more specific message, not because it is a separate gate.
  if (input.isResyncing) return 'resyncing';
  if (!input.connectionOk) return 'disconnected';
  if (!input.tick) return 'quote_unavailable';
  // The same predicate the server's own MarketTickGate applies
  // (services/realtime/src/tick-gate.ts: `tick.marketStatus !== 'open'`).
  // A non-open quote is never observed into history and would be rejected as
  // STALE_MARKET_DATA at execution time.
  if (input.tick.marketStatus === 'stale') return 'market_stale';
  if (input.tick.marketStatus === 'closed') return 'market_closed';

  if (input.risk?.shortDurationMonitoring.status === 'entry_locked') {
    return 'short_duration_entry_locked';
  }
  const ribbon = deriveRiskRibbonStatus({
    risk: input.risk,
    // Already handled above; passing false keeps this call about risk alone.
    isStale: false,
    isResyncing: false,
  });
  if (ribbon === 'hard-breach') return 'risk_hard_breach';
  if (ribbon === 'soft-lock') return 'risk_soft_lock';

  if (input.quantityError) return 'invalid_quantity';
  if (input.triggerPriceError) return 'invalid_trigger_price';
  if (input.protectionError) return 'invalid_protection';
  return null;
}

/** Compact market-state chip copy — the state names the contract actually defines (W4 §15). */
export const MARKET_STATUS_LABEL = {
  open: 'Marché ouvert',
  stale: 'Cours non actualisé',
  closed: 'Marché fermé',
} as const;

export const MARKET_STATUS_SHORT_LABEL = {
  open: 'Ouvert',
  stale: 'Non actualisé',
  closed: 'Fermé',
} as const;
