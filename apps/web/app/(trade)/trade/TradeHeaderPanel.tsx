'use client';

import { memo } from 'react';
import { AccountContext, Alert, RiskRibbon, type RiskRibbonStatus } from '@wariba/ui';
import type { AccountRisk } from '@wariba/contracts';
import { TradeRiskDetail } from './TradeRiskDetail';

export interface TradeHeaderPanelProps {
  accountId: string;
  balanceFormatted: string;
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
  balanceFormatted,
  connectionOk,
  riskRibbonStatus,
  risk,
  isResyncing,
}: TradeHeaderPanelProps) {
  return (
    <>
      <AccountContext
        program="WARIBA ONE"
        nominalFormatted={balanceFormatted}
        publicId={accountId.slice(0, 8).toUpperCase()}
        statusLabel={connectionOk ? 'Actif' : 'Connexion...'}
        statusVariant={connectionOk ? 'success' : 'warning'}
      />
      <RiskRibbon
        status={riskRibbonStatus}
        dailyLossRemaining={risk ? `${risk.dailyLoss.remaining} USD` : '—'}
        maximumLossRemaining={risk ? `${risk.maximumLoss.remaining} USD` : '—'}
        nextResetLabel="00:00 UTC"
        connectionOk={connectionOk}
      />
      {risk && <TradeRiskDetail risk={risk} />}
      {isResyncing && (
        <Alert level="warning" title="Resynchronisation en cours">
          Un écart de séquence a été détecté. Les ordres restent bloqués jusqu&apos;au nouveau
          snapshot serveur.
        </Alert>
      )}
    </>
  );
});
