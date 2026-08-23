import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';

/**
 * The trader's own record, one closed trade at a time.
 *
 * ## What a "trade" is here
 *
 * A row in `app.fills` is an execution, not a trade. A trade is a round trip:
 * an opening fill and the closing fill that realised it. `fills.opening_fill_id`
 * is the link the execution engine already writes, so a journal entry is a
 * close fill joined back to its own open — which is what gives an entry price,
 * an exit price, a direction and a duration that are all genuinely the same
 * position rather than three numbers from three different rows.
 *
 * Partial closes therefore appear as separate entries, because that is what
 * they are: two exits on one position, each with its own price and its own
 * result. Merging them would produce an average exit price the trader never
 * traded at.
 *
 * ## No notes, no tags, no setups
 *
 * Those are a real feature with a real table, and no such table exists. The
 * prompt's own rule applies: do not claim a capability that is not
 * implemented. The journal reads what the platform recorded; annotation
 * arrives when there is somewhere to store it.
 */

export type JournalOutcome = 'win' | 'loss' | 'breakeven';
export type JournalDirection = 'long' | 'short';

export interface JournalEntry {
  id: string;
  symbol: string;
  direction: JournalDirection;
  /** Lots, as recorded. */
  quantity: string;
  entryPrice: string | null;
  exitPrice: string;
  netPnl: string;
  netPnlFormatted: string;
  outcome: JournalOutcome;
  /** Commission charged on the close, already signed as a cost. */
  commission: string;
  durationMs: number | null;
  durationLabel: string | null;
  /** `22 août 2026, 14:38` */
  timestampLabel: string;
  occurredAt: string;
  /**
   * Why part of a profit may not count toward the objective. Present only when
   * the platform actually recorded a reason — never inferred here.
   */
  eligibilityNote: string | null;
}

export interface JournalFilters {
  from?: Date;
  to?: Date;
  symbol?: string;
  outcome?: JournalOutcome;
  direction?: JournalDirection;
}

export interface JournalView {
  entries: JournalEntry[];
  /** Every symbol this account has actually closed a trade on, for the filter. */
  symbols: string[];
  totalCount: number;
}

export interface BuildJournalViewParams extends JournalFilters {
  accountId: string;
  limit?: number;
}

const ELIGIBILITY_NOTE: Record<string, string> = {
  short_duration_profit: 'Profit non retenu pour l’objectif : position tenue moins de 60 secondes.',
  loss_counted: 'Perte intégralement comptée.',
  breakeven: 'Résultat nul.',
  eligible: '',
};

function formatUsd(amount: Decimal | string): string {
  const value = new Decimal(amount);
  const sign = value.greaterThan(0) ? '+' : '';
  return `${sign}${value.toDecimalPlaces(2).toNumber().toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

/** `2 min 14 s` — compact enough for a table cell, precise enough to be useful. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours} h` : `${hours} h ${remainingMinutes} min`;
}

export async function buildJournalView(
  db: Db,
  params: BuildJournalViewParams,
): Promise<JournalView> {
  let query = db
    .selectFrom('app.fills as closing')
    .leftJoin('app.fills as opening', 'opening.id', 'closing.opening_fill_id')
    .select([
      'closing.id as id',
      'closing.symbol as symbol',
      'closing.side as side',
      'closing.quantity as quantity',
      'closing.price as exitPrice',
      'closing.realized_pnl as realizedPnl',
      'closing.net_realized_pnl as netRealizedPnl',
      'closing.commission as commission',
      'closing.duration_ms as durationMs',
      'closing.occurred_at as occurredAt',
      'closing.eligibility_reason as eligibilityReason',
      'opening.price as entryPrice',
    ])
    .where('closing.account_id', '=', params.accountId)
    .where('closing.fill_type', '=', 'close')
    .orderBy('closing.occurred_at', 'desc');

  if (params.from) query = query.where('closing.occurred_at', '>=', params.from);
  if (params.to) query = query.where('closing.occurred_at', '<', params.to);
  if (params.symbol) query = query.where('closing.symbol', '=', params.symbol as never);

  const rows = await query.limit(params.limit ?? 200).execute();

  const entries = rows
    .map((row): JournalEntry => {
      const pnl = new Decimal(row.netRealizedPnl ?? row.realizedPnl);
      const durationMs =
        row.durationMs === null ? null : Number.parseInt(row.durationMs as string, 10);
      const note = row.eligibilityReason ? ELIGIBILITY_NOTE[row.eligibilityReason] : undefined;

      return {
        id: row.id as string,
        symbol: row.symbol as string,
        /*
         * The closing side is the opposite of the trade's direction: a long is
         * closed by a sell. Reading direction off the close fill without this
         * inversion labels every winning long as a short.
         */
        direction: row.side === 'sell' ? 'long' : 'short',
        quantity: row.quantity as string,
        entryPrice: (row.entryPrice as string | null) ?? null,
        exitPrice: row.exitPrice as string,
        netPnl: pnl.toFixed(2),
        netPnlFormatted: formatUsd(pnl),
        outcome: pnl.greaterThan(0) ? 'win' : pnl.lessThan(0) ? 'loss' : 'breakeven',
        commission: new Decimal(row.commission as string).toFixed(2),
        durationMs,
        durationLabel: durationMs === null ? null : formatDuration(durationMs),
        timestampLabel: (row.occurredAt as Date).toLocaleString('fr-FR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        occurredAt: (row.occurredAt as Date).toISOString(),
        eligibilityNote: note && note.length > 0 ? note : null,
      };
    })
    /*
     * Outcome and direction are filtered here rather than in SQL because both
     * are derived — outcome from a signed decimal that may live in either of
     * two columns, direction from an inversion. Pushing them into the query
     * would mean duplicating that logic in a WHERE clause where it could drift.
     */
    .filter((entry) => (params.outcome ? entry.outcome === params.outcome : true))
    .filter((entry) => (params.direction ? entry.direction === params.direction : true));

  const symbols = [...new Set(rows.map((row) => row.symbol as string))].sort();

  return { entries, symbols, totalCount: entries.length };
}
