import { cx } from '../lib/cx';
import { Button } from '../components/Button';
import { MobileStructuredRow } from '../components/Workstation';
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
  onModify: (positionId: string) => void;
  /** Prompt 7 Appendix 07-C §9 — one of partial close's required entry points (position row action menu). */
  onPartialClose: (positionId: string) => void;
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
  onModify,
  onPartialClose,
  closeDisabled,
  emptyLabel,
}: WariXPositionsTableProps) {
  return (
    <>
      <div className="lg:hidden">
        {positions.length === 0 ? (
          <p className="px-2 py-3 text-center text-[12px] text-[color:var(--wariba-component-workstation-text-secondary)]">
            {emptyLabel}
          </p>
        ) : (
          positions.map((position) => (
            <MobileStructuredRow
              key={position.id}
              primary={`${position.symbol} · ${position.sideLabel} ${position.quantityFormatted}`}
              secondary={`Entrée ${position.entryPriceFormatted} · Actuel ${position.currentPriceFormatted}`}
              trailing={
                <span className={cx('font-semibold', PNL_TONE_CLASS[position.livePnlTone])}>
                  {position.livePnlFormatted}
                </span>
              }
              details={`SL ${position.stopLossFormatted} · TP ${position.takeProfitFormatted}`}
              action={
                <div className="flex flex-wrap justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11"
                    onClick={() => onModify(position.id)}
                  >
                    SL / TP
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11"
                    onClick={() => onPartialClose(position.id)}
                    disabled={closeDisabled}
                  >
                    Clôture %
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11"
                    onClick={() => onClose(position.id)}
                    disabled={closeDisabled}
                  >
                    Fermer
                  </Button>
                </div>
              }
            />
          ))
        )}
      </div>
      <div className="hidden lg:block">
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
                  <DataTableCell
                    numeric
                    className={cx('font-medium', PNL_TONE_CLASS[position.livePnlTone])}
                  >
                    {position.livePnlFormatted}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onModify(position.id)}
                        aria-label={`Modifier SL/TP — ${position.symbol} · ${position.sideLabel}`}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPartialClose(position.id)}
                        disabled={closeDisabled}
                        aria-label={`Clôture partielle — ${position.symbol} · ${position.sideLabel}`}
                      >
                        Clôture %
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClose(position.id)}
                        disabled={closeDisabled}
                        aria-label={`Fermer ${position.symbol} · ${position.sideLabel}`}
                      >
                        Fermer
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </>
  );
}
