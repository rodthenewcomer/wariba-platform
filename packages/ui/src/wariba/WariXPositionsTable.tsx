import { cx } from '../lib/cx';
import { Button } from '../components/Button';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from '../components/DataTable';

export interface WariXPosition {
  id: string;
  symbol: string;
  sideLabel: string;
  quantityFormatted: string;
  entryPriceFormatted: string;
  currentPriceFormatted: string;
  livePnlFormatted: string;
  livePnlTone: 'positive' | 'negative' | 'neutral';
  /** Already "—" when unset — this component never decides what "no SL/TP" looks like. */
  stopLossFormatted: string;
  takeProfitFormatted: string;
}

export interface WariXPositionsTableProps {
  positions: WariXPosition[];
  onClose: (positionId: string) => void;
  closeDisabled: boolean;
  emptyLabel: string;
}

const PNL_TONE_CLASS: Record<WariXPosition['livePnlTone'], string> = {
  positive: 'text-[color:var(--wariba-status-success-text)]',
  negative: 'text-[color:var(--wariba-status-danger-text)]',
  neutral: 'text-[color:var(--wariba-text-primary)]',
};

/**
 * WariX's own open-positions table — distinct from the Hub's (ENG-028: no
 * floating PnL there by design). Here the live PnL is exactly the point, but
 * it's computed by the caller (TradeClient, reusing @wariba/domain's
 * quotedPrice + computeRealizedPnl against the current tick) — this
 * component only lays out already-formatted values (Design System §48).
 */
export function WariXPositionsTable({
  positions,
  onClose,
  closeDisabled,
  emptyLabel,
}: WariXPositionsTableProps) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>Symbole</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Taille</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Entrée</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Actuel</DataTableHeaderCell>
          <DataTableHeaderCell align="right">SL</DataTableHeaderCell>
          <DataTableHeaderCell align="right">TP</DataTableHeaderCell>
          <DataTableHeaderCell align="right">PnL</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Action</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {positions.length === 0 ? (
          <DataTableRow>
            <DataTableCell
              colSpan={8}
              className="text-center text-[color:var(--wariba-text-secondary)]"
            >
              {emptyLabel}
            </DataTableCell>
          </DataTableRow>
        ) : (
          positions.map((position) => (
            <DataTableRow key={position.id}>
              <DataTableCell>
                {position.symbol} · {position.sideLabel}
              </DataTableCell>
              <DataTableCell numeric>{position.quantityFormatted}</DataTableCell>
              <DataTableCell numeric>{position.entryPriceFormatted}</DataTableCell>
              <DataTableCell numeric>{position.currentPriceFormatted}</DataTableCell>
              <DataTableCell numeric>{position.stopLossFormatted}</DataTableCell>
              <DataTableCell numeric>{position.takeProfitFormatted}</DataTableCell>
              <DataTableCell numeric className={cx('font-medium', PNL_TONE_CLASS[position.livePnlTone])}>
                {position.livePnlFormatted}
              </DataTableCell>
              <DataTableCell align="right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClose(position.id)}
                  disabled={closeDisabled}
                  aria-label={`Fermer ${position.symbol} · ${position.sideLabel}`}
                >
                  Fermer
                </Button>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTableBody>
    </DataTable>
  );
}
