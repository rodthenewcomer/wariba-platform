'use client';

import { memo } from 'react';
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  MobileStructuredRow,
  Text,
} from '@wariba/ui';
import type { AccountSnapshot, FillDTO } from '@wariba/contracts';
import {
  ELIGIBILITY_BADGE_VARIANT,
  ELIGIBILITY_LABEL,
  formatDuration,
  formatOrderTimestamp,
} from '../../trade-labels';
import { DockEmptyState } from './DockEmptyState';

export interface TradesPanelProps {
  snapshot: AccountSnapshot | null;
}

/**
 * Trades — W1's "Historique", reframed rather than rebuilt (W2 §19).
 *
 * It remains **fill-driven**: every row is a close fill from
 * `AccountSnapshot.recentFills`, carrying the server's own net P&L, eligible
 * P&L and 60-second eligibility classification. It is deliberately not order
 * truth — an order says what was asked for, a fill says what happened, and
 * program progression is computed from fills.
 *
 * No eligibility is recomputed here. `eligibleRealizedPnl` and
 * `eligibilityReason` arrive already decided by the server; the browser only
 * labels them.
 */
export const TradesPanel = memo(function TradesPanel({ snapshot }: TradesPanelProps) {
  const closes = (snapshot?.recentFills ?? []).filter(
    (fill): fill is FillDTO & { eligibilityReason: NonNullable<FillDTO['eligibilityReason']> } =>
      fill.fillType === 'close' && fill.eligibilityReason !== null,
  );

  return (
    <div className="flex flex-col gap-2">
      {snapshot?.profitEligibility.enabled && (
        <Text variant="body-sm" color="secondary" className="block max-w-4xl">
          La balance réelle inclut chaque résultat. Seul le profit net positif d’une clôture détenue
          moins de 60 secondes est exclu de la progression WARIBA ; les pertes nettes comptent
          toujours.
        </Text>
      )}
      <div className="lg:hidden">
        {closes.length === 0 ? (
          <DockEmptyState
            title="Aucune clôture exécutée"
            hint="Les positions fermées de cette session apparaîtront ici."
          />
        ) : (
          closes.map((fill) => (
            <MobileStructuredRow
              key={fill.id}
              primary={`${fill.symbol} · ${fill.side === 'buy' ? 'Achat' : 'Vente'} ${fill.quantity}`}
              secondary={`${fill.openingPrice} → ${fill.price}`}
              trailing={`${fill.netRealizedPnl ?? '—'} USD`}
              details={
                <span className="flex flex-wrap items-center gap-2">
                  <span>{formatDuration(fill.durationMs)}</span>
                  <Badge variant={ELIGIBILITY_BADGE_VARIANT[fill.eligibilityReason]}>
                    {ELIGIBILITY_LABEL[fill.eligibilityReason]}
                  </Badge>
                  <span>Éligible {fill.eligibleRealizedPnl ?? '—'} USD</span>
                </span>
              }
            />
          ))
        )}
      </div>
      <div className="hidden lg:block">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Clôture</DataTableHeaderCell>
              <DataTableHeaderCell>Symbole</DataTableHeaderCell>
              <DataTableHeaderCell>Sens</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Quantité</DataTableHeaderCell>
              <DataTableHeaderCell>Ouverture → clôture</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Durée</DataTableHeaderCell>
              <DataTableHeaderCell align="right">PnL net</DataTableHeaderCell>
              <DataTableHeaderCell align="right">PnL éligible</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Règle</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {closes.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={9} className="p-0">
                  <DockEmptyState
                    title="Aucune clôture exécutée"
                    hint="Les positions fermées de cette session apparaîtront ici."
                  />
                </DataTableCell>
              </DataTableRow>
            ) : (
              closes.map((fill) => (
                <DataTableRow key={fill.id}>
                  <DataTableCell numeric>{formatOrderTimestamp(fill.occurredAt)}</DataTableCell>
                  <DataTableCell>{fill.symbol}</DataTableCell>
                  <DataTableCell>{fill.side === 'buy' ? 'Achat' : 'Vente'}</DataTableCell>
                  <DataTableCell numeric>{fill.quantity}</DataTableCell>
                  <DataTableCell numeric>
                    {fill.openingPrice} → {fill.price}
                  </DataTableCell>
                  <DataTableCell numeric>{formatDuration(fill.durationMs)}</DataTableCell>
                  <DataTableCell numeric>{fill.netRealizedPnl ?? '—'} USD</DataTableCell>
                  <DataTableCell numeric>{fill.eligibleRealizedPnl ?? '—'} USD</DataTableCell>
                  <DataTableCell align="right">
                    <Badge variant={ELIGIBILITY_BADGE_VARIANT[fill.eligibilityReason]}>
                      {ELIGIBILITY_LABEL[fill.eligibilityReason]}
                    </Badge>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
});
