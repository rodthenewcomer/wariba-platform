'use client';

import { useMemo } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Input,
  MissionProgress,
  Text,
  type BadgeVariant,
  type MissionCondition,
} from '@wariba/ui';
import type { PayoutRequestDTO, PerformanceProgressDTO } from '@wariba/contracts';

export interface PayoutCenterPanelProps {
  performanceProgress: PerformanceProgressDTO | null;
  payoutRequests: PayoutRequestDTO[];
  requestedAmount: string;
  onRequestedAmountChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  amountError: string | null;
}

const PAYOUT_STATUS_LABEL: Record<PayoutRequestDTO['status'], string> = {
  pending_review: 'En revue',
  needs_information: 'Information requise',
  approved: 'Approuvé',
  rejected: 'Refusé',
  processing: 'En cours de versement',
  paid: 'Versé',
  failed: 'Échec du versement',
  cancelled: 'Annulé',
};

const PAYOUT_STATUS_BADGE_VARIANT: Record<PayoutRequestDTO['status'], BadgeVariant> = {
  pending_review: 'information',
  needs_information: 'warning',
  approved: 'information',
  rejected: 'danger',
  processing: 'information',
  paid: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

function toPercent(ratio: string): number {
  return Math.round(Number(ratio) * 100);
}

/**
 * Same precedence evaluatePayoutEligibility uses server-side
 * (packages/database/src/payouts.ts) so the disabled state here never
 * disagrees with what a submit would actually get rejected for — this is a
 * proactive UX shortcut, never the authority: the server re-evaluates from
 * scratch on every request_payout, regardless of what this function says.
 */
function resolveBlockingReason(progress: PerformanceProgressDTO): string | null {
  if (progress.cycleStatus === 'payout_pending') {
    return 'Une demande de payout est déjà en cours de revue pour ce cycle.';
  }
  if (!progress.bufferReached) {
    return `Le solde éligible n’a pas encore dépassé le plancher du buffer permanent (${formatUsd(progress.bufferFloor)}).`;
  }
  if (progress.performanceDaysCompleted < progress.performanceDaysRequired) {
    return `Il manque des Performance Days pour ce cycle (${progress.performanceDaysCompleted} / ${progress.performanceDaysRequired}).`;
  }
  if (!progress.consistencyCompliant) {
    return 'La meilleure journée dépasse 50 % du profit positif total — répartissez le profit sur d’autres journées.';
  }
  if (progress.openPositionBlocking) {
    return 'Une position est ouverte — fermez-la avant de demander un payout.';
  }
  if (progress.pendingOrderBlocking) {
    return 'Un ordre en attente est actif — annulez-le avant de demander un payout.';
  }
  if (!progress.kycVerified) {
    return 'Vérification d’identité sandbox non complétée.';
  }
  if (!progress.payoutMethodConfigured) {
    return 'Aucune méthode de payout sandbox configurée.';
  }
  return null;
}

function toConditions(progress: PerformanceProgressDTO): MissionCondition[] {
  return [
    {
      label: 'Buffer permanent atteint',
      detail: progress.bufferReached
        ? `Excédent éligible : ${formatUsd(progress.eligibleExcess)}`
        : `Plancher : ${formatUsd(progress.bufferFloor)}`,
      met: progress.bufferReached,
    },
    {
      label: 'Performance Days',
      detail: `${progress.performanceDaysCompleted} / ${progress.performanceDaysRequired} — seuil ${formatUsd(progress.performanceDayThreshold)}/jour`,
      met: progress.performanceDaysCompleted >= progress.performanceDaysRequired,
    },
    {
      label: 'Consistance',
      detail:
        progress.consistencyRatio === null
          ? 'Aucune journée positive pour l’instant'
          : `${toPercent(progress.consistencyRatio)} % (limite 50 %)`,
      met: progress.consistencyCompliant,
    },
  ];
}

/**
 * Prompt 08 Phase F — the live, actionable half of Performance's trader UX
 * (the Hub's mission view is the read-only summary, this is where a payout
 * is actually requested). Lives on /trade because it needs the same WS
 * account.snapshot (performanceProgress/payoutRequests) the rest of this
 * page already subscribes to — the Hub is server-rendered per-request and
 * has no live connection to react to a just-submitted request with.
 */
export function PayoutCenterPanel({
  performanceProgress,
  payoutRequests,
  requestedAmount,
  onRequestedAmountChange,
  onSubmit,
  pending,
  amountError,
}: PayoutCenterPanelProps) {
  const conditions = useMemo(
    () => (performanceProgress ? toConditions(performanceProgress) : []),
    [performanceProgress],
  );

  if (!performanceProgress) {
    return (
      <Text variant="body-sm" color="secondary">
        Aucun cycle Performance actif — un dossier WARIBA Review a peut-être déjà été ouvert.
      </Text>
    );
  }

  const blockingReason = resolveBlockingReason(performanceProgress);
  const canSubmit = blockingReason === null && !pending;
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (Number(performanceProgress.realizedBalance) / Number(performanceProgress.bufferFloor)) *
          100,
      ),
    ),
  );

  return (
    <div id="payout" className="flex flex-col gap-4 scroll-mt-20">
      <MissionProgress
        variant="performance"
        state={blockingReason ? 'attention' : 'reached'}
        title={`Cycle de payout n°${performanceProgress.cycleNumber}`}
        progressPercent={progressPercent}
        conditions={conditions}
        nextAction={
          canSubmit ? (
            <div className="flex flex-col gap-3">
              <Input
                label="Montant net demandé"
                type="text"
                inputMode="decimal"
                name="payoutAmount"
                suffix="USD"
                value={requestedAmount}
                onChange={(e) => onRequestedAmountChange(e.target.value)}
                {...(amountError ? { errorText: amountError } : {})}
                helperText={`Plafond indicatif de ce cycle : ${formatUsd(performanceProgress.capApplied)} (brut) · Répartition trader : ${toPercent(performanceProgress.traderSplitRate)} %`}
              />
              <Button onClick={onSubmit} disabled={pending}>
                Demander un payout
              </Button>
            </div>
          ) : (
            <Text variant="body-sm" color="secondary">
              {blockingReason}
            </Text>
          )
        }
      />

      {!performanceProgress.kycVerified || !performanceProgress.payoutMethodConfigured ? (
        <Alert level="warning" title="Configuration sandbox requise">
          {!performanceProgress.kycVerified
            ? 'Vérification d’identité sandbox non complétée. '
            : ''}
          {!performanceProgress.payoutMethodConfigured
            ? 'Aucune méthode de payout sandbox configurée.'
            : ''}
        </Alert>
      ) : null}

      <Card padding="comfortable" className="flex flex-col gap-4">
        <Text as="h2" variant="heading-sm">
          Historique des payouts
        </Text>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Cycle</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Statut</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Montant net</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Demandé le</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {payoutRequests.length === 0 ? (
              <DataTableRow>
                <DataTableCell
                  colSpan={4}
                  className="text-center text-[color:var(--wariba-text-secondary)]"
                >
                  Aucune demande de payout pour l’instant.
                </DataTableCell>
              </DataTableRow>
            ) : (
              payoutRequests.map((request) => (
                <DataTableRow key={request.id}>
                  <DataTableCell>n°{request.cycleNumber}</DataTableCell>
                  <DataTableCell align="right">
                    <Badge variant={PAYOUT_STATUS_BADGE_VARIANT[request.status]}>
                      {PAYOUT_STATUS_LABEL[request.status]}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell numeric>
                    {request.traderNetCash ? formatUsd(request.traderNetCash) : '—'}
                  </DataTableCell>
                  <DataTableCell numeric>
                    {new Date(request.requestedAt).toLocaleDateString('fr-FR')}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </Card>
    </div>
  );
}
