'use client';

import { useId } from 'react';
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

/** The de-emphasised form: side identity kept in the border, fill dropped. */
const SIDE_OUTLINE: Record<ExecutionSide, string> = {
  sell: 'bg-transparent ring-1 ring-inset ring-[color:var(--wariba-status-danger-border)]',
  buy: 'bg-transparent ring-1 ring-inset ring-[color:var(--wariba-status-success-border)]',
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
  const descriptionIdPrefix = useId();

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
                // Described, not relabelled. An `aria-label` carrying the side
                // and the price would make the accessible name "Buy Acheter à
                // l'Ask 1.08518" — which still satisfies WCAG 2.5.3 but stops
                // the name from *being* the verb, so voice control and every
                // exact-name selector in the suite lose their handle on it.
                // The description carries the same facts and is announced
                // right after the name instead.
                aria-describedby={`${descriptionIdPrefix}-${side}`}
                onClick={() => onSubmit(side)}
                className={[
                  'flex min-h-12 flex-col items-center justify-center gap-0.5',
                  'rounded-[var(--wariba-radius-sm)] px-2 py-2 transition-colors',
                  // `--wariba-action-destructive-text`, not `-primary-text`:
                  // the primary one is #0B0D12 under a dark theme (correct on
                  // the bright cobalt primary button, 3.1:1 and failing on
                  // these saturated surfaces). The destructive token is the
                  // one already paired with #A73C3C and is #FFFFFF in every
                  // theme — 6.3:1 on the Sell red, 5.8:1 on the Buy green.
                  sideUnavailable
                    ? 'text-[color:var(--wariba-text-secondary)]'
                    : 'text-[color:var(--wariba-action-destructive-text)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]',
                  // Visual closure §10 — a *strong* disabled state, which means
                  // legible as well as inert. The generic disabled pair
                  // (`--wariba-text-disabled` on `--wariba-border-disabled`) is
                  // 2.25:1 in the dark theme and the repo's own axe gates
                  // caught it: this is the state a trader sees when they cannot
                  // trade, i.e. exactly when they most need to read the button
                  // and the reason beside it. Secondary text on the subtle
                  // surface is 9.6:1, clearly not pressable, and clearly a
                  // Sell/Buy button still.
                  'disabled:bg-[color:var(--wariba-background-subtle)] disabled:text-[color:var(--wariba-text-secondary)]',
                  'disabled:ring-1 disabled:ring-inset disabled:ring-[color:var(--wariba-border-disabled)]',
                  /*
                   * Visual closure §11 — the side the current quote does not
                   * support drops its fill for an outline in its own side
                   * colour, so the two actions stop being equally emphasised
                   * while the side stays identifiable. It remains pressable:
                   * this browser's quote is older than the one the server will
                   * hold, and the server remains the authority.
                   *
                   * Deliberately **not** `opacity`. Element opacity composites
                   * the label and its fill together over the panel, so a
                   * 45%-faded Sell drops from 6.3:1 to roughly 2:1 — it would
                   * have traded one accessibility failure for another, in a
                   * control that is still live.
                   */
                  sideUnavailable ? SIDE_OUTLINE[side] : SIDE_TONE[side],
                ].join(' ')}
              >
                {/* The label stays put while a command is in flight — a
                    button whose text is replaced by a spinner changes width
                    mid-press and loses the one word that says what it does. */}
                <span className="text-[length:var(--wariba-font-size-body-md)] font-semibold leading-none">
                  {label}
                </span>
                {/* Hidden from the name computation so the button is named
                    exactly "Buy"/"Sell"; the price is announced through the
                    description below instead, so nothing is lost. Full
                    opacity: at 11px, dimming this line alone was enough to
                    drop it under the 4.5:1 minimum. */}
                <span
                  aria-hidden="true"
                  className="wariba-data text-[length:var(--wariba-font-size-data-xs)] leading-none tabular-nums"
                >
                  {sideUnavailable ? 'hors marché' : (price ?? DASH)}
                </span>
              </button>

              <span id={`${descriptionIdPrefix}-${side}`} className="sr-only">
                {copy.accessible} {orderKind === 'market' ? copy.quoteLabel : 'au seuil'}
                {price ? ` ${price}` : ''}
                {sideUnavailable
                  ? '. Ce seuil n’est pas valide de ce côté au prix actuel ; le serveur reste juge.'
                  : ''}
              </span>

              {/* §11 — the guidance names its own side and sits under it, rather
                  than as one footer sentence a trader has to map back onto two
                  buttons. */}
              {sideUnavailable ? (
                <p
                  data-testid={`execution-side-unavailable-${side}`}
                  className="text-[length:var(--wariba-font-size-data-xs)] leading-tight text-[color:var(--wariba-status-warning-text)]"
                >
                  Non valide au cours actuel
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/*
       * The platform's standing statement that no browser price is ever
       * authoritative, and the GTC note that is the only duration WariX offers.
       * Both facts are kept in full; visual closure §4 only asks that they stop
       * competing with the controls, so they run at metadata size with the
       * complete sentence available as the accessible title.
       */}
      <p
        title="Compte simulé. L’exécution est faite par le serveur uniquement — aucun prix affiché dans le navigateur n’est jamais autoritaire."
        className="text-[length:var(--wariba-font-size-data-xs)] leading-snug text-[color:var(--wariba-text-tertiary)]"
      >
        Compte simulé · exécution serveur — aucun prix client n&apos;est autoritaire.
        {orderKind !== 'market' ? ' Ordres en attente GTC.' : ''}
      </p>
    </div>
  );
}
