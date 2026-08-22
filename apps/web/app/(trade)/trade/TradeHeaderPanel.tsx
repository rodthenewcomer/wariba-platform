'use client';

import { memo } from 'react';
import {
  AccountContext,
  RiskRibbon,
  Text,
  WariXInlineStatus,
  type RiskRibbonStatus,
} from '@wariba/ui';
import type { AccountRisk } from '@wariba/contracts';
import { TradeRiskDetail } from './TradeRiskDetail';

export interface TradeHeaderPanelProps {
  accountId: string;
  nominalFormatted: string;
  balanceFormatted: string;
  equityFormatted: string;
  programEligibleBalanceFormatted: string;
  connectionOk: boolean;
  riskRibbonStatus: RiskRibbonStatus;
  risk: AccountRisk | null;
  isResyncing: boolean;
}

/**
 * Account/risk chrome — none of it depends on the selected symbol's tick,
 * so it's memoized to skip re-rendering when TradeClient re-renders purely
 * because that tick changed (chart/order-ticket/guardian territory).
 */
export const TradeHeaderPanel = memo(function TradeHeaderPanel({
  accountId,
  nominalFormatted,
  balanceFormatted,
  equityFormatted,
  programEligibleBalanceFormatted,
  connectionOk,
  riskRibbonStatus,
  risk,
  isResyncing,
}: TradeHeaderPanelProps) {
  return (
    <>
      <AccountContext
        program="WARIBA ONE"
        nominalFormatted={nominalFormatted}
        publicId={accountId.slice(0, 8).toUpperCase()}
        statusLabel={connectionOk ? 'Actif' : 'Connexion...'}
        statusVariant={connectionOk ? 'success' : 'warning'}
      />
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-b border-[color:var(--wariba-border-subtle)] pb-2">
        {[
          ['Solde', balanceFormatted],
          ['Valeur', equityFormatted],
          ['Solde éligible', programEligibleBalanceFormatted],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt>
              <Text variant="label-sm" color="tertiary">
                {label}
              </Text>
            </dt>
            <dd className="wariba-data text-[length:var(--wariba-font-size-data-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <RiskRibbon
        status={riskRibbonStatus}
        dailyLossRemaining={risk ? `${risk.dailyLoss.remaining} USD` : '—'}
        maximumLossRemaining={risk ? `${risk.maximumLoss.remaining} USD` : '—'}
        nextResetLabel="00:00 UTC"
        connectionOk={connectionOk}
      />
      {risk && <TradeRiskDetail risk={risk} />}
      {risk?.shortDurationMonitoring.status === 'warning' && (
        <WariXInlineStatus
          tone="warning"
          title="Profits de très courte durée détectés"
          description={`${risk.shortDurationMonitoring.count24h} clôtures profitables sous 60 secondes sur 24 h. Elles restent visibles mais ne comptent pas dans votre progression.`}
        />
      )}
      {risk?.shortDurationMonitoring.status === 'entry_locked' && (
        <WariXInlineStatus
          tone="warning"
          title="Nouvelles ouvertures temporairement suspendues"
          description="Vous pouvez toujours réduire ou fermer vos positions. La suspension suit une fenêtre glissante de 24 h et ne crée pas automatiquement de violation permanente."
        />
      )}
      {isResyncing && (
        <WariXInlineStatus
          tone="warning"
          title="Resynchronisation en cours"
          description="Un décalage de données a été détecté. Les ordres restent bloqués jusqu’à la fin de la resynchronisation."
        />
      )}
    </>
  );
});
