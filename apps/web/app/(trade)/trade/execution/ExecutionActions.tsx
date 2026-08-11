'use client';

import { ORDER_KIND_LABEL } from './OrderTypeSelector';
import type { ExecutionSide, TicketOrderKind } from './execution-contract';

export interface ExecutionActionsProps {
  orderKind: TicketOrderKind;
  /** The price each side is expected to reference — ask for Buy, bid for Sell. Null before a quote exists. */
  referencePrice: Record<ExecutionSide, string | null>;
  /**
   * Which sides the current trigger price is creatable for, from the canonical
   * server rule, or null when there is nothing to compare against. Advisory
   * only — see the note below on why it never disables a button.
   */
  creatableSides: Record<ExecutionSide, boolean> | null;
  disabled: boolean;
  pending: boolean;
  onSubmit: (side: ExecutionSide) => void;
}

const SIDE_COPY: Record<ExecutionSide, { verb: string; accessible: string; quoteLabel: string }> = {
  sell: { verb: 'Sell', accessible: 'Vendre', quoteLabel: 'au Bid' },
  buy: { verb: 'Buy', accessible: 'Acheter', quoteLabel: 'à l’Ask' },
};

/** The only saturated colours in the panel — see the note on the component below. */
const SIDE_TONE: Record<ExecutionSide, string> = {
  sell: 'bg-[color:var(--wariba-status-danger-strong)] hover:enabled:bg-[color:var(--wariba-status-danger-text)]',
  buy: 'bg-[color:var(--wariba-status-success-strong)] hover:enabled:bg-[color:var(--wariba-status-success-text)]',
};

const DASH = '—';

/** Sell first: it sits under the Bid, which is the left-hand quote in the header. */
const SIDES: readonly ExecutionSide[] = ['sell', 'buy'];

/**
 * W4 §20/§62/§63 — one draft, two deliberate actions.
 *
 * **Sell left, Buy right**, under the Bid and Ask they respectively reference
 * in `ExecutionMarketHeader`, so the price a trader reads and the button they
 * press are in the same column. The reference price is repeated on the button
 * itself: the single most common execution mistake is pressing the right verb
 * against the wrong number.
 *
 * **These are the only saturated elements in the panel** (W0 §10). Everything
 * else in the Execution Center is greyscale with hairline seams, so the two
 * things that spend money are the two things the eye lands on. Both carry
 * their verb as text — colour is never the only carrier of meaning (§63) — and
 * both state their side in the accessible name so a screen reader announces
 * "Vendre" / "Acheter" rather than a bare English verb.
 *
 * **Why an invalid trigger side is a note, not a disabled button.** For a
 * pending order, `creatableSidesFor` runs the exact rule the server re-runs
 * under lock — but it runs it against *this browser's* last tick, which is by
 * definition older than the quote the server will hold at command time.
 * Disabling would therefore turn a momentarily-stale local quote into a hard
 * block on a legitimate order. The note tells the trader what the current
 * market says; the server still answers, and a genuine
 * `invalid_trigger_price` rejection surfaces with its own reason and code.
 */
export function ExecutionActions({
  orderKind,
  referencePrice,
  creatableSides,
  disabled,
  pending,
  onSubmit,
}: ExecutionActionsProps) {
  return (
    <div className="flex flex-col gap-1.5 px-3 pb-3 pt-1" data-testid="execution-actions">
      <div className="grid grid-cols-2 gap-2">
        {SIDES.map((side) => {
          const copy = SIDE_COPY[side];
          // The E2E suite and every trader's muscle memory key on the bare
          // verb for a market order; the pending kinds qualify it, exactly as
          // the pre-W4 ticket did.
          const label =
            orderKind === 'market' ? copy.verb : `${copy.verb} ${ORDER_KIND_LABEL[orderKind]}`;
          const price = referencePrice[side];
          const sideUnavailable = creatableSides !== null && !creatableSides[side];

          return (
            <div key={side} className="flex flex-col gap-1">
              <button
                type="button"
                data-testid={`execution-submit-${side}`}
                disabled={disabled || pending}
                aria-busy={pending || undefined}
                // The visible verb opens the accessible name (WCAG 2.5.3), then
                // the side in French and the price this action references — the
                // two facts a non-sighted trader otherwise has to reconstruct
                // from the header's left/right column order.
                aria-label={[
                  label,
                  copy.accessible,
                  orderKind === 'market' ? copy.quoteLabel : 'au seuil',
                  price ?? '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSubmit(side)}
                className={[
                  'flex min-h-[var(--wariba-size-touch-target-minimum)] flex-col items-center justify-center',
                  'rounded-[var(--wariba-radius-sm)] px-2 py-1.5 transition-colors',
                  'text-[color:var(--wariba-action-primary-text)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]',
                  'disabled:bg-[color:var(--wariba-border-disabled)] disabled:text-[color:var(--wariba-text-disabled)]',
                  SIDE_TONE[side],
                ].join(' ')}
              >
                {/* The label stays put while a command is in flight — a
                    button whose text is replaced by a spinner changes width
                    mid-press and loses the one word that says what it does. */}
                <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold">
                  {label}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] opacity-90">
                  {price ?? DASH}
                </span>
              </button>

              {sideUnavailable ? (
                <p
                  data-testid={`execution-side-unavailable-${side}`}
                  className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-status-warning-text)]"
                >
                  Seuil non valide de ce côté au prix actuel.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Kept verbatim from the pre-W4 ticket — it is the platform's standing
          statement that no browser price is ever authoritative, and the GTC
          sentence is the only duration WariX offers. */}
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-tertiary)]">
        Compte simulé. Exécution serveur uniquement — aucun prix client n&apos;est jamais
        autoritaire.
        {orderKind !== 'market'
          ? ' Les ordres en attente sont GTC (valables jusqu’à annulation) — aucune autre durée n’est proposée.'
          : ''}
      </p>
    </div>
  );
}
