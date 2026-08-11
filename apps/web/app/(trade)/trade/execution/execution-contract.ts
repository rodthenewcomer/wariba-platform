import type { PendingOrderType } from '@wariba/contracts';

/**
 * The execution surface's shared vocabulary, with no React and no 'use client'
 * so the session controller and the rejection copy table can import it
 * without pulling a component in.
 *
 * Before W4 these lived in `OrderTicket.tsx`, which meant `trade-session.ts`
 * and `trade-copy.ts` imported a 237-line component just to name a rejection
 * shape. Moving them here is why the old ticket file could be deleted outright
 * rather than left behind as a type carrier.
 */

/** Appendix 07-D §2/§3 — the three entry types WariX offers. No Stop Limit, no OCO, no trailing entry (W4 §16). */
export type TicketOrderKind = 'market' | 'limit' | 'stop';

/** The two sides a ticket can be submitted as. One draft, two deliberate actions (W4 §20). */
export type ExecutionSide = 'buy' | 'sell';

export interface OrderRejectionDetail {
  code: string;
  reason: string;
  action: string;
}

/**
 * The ticket has one Buy and one Sell action that each submit the right
 * pending-order type once a non-Market kind is selected — the canonical
 * mapping, unchanged from the pre-W4 ticket.
 */
export function pendingOrderTypeFor(kind: 'limit' | 'stop', side: ExecutionSide): PendingOrderType {
  return `${side}_${kind}`;
}
