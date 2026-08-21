'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ORDER_KIND_LABEL } from './OrderTypeSelector';
import type { ExecutionSide, OrderRejectionDetail, TicketOrderKind } from './execution-contract';

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
  /**
   * The panel's current rejection, used for one thing only: to nudge the key
   * that was pressed (VX1-D §28). The authoritative reason is stated by
   * `ExecutionStatus`, never here.
   */
  rejection?: OrderRejectionDetail | null;
  onSubmit: (side: ExecutionSide) => void;
}

const SIDE_COPY: Record<
  ExecutionSide,
  { verb: string; accessible: string; quoteLabel: string; glyph: string }
> = {
  sell: { verb: 'Sell', accessible: 'Vendre', quoteLabel: 'au Bid', glyph: '▼' },
  buy: { verb: 'Buy', accessible: 'Acheter', quoteLabel: 'à l’Ask', glyph: '▲' },
};

/** The only saturated colours in the panel — see the note on the component below. */
const SIDE_TONE: Record<ExecutionSide, string> = {
  sell: 'bg-[color:var(--wariba-component-workstation-trading-sell)] hover:enabled:brightness-110',
  buy: 'bg-[color:var(--wariba-component-workstation-trading-buy)] hover:enabled:brightness-110',
};

/**
 * The physical treatment shared by both sides.
 *
 * Visual closure §13 — a key, not a coloured rectangle. A hairline of rim light
 * along the top edge and a hard 2px shadow along the bottom give the control a
 * body; pressing removes the shadow and drops the key by the same 2px, so the
 * button travels rather than merely tinting. That is the whole difference
 * between "two colored rectangles" and a control that communicates consequence,
 * and it costs one box-shadow and one transform — no animation runs on a tick,
 * and `prefers-reduced-motion` collapses the transition globally.
 */
const SIDE_PHYSICAL = [
  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28),0_2px_0_0_rgba(5,7,12,0.55)]',
  'hover:enabled:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.34),0_3px_0_0_rgba(5,7,12,0.6)]',
  'hover:enabled:-translate-y-px',
  // Refinement pass — the press *bottoms out*. The key travels the full 2px of
  // its own shadow, loses the shadow entirely and darkens: three coincident
  // changes, which is what makes a press feel like it landed on something
  // rather than like a colour changed. An e-commerce CTA brightens on press;
  // an instrument key sinks.
  'active:enabled:translate-y-0.5 active:enabled:brightness-90',
  'active:enabled:shadow-[inset_0_2px_3px_0_rgba(5,7,12,0.45)]',
].join(' ');

/** The de-emphasised form: side identity kept in the border, fill dropped. */
const SIDE_OUTLINE: Record<ExecutionSide, string> = {
  sell: 'bg-[color:var(--wariba-component-workstation-wash-sell)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-trading-sell)]',
  buy: 'bg-[color:var(--wariba-component-workstation-wash-buy)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-trading-buy)]',
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
  rejection = null,
  onSubmit,
}: ExecutionActionsProps) {
  const descriptionIdPrefix = useId();

  /*
   * VX1-D §26/§28 — the key's own answer, before the server has one.
   *
   * Two states live here and nowhere else, because they are about *this
   * control* rather than about the order: which side was last pressed, and
   * whether the answer that came back was a refusal.
   *
   * The nudge is deliberately tiny and singular — two pixels, one cycle,
   * 100ms, on the pressed key only. Its job is not to express displeasure; it
   * is to put the eye on the right control at the moment the canonical reason
   * appears beside it, so a trader who was watching the chart knows which of
   * two keys did not go through. Nothing about the refusal is *stated* here.
   */
  const lastPressed = useRef<ExecutionSide | null>(null);
  const [nudged, setNudged] = useState<ExecutionSide | null>(null);

  useEffect(() => {
    // Keyed on the rejection's identity: the panel hands over a fresh object
    // per refusal, so the same code twice is still two events and each one
    // deserves its own nudge.
    if (rejection === null || lastPressed.current === null) return;
    setNudged(lastPressed.current);
    const timer = setTimeout(() => setNudged(null), 260);
    return () => clearTimeout(timer);
  }, [rejection]);

  return (
    <div className="flex flex-col gap-1.5 px-2.5 pb-2 pt-2" data-testid="execution-actions">
      <div className="grid grid-cols-2 gap-1.5">
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
                onClick={() => {
                  lastPressed.current = side;
                  onSubmit(side);
                }}
                data-nudge={nudged === side ? 'true' : 'false'}
                className={[
                  'flex min-h-[var(--wariba-component-workstation-decision-button-height)] flex-col items-center justify-center gap-1',
                  'rounded-[8px] px-1.5 py-1.5',
                  // VX1-D §24/§26 — the key answers the finger before the
                  // server answers the order. 80ms on release is deliberately
                  // at the floor of the ladder: a decision key that takes a
                  // beat to come back up reads as latency the trader will
                  // attribute to the exchange.
                  'transition-[background-color,filter,transform,box-shadow] duration-[var(--wariba-component-workstation-motion-instant)] ease-[var(--wariba-component-workstation-ease-interaction)]',
                  // The key treatment is dropped on the de-emphasised and
                  // disabled forms: an inert control must not look pressable.
                  sideUnavailable || disabled || pending ? '' : SIDE_PHYSICAL,
                  // §28 — the refused key, and only it.
                  nudged === side
                    ? 'motion-safe:animate-[wariba-reject-nudge_var(--wariba-component-workstation-motion-micro)_var(--wariba-component-workstation-ease-move)]'
                    : '',
                  // §26 — an order in flight is reported by the key that sent
                  // it: a 2px indeterminate rule along its bottom edge, not a
                  // spinner laid over the decision zone. The key never claims
                  // the order succeeded — only that it is still out.
                  pending
                    ? 'relative overflow-hidden after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[color:var(--wariba-component-workstation-surface-canvas)]/60 motion-safe:after:animate-[wariba-inflight_var(--wariba-component-workstation-motion-feedback)_linear_infinite]'
                    : '',
                  // Ink, not white: WX1's brighter Emerald/Coral fills carry
                  // sufficient contrast with the workstation canvas tone,
                  // while white falls below AA on both semantic actions.
                  sideUnavailable
                    ? 'text-[color:var(--wariba-text-secondary)]'
                    : 'text-[color:var(--wariba-component-workstation-surface-canvas)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
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
                    mid-press and loses the one word that says what it does.

                    The direction glyph is the conventional terminal cue and is
                    `aria-hidden`: the verb, the accessible name and the
                    description already carry the side three times over, so the
                    triangle adds instant recognition without adding a fourth
                    thing to announce. */}
                {/*
                 * Refinement pass — verb, direction and price as three ranks.
                 *
                 * The glyph is a fixed-width slot so `Sell` and `Buy` occupy
                 * optically identical keys despite one being a glyph wider; the
                 * verb holds the top rank at 16px bold; the price sits under a
                 * hairline rule in its own band, which is what stops the two
                 * lines reading as one wrapped label. The rule also gives the
                 * key an internal structure — the thing that separates a
                 * trading key from a coloured rectangle with two lines of text.
                 */}
                <span className="flex items-center justify-center gap-1.5 text-[length:var(--wariba-component-workstation-type-decision)] font-bold leading-none tracking-[var(--wariba-component-workstation-tracking-decision)]">
                  <span
                    aria-hidden="true"
                    className="w-3 shrink-0 text-center text-[9px] leading-none opacity-75"
                  >
                    {copy.glyph}
                  </span>
                  {label}
                </span>
                {/* Hidden from the name computation so the button is named
                    exactly "Buy"/"Sell"; the price is announced through the
                    description below instead, so nothing is lost. Full
                    opacity: at 11px, dimming this line alone was enough to
                    drop it under the 4.5:1 minimum. */}
                <span
                  aria-hidden="true"
                  className={[
                    // Inset, not full-bleed: at phone scale a rule spanning the
                    // whole key split it into two stacked cells. A short
                    // centred mark separates the price from the verb without
                    // making the key look like a table.
                    'wariba-data w-14 border-t pt-1 text-center leading-none tabular-nums',
                    'text-[length:var(--wariba-component-workstation-type-data)] font-semibold',
                    sideUnavailable
                      ? 'border-[color:var(--wariba-component-workstation-border-strong)]'
                      : 'border-[color:var(--wariba-component-workstation-surface-canvas)]/25',
                  ].join(' ')}
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
                  className="text-[length:var(--wariba-component-workstation-type-meta)] font-semibold leading-tight text-[color:var(--wariba-component-workstation-trading-warning)]"
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
        className="text-[length:var(--wariba-component-workstation-type-meta)] leading-tight text-[color:var(--wariba-component-workstation-text-tertiary)]"
      >
        Compte simulé · exécution serveur — aucun prix client n&apos;est autoritaire.
        {orderKind !== 'market' ? ' Ordres en attente GTC.' : ''}
      </p>
    </div>
  );
}
