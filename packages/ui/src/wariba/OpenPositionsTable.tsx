import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from '../components/DataTable';

export interface OpenPositionRow {
  id: string;
  symbol: string;
  sideLabel: string;
  quantityFormatted: string;
  entryPriceFormatted: string;
  openedAtLabel: string;
}

export interface OpenPositionsTableProps {
  positions: readonly OpenPositionRow[];
  emptyLabel?: string;
}

/**
 * Hub positions list — entry price and size only, deliberately no live
 * mark price or unrealized PnL column (ENG-028: no live price source
 * reachable here). Floating PnL stays WariX's job.
 */
export function OpenPositionsTable({
  positions,
  emptyLabel = 'Aucune position ouverte.',
}: OpenPositionsTableProps) {
  if (positions.length === 0) {
    return (
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>Symbole</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Taille</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Prix d’entrée</DataTableHeaderCell>
          <DataTableHeaderCell align="right">Ouverte depuis</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {positions.map((position) => (
          <DataTableRow key={position.id}>
            <DataTableCell>
              {position.symbol} · {position.sideLabel}
            </DataTableCell>
            <DataTableCell numeric>{position.quantityFormatted}</DataTableCell>
            <DataTableCell numeric>{position.entryPriceFormatted}</DataTableCell>
            <DataTableCell align="right">{position.openedAtLabel}</DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
