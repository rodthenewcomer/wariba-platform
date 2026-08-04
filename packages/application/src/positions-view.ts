import type { Db } from '@wariba/database';

export interface OpenPositionItem {
  id: string;
  symbol: string;
  sideLabel: string;
  quantityFormatted: string;
  entryPriceFormatted: string;
  openedAtLabel: string;
}

export interface BuildOpenPositionsViewParams {
  accountId: string;
}

/**
 * Prompt 06 Hub addition — lists open positions with no live market price
 * or unrealized PnL (ENG-028: no live price source is reachable from a
 * server-rendered page). Entry price and size only; floating PnL stays
 * WariX's job.
 */
export async function buildOpenPositionsView(
  db: Db,
  params: BuildOpenPositionsViewParams,
): Promise<OpenPositionItem[]> {
  const rows = await db
    .selectFrom('app.positions')
    .select(['id', 'symbol', 'side', 'open_quantity', 'average_open_price', 'opened_at'])
    .where('account_id', '=', params.accountId)
    .where('status', '=', 'open')
    .orderBy('opened_at', 'desc')
    .execute();

  return rows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    sideLabel: row.side === 'buy' ? 'Achat' : 'Vente',
    // Postgres numeric columns return their full declared scale (e.g.
    // "0.1000") — trim to the conventional 2-decimal lot size for display.
    quantityFormatted: Number.parseFloat(row.open_quantity).toFixed(2),
    entryPriceFormatted: row.average_open_price,
    openedAtLabel: row.opened_at.toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  }));
}
