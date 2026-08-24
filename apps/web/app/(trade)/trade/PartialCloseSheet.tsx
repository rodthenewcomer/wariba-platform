'use client';

import { useEffect, useState } from 'react';
import { BottomSheet, Button, Input, Text, WariXInlineStatus } from '@wariba/ui';
import type { MarketTick, PositionDTO, QueuedReductionDTO, SymbolSpec } from '@wariba/contracts';
import {
  computeRealizedPnl,
  computeProfitEligibility,
  quotedPrice,
  estimateRequiredMargin,
  isPartialCloseQuantityValid,
  computePartialClosePresetQuantity,
  roundCustomPartialCloseQuantity,
  computeCommission,
  computeNetPnlAfterFees,
  subtractQuantity,
} from '@wariba/domain';
import type { OrderRejectionDetail } from './execution/execution-contract';

/**
 * subtractQuantity (like every other quantity in packages/domain) always
 * returns 4 decimal places — the ledger/audit-safe convention, not a
 * display one. Reformatting to the symbol's own lot-step precision here is
 * purely cosmetic (this value is never fed back into a command; the
 * quantity that actually gets submitted is the untouched preset/custom
 * value) — without it, "Clôturer 0.25 sur 1.00 lot" next to "Restant :
 * 0.7500 lot" reads as a precision bug even though both numbers are correct.
 *
 * quantityStep itself arrives from app.symbol_specs.quantity_step, a
 * numeric(14,4) column — Postgres always right-pads it to that declared
 * scale ("0.0100", never "0.01"), so counting decimals from its raw string
 * length would over-count EURUSD's real 2-decimal step as 4, producing
 * "0.0500" instead of "0.05". Strip insignificant trailing zeros first (no
 * decimal.js here — apps/web has no dependency on it; money math always
 * goes through @wariba/domain, and this is display-only anyway).
 */
function formatQuantityForDisplay(value: string, quantityStep: string): string {
  const trimmed = quantityStep.includes('.')
    ? quantityStep.replace(/0+$/, '').replace(/\.$/, '')
    : quantityStep;
  const dot = trimmed.indexOf('.');
  const decimals = dot === -1 ? 0 : trimmed.length - dot - 1;
  return Number(value).toFixed(decimals);
}

export interface PartialCloseSheetProps {
  open: boolean;
  onClose: () => void;
  position: PositionDTO | null;
  spec: SymbolSpec | null;
  tick: MarketTick | null;
  pending: boolean;
  rejection: OrderRejectionDetail | null;
  queuedReductions: QueuedReductionDTO[];
  onSubmitPartialClose: (params: { positionId: string; quantity: string }) => void;
  onSubmitFullClose: (positionId: string) => void;
  onQueueReduction: (params: {
    positionId: string;
    mode: 'partial' | 'full';
    quantity?: string;
  }) => void;
  onCancelQueuedReduction: (queueId: string) => void;
}

type Preset = 25 | 50 | 75 | 'custom';

/**
 * Prompt 7 Appendix 07-C §9-§12 — partial close as a deliberate risk-
 * management action. A BottomSheet uniformly (not a centered dialog): §13
 * explicitly asks for a bottom sheet on mobile, and it reads just as well
 * on desktop as a slide-up panel, so one implementation covers both rather
 * than branching on viewport width.
 *
 * Uses the existing partial_close/full_close server commands unchanged
 * (packages/database/src/trading.ts already implements both, including the
 * exact per-fill eligibility/duration/fee-allocation fields this preview
 * mirrors) — this component adds UI, not new financial logic. When the
 * market is stale, the same "close" action instead queues the reduction
 * (packages/database/src/position-reduction-queue.ts) for execution on the
 * first fresh tick.
 */
export function PartialCloseSheet({
  open,
  onClose,
  position,
  spec,
  tick,
  pending,
  rejection,
  queuedReductions,
  onSubmitPartialClose,
  onSubmitFullClose,
  onQueueReduction,
  onCancelQueuedReduction,
}: PartialCloseSheetProps) {
  const [preset, setPreset] = useState<Preset>(25);
  const [customQuantity, setCustomQuantity] = useState('');

  useEffect(() => {
    if (open) {
      setPreset(25);
      setCustomQuantity('');
    }
  }, [open, position?.id]);

  if (!position || !spec) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Clôture partielle">
        <Text variant="body-sm" color="secondary">
          Cette position n’est plus ouverte.
        </Text>
      </BottomSheet>
    );
  }

  const isStale = tick?.marketStatus !== 'open';
  const existingQueued = queuedReductions.find((q) => q.positionId === position.id);

  const presetQuantities: Record<25 | 50 | 75, string | null> = {
    25: computePartialClosePresetQuantity({
      openQuantity: position.openQuantity,
      percent: 25,
      quantityStep: spec.quantityStep,
      minimumQuantity: spec.minimumQuantity,
    }),
    50: computePartialClosePresetQuantity({
      openQuantity: position.openQuantity,
      percent: 50,
      quantityStep: spec.quantityStep,
      minimumQuantity: spec.minimumQuantity,
    }),
    75: computePartialClosePresetQuantity({
      openQuantity: position.openQuantity,
      percent: 75,
      quantityStep: spec.quantityStep,
      minimumQuantity: spec.minimumQuantity,
    }),
  };

  const quantity =
    preset === 'custom'
      ? customQuantity.trim()
        ? roundCustomPartialCloseQuantity({
            requestedQuantity: customQuantity.trim(),
            openQuantity: position.openQuantity,
            quantityStep: spec.quantityStep,
          })
        : null
      : presetQuantities[preset];

  const quantityValid =
    quantity !== null &&
    isPartialCloseQuantityValid({
      requestedQuantity: quantity,
      openQuantity: position.openQuantity,
    });

  const remainingQuantity = quantityValid
    ? subtractQuantity(position.openQuantity, quantity!)
    : null;

  const closePrice = tick
    ? quotedPrice({ bid: tick.bid, ask: tick.ask, positionSide: position.side, action: 'close' })
    : null;

  const preview =
    quantityValid && closePrice
      ? (() => {
          const grossPnl = computeRealizedPnl({
            openPrice: position.averageOpenPrice,
            closePrice,
            quantity: quantity!,
            contractSize: spec.contractSize,
            positionSide: position.side,
          });
          const commission = computeCommission({
            quantity: quantity!,
            commissionPerLot: spec.commissionPerLot,
          });
          const netPnl = computeNetPnlAfterFees({ grossPnl, fees: commission });
          // Client preview only — the server independently computes duration
          // from its own authoritative opened_at/now at execution time; this
          // uses the same pure computeProfitEligibility with the browser's
          // clock, purely to preview the warning copy before submitting.
          const eligibility = computeProfitEligibility({
            openedAt: new Date(position.openedAt),
            closedAt: new Date(),
            realizedPnl: grossPnl,
            allocatedFees: commission,
          });
          const remainingMargin =
            remainingQuantity && closePrice
              ? estimateRequiredMargin({
                  quantity: remainingQuantity,
                  price: closePrice,
                  contractSize: spec.contractSize,
                  leverage: spec.leverage,
                })
              : null;
          return { grossPnl, commission, netPnl, eligibility, remainingMargin };
        })()
      : null;

  const disabledReason = (percent: 25 | 50 | 75): string | null => {
    if (presetQuantities[percent] !== null) return null;
    return 'Arrondi au pas du lot impossible pour ce pourcentage — utilisez Personnalisé ou Fermer entièrement.';
  };

  const submit = () => {
    if (!quantityValid || !quantity) return;
    if (isStale) {
      onQueueReduction({ positionId: position.id, mode: 'partial', quantity });
    } else {
      onSubmitPartialClose({ positionId: position.id, quantity });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`Clôture partielle — ${position.symbol}`}>
      <div className="flex flex-col gap-4">
        <Text variant="body-sm" color="secondary" className="wariba-data">
          Position actuelle : {position.side === 'buy' ? 'ACHAT' : 'VENTE'}{' '}
          {formatQuantityForDisplay(position.openQuantity, spec.quantityStep)} {position.symbol}
        </Text>

        {existingQueued && existingQueued.status === 'queued' && (
          <WariXInlineStatus
            tone="information"
            title="En attente de reprise du marché"
            description={
              <>
                <p>
                  Une réduction de {existingQueued.requestedQuantity ?? 'la totalité'} lot est en
                  attente depuis {new Date(existingQueued.queuedAt).toLocaleTimeString('fr-FR')}.
                  Elle s’exécutera automatiquement au premier prix à jour.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  disabled={pending}
                  onClick={() => onCancelQueuedReduction(existingQueued.id)}
                >
                  Annuler la demande en attente
                </Button>
              </>
            }
          />
        )}

        {isStale && !existingQueued && (
          <WariXInlineStatus
            tone="warning"
            title="Cours non actualisé"
            description="Votre demande sera mise en attente et exécutée automatiquement au premier prix disponible, jamais contre un ancien prix."
          />
        )}

        <div className="flex flex-col gap-2">
          <Text variant="label-sm" color="tertiary">
            Clôturer
          </Text>
          <div className="flex gap-2">
            {([25, 50, 75] as const).map((percent) => (
              <Button
                key={percent}
                variant={preset === percent ? 'primary' : 'secondary'}
                size="sm"
                disabled={disabledReason(percent) !== null}
                title={disabledReason(percent) ?? undefined}
                onClick={() => setPreset(percent)}
                className="flex-1"
              >
                {percent}%
              </Button>
            ))}
            <Button
              variant={preset === 'custom' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPreset('custom')}
              className="flex-1"
            >
              Personnalisé
            </Button>
          </div>
          {preset === 'custom' && (
            <Input
              label="Quantité à clôturer (lots)"
              type="text"
              inputMode="decimal"
              name="partialCloseQuantity"
              value={customQuantity}
              onChange={(e) => setCustomQuantity(e.target.value)}
              helperText={`Pas ${spec.quantityStep} · Maximum ${formatQuantityForDisplay(position.openQuantity, spec.quantityStep)}`}
            />
          )}
        </div>

        {quantityValid && quantity && (
          <div className="flex flex-col gap-0.5 rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-elevated)] p-3">
            <Text variant="body-sm" color="secondary" className="wariba-data">
              Quantité à clôturer : {quantity} lot
            </Text>
            <Text variant="body-sm" color="secondary" className="wariba-data">
              Restant après clôture :{' '}
              {remainingQuantity && formatQuantityForDisplay(remainingQuantity, spec.quantityStep)}{' '}
              lot
            </Text>
            {closePrice && (
              <Text variant="body-sm" color="secondary" className="wariba-data">
                Prix estimé de clôture : {closePrice}
              </Text>
            )}
            {preview && (
              <>
                <Text variant="body-sm" color="secondary" className="wariba-data">
                  Commission estimée : {preview.commission} USD
                </Text>
                <Text
                  variant="body-sm"
                  className="wariba-data font-semibold"
                  color={Number(preview.netPnl) >= 0 ? 'primary' : 'secondary'}
                >
                  PnL net estimé : {Number(preview.netPnl) >= 0 ? '+' : ''}
                  {preview.netPnl} USD
                </Text>
                <Text variant="body-sm" color="secondary" className="wariba-data">
                  PnL éligible estimé : {preview.eligibility.eligibleRealizedPnl} USD
                </Text>
                {preview.remainingMargin && (
                  <Text variant="body-sm" color="secondary" className="wariba-data">
                    Marge requise restante (estimation) : {preview.remainingMargin} USD
                  </Text>
                )}
              </>
            )}
          </div>
        )}

        {preview?.eligibility.isShortDurationProfit && (
          <WariXInlineStatus
            tone="warning"
            title="Portion profitable détenue moins de 60 secondes"
            description="Le profit apparaîtra dans votre solde, mais ne comptera pas pour votre évaluation, votre réserve, vos Jours de Performance, la règle du Meilleur Jour ou votre retrait."
          />
        )}

        {rejection && (
          <WariXInlineStatus
            tone="danger"
            title="Demande refusée"
            description={
              <>
                <p>{rejection.reason}</p>
                <p>{rejection.action}</p>
              </>
            }
          />
        )}

        {quantityValid === false && preset === 'custom' && customQuantity.trim() && (
          <WariXInlineStatus
            tone="warning"
            title="Quantité invalide"
            description="La quantité doit être inférieure à la position ouverte et respecter le pas du lot. Utilisez « Fermer la position entière » pour tout clôturer."
          />
        )}

        {quantityValid && quantity && (
          <Text variant="body-sm" color="secondary">
            Clôturer {quantity} sur{' '}
            {formatQuantityForDisplay(position.openQuantity, spec.quantityStep)} lot ?
            {preview && (
              <>
                {' '}
                Résultat estimé : {Number(preview.netPnl) >= 0 ? '+' : ''}
                {preview.netPnl} USD. Position restante :{' '}
                {remainingQuantity &&
                  formatQuantityForDisplay(remainingQuantity, spec.quantityStep)}{' '}
                lot.
              </>
            )}
          </Text>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={pending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={pending}
            disabled={
              !quantityValid || Boolean(existingQueued && existingQueued.status === 'queued')
            }
            className="flex-1"
          >
            {isStale ? 'Mettre en file la clôture partielle' : 'Confirmer la clôture partielle'}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            isStale
              ? onQueueReduction({ positionId: position.id, mode: 'full' })
              : onSubmitFullClose(position.id)
          }
        >
          Fermer la position entière à la place
        </Button>
      </div>
    </BottomSheet>
  );
}
