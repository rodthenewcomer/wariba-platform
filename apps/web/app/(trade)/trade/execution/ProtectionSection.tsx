'use client';

import { Input } from '@wariba/ui';
import type { SymbolSpec } from '@wariba/contracts';
import type { ProtectionPreviewView } from './execution-impact';

export interface ProtectionSectionProps {
  spec: SymbolSpec | undefined;
  stopLoss: string;
  onStopLossChange: (value: string) => void;
  stopLossError: string | null;
  takeProfit: string;
  onTakeProfitChange: (value: string) => void;
  takeProfitError: string | null;
  preview: ProtectionPreviewView;
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
  preview,
}: ProtectionSectionProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="execution-stop-loss"
            className="text-[length:var(--wariba-font-size-data-xs)] font-medium uppercase tracking-[0.06em] text-[color:var(--wariba-text-secondary)]"
          >
            Stop Loss
          </label>
          <Input
            id="execution-stop-loss"
            label="Stop Loss (prix)"
            hideLabel
            type="text"
            inputMode="decimal"
            name="stopLoss"
            data-testid="stop-loss-input"
            className="wariba-data"
            placeholder="Optionnel"
            value={stopLoss}
            onChange={(event) => onStopLossChange(event.target.value)}
            {...(stopLossError ? { errorText: stopLossError } : {})}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="execution-take-profit"
            className="text-[length:var(--wariba-font-size-data-xs)] font-medium uppercase tracking-[0.06em] text-[color:var(--wariba-text-secondary)]"
          >
            Take Profit
          </label>
          <Input
            id="execution-take-profit"
            label="Take Profit (prix)"
            hideLabel
            type="text"
            inputMode="decimal"
            name="takeProfit"
            data-testid="take-profit-input"
            className="wariba-data"
            placeholder="Optionnel"
            value={takeProfit}
            onChange={(event) => onTakeProfitChange(event.target.value)}
            {...(takeProfitError ? { errorText: takeProfitError } : {})}
          />
        </div>
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
        className="text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-tertiary)]"
      >
        Prix{spec ? ` · ${spec.pricePrecision} déc.` : ''} · joints à l’ordre
      </p>

      {preview.sides ? (
        <div className="flex flex-col gap-1" data-testid="protection-preview">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3">
            <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Estimation
            </span>
            {preview.sides.map((side) => (
              <span
                key={side.side}
                className="w-16 text-right text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]"
              >
                {SIDE_LABEL[side.side]}
              </span>
            ))}

            {preview.sides.some((side) => side.stopLossPnlFormatted) ? (
              <>
                <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  Perte au SL
                </span>
                {preview.sides.map((side) => (
                  <span
                    key={side.side}
                    data-testid={`protection-sl-${side.side}`}
                    className="wariba-data w-16 text-right text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-primary)]"
                  >
                    {side.stopLossPnlFormatted ?? '—'}
                  </span>
                ))}
              </>
            ) : null}

            {preview.sides.some((side) => side.takeProfitPnlFormatted) ? (
              <>
                <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  Gain au TP
                </span>
                {preview.sides.map((side) => (
                  <span
                    key={side.side}
                    data-testid={`protection-tp-${side.side}`}
                    className="wariba-data w-16 text-right text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-primary)]"
                  >
                    {side.takeProfitPnlFormatted ?? '—'}
                  </span>
                ))}
              </>
            ) : null}

            {preview.sides.some((side) => side.riskRewardFormatted) ? (
              <>
                <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  R:R (distance)
                </span>
                {preview.sides.map((side) => (
                  <span
                    key={side.side}
                    data-testid={`protection-rr-${side.side}`}
                    className="wariba-data w-16 text-right text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-primary)]"
                  >
                    {side.riskRewardFormatted ?? '—'}
                  </span>
                ))}
              </>
            ) : null}
          </div>
          <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-tertiary)]">
            Estimations au prix d’entrée indicatif, hors slippage.
            {preview.triggerMayGap ? ' Un ordre Stop peut être exécuté au-delà du seuil.' : ''}
          </p>
        </div>
      ) : null}
    </div>
  );
}
