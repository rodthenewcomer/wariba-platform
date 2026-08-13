'use client';

import type { SymbolSpec } from '@wariba/contracts';
import { ExecutionField } from './ExecutionField';
import type { ProtectionPreviewView } from './execution-impact';

export interface ProtectionSectionProps {
  spec: SymbolSpec | undefined;
  stopLoss: string;
  onStopLossChange: (value: string) => void;
  stopLossError: string | null;
  takeProfit: string;
  onTakeProfitChange: (value: string) => void;
  takeProfitError: string | null;
}

const SIDE_LABEL = { sell: 'Vente', buy: 'Achat' } as const;

/**
 * W4 §25/§26/§27/§29/§34 — Stop Loss and Take Profit, as absolute prices.
 *
 * **Semantics are unchanged and stated.** Both fields are prices, exactly what
 * `submit_order` / `create_pending_order` carry today — never points, pips,
 * dollars or a percentage. They ride along on the same command as the order
 * itself (§26): there is no post-fill second command anywhere in this surface.
 *
 * **The preview is per side, and is an estimate.** A ticket has two possible
 * sides and the entry reference differs between them (ask for a buy, bid for a
 * sell), so a single number would be ambiguous about real money. The columns
 * below name their side. The figures come from `computeLevelPnlPreview` and
 * `computeRiskRewardRatio` — the same helpers the chart's SL/TP drag preview
 * uses, which call the server's own `computeRealizedPnl`. They do not model
 * the adverse slippage the server applies at fill time, and for a Stop entry
 * the market may gap past the trigger entirely, which the note below says.
 *
 * Relationship validation (is this stop on the correct side of entry?) stays
 * server-authoritative: no canonical shared helper expresses it, and W4 §27
 * forbids growing a second risk engine in the browser to invent one.
 */
export function ProtectionSection({
  spec,
  stopLoss,
  onStopLossChange,
  stopLossError,
  takeProfit,
  onTakeProfitChange,
  takeProfitError,
}: ProtectionSectionProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {/*
       * Visual closure §12E — protection reads as operational, not optional.
       *
       * Two identical grey boxes both placeholdered "Optionnel" gave a trader no
       * way to tell a stop from a target without reading. Each field now carries
       * a 2px leading rule *and* an in-field `SL`/`TP` tag in its own semantic
       * colour — coral for the level that limits a loss, emerald for the one
       * that takes a profit — matching the colours the chart already draws those
       * same levels in, so the panel and the plot agree.
       *
       * The tags are what let the section's own gutter label read `PROTECTION`
       * once instead of stacking two more headings above the fields: the
       * refinement pass's whole point is that the middle third stops being a
       * sequence of label/control pairs. The bound `<label>` for each field is
       * unchanged and still carries the full name to assistive technology.
       */}
      <div className="grid grid-cols-2 gap-2">
        <ExecutionField
          id="execution-stop-loss"
          label="Stop Loss (prix)"
          prefix="SL"
          prefixClassName="text-[color:var(--wariba-component-workstation-trading-sell)]"
          type="text"
          inputMode="decimal"
          name="stopLoss"
          data-testid="stop-loss-input"
          placeholder="Optionnel"
          accentClassName="bg-[color:var(--wariba-chart-stop-loss)]"
          value={stopLoss}
          onChange={(event) => onStopLossChange(event.target.value)}
          errorText={stopLossError}
        />
        <ExecutionField
          id="execution-take-profit"
          label="Take Profit (prix)"
          prefix="TP"
          prefixClassName="text-[color:var(--wariba-component-workstation-trading-buy)]"
          type="text"
          inputMode="decimal"
          name="takeProfit"
          data-testid="take-profit-input"
          placeholder="Optionnel"
          accentClassName="bg-[color:var(--wariba-chart-take-profit)]"
          value={takeProfit}
          onChange={(event) => onTakeProfitChange(event.target.value)}
          errorText={takeProfitError}
        />
      </div>

      {/*
       * Visual closure §8 — the same three facts on one compact line.
       *
       * "Prix · 5 décimales — joints à l'ordre, pas envoyés séparément." was a
       * full sentence of persistent body copy under two fields that are already
       * labelled and already placeholdered "Optionnel". The semantics it
       * carries are not decoration and are therefore kept, not dropped: these
       * are absolute *prices*, at the instrument's precision, and they ride on
       * the same command as the order. They are now metadata sized, with the
       * full sentence still available as the accessible title.
       */}
      <p
        title={
          spec
            ? `Prix absolus à ${spec.pricePrecision} décimales, joints à l’ordre et jamais envoyés séparément.`
            : 'Prix absolus, joints à l’ordre et jamais envoyés séparément.'
        }
        className="text-[length:var(--wariba-component-workstation-type-meta)] text-[color:var(--wariba-component-workstation-text-tertiary)]"
      >
        Prix{spec ? ` · ${spec.pricePrecision} déc.` : ''} · joints à l’ordre
      </p>
    </div>
  );
}

export interface ProtectionPreviewProps {
  preview: ProtectionPreviewView;
}

/**
 * The per-side estimate, rendered full-bleed under the Protection controls.
 *
 * Visual closure §12F — the estimate is a small aligned table, and its labels
 * are quieter than its figures. WX1 ran the row labels at 14px and the money at
 * 11px, which is the hierarchy exactly inverted: a trader reads "how much do I
 * lose", not "Perte au SL".
 *
 * The refinement pass moved it out of the section's control column. Inside that
 * 222px column a three-column money table wrapped both its labels and its
 * amounts onto second lines and read as broken; at the panel's full width every
 * row holds one line. `USD` is hoisted into the side headings exactly as
 * `ExecutionImpactSummary` already does — the unit is stated once per column
 * instead of six times, and no figure is altered.
 */
export function ProtectionPreview({ preview }: ProtectionPreviewProps) {
  const sides = preview.sides;
  if (!sides) return null;
  /** `20.00 USD` → `20.00`; the unit is stated once, in the column heading. */
  const amount = (value: string | null | undefined): string =>
    value ? value.replace(/\s*USD$/, '') : '—';

  return (
    <div
      className="flex flex-col gap-1.5 rounded-[8px] bg-[color:var(--wariba-component-workstation-wash-neutral)] px-2.5 py-2"
      data-testid="protection-preview"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-baseline gap-x-3 gap-y-1.5">
        <span className="text-[length:var(--wariba-component-workstation-type-section-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          Estimation
        </span>
        {sides.map((side) => (
          <span
            key={side.side}
            className="whitespace-nowrap text-right text-[length:var(--wariba-component-workstation-type-section-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]"
          >
            {/* No `opacity` on the unit. Faded to 70% it composited to #747B88
                on the estimate block's own wash and measured 3.91:1 — under AA
                for 10px text. It is already subordinate by being the second
                word in a small-caps heading; dimming it was decoration that
                cost legibility. */}
            {SIDE_LABEL[side.side]} USD
          </span>
        ))}

        {sides.some((side) => side.stopLossPnlFormatted) ? (
          <>
            <span className="whitespace-nowrap text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)]">
              Perte au SL
            </span>
            {sides.map((side) => (
              <span
                key={side.side}
                data-testid={`protection-sl-${side.side}`}
                className="wariba-data whitespace-nowrap text-right text-[length:var(--wariba-component-workstation-type-data)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-primary)]"
              >
                {amount(side.stopLossPnlFormatted)}
              </span>
            ))}
          </>
        ) : null}

        {sides.some((side) => side.takeProfitPnlFormatted) ? (
          <>
            <span className="whitespace-nowrap text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)]">
              Gain au TP
            </span>
            {sides.map((side) => (
              <span
                key={side.side}
                data-testid={`protection-tp-${side.side}`}
                className="wariba-data whitespace-nowrap text-right text-[length:var(--wariba-component-workstation-type-data)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-primary)]"
              >
                {amount(side.takeProfitPnlFormatted)}
              </span>
            ))}
          </>
        ) : null}

        {sides.some((side) => side.riskRewardFormatted) ? (
          <>
            <span className="whitespace-nowrap text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)]">
              R:R (distance)
            </span>
            {sides.map((side) => (
              <span
                key={side.side}
                data-testid={`protection-rr-${side.side}`}
                className="wariba-data whitespace-nowrap text-right text-[length:var(--wariba-component-workstation-type-data)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-primary)]"
              >
                {side.riskRewardFormatted ?? '—'}
              </span>
            ))}
          </>
        ) : null}
      </div>
      <p className="text-[length:var(--wariba-component-workstation-type-meta)] leading-snug text-[color:var(--wariba-component-workstation-text-tertiary)]">
        Estimations au prix d’entrée indicatif, hors slippage.
        {preview.triggerMayGap ? ' Un ordre Stop peut être exécuté au-delà du seuil.' : ''}
      </p>
    </div>
  );
}
