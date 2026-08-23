import type { JournalEntry } from '@wariba/application';

/**
 * The trading record, as a record.
 *
 * ## Why this exists alongside the cards
 *
 * `TradeRow` renders one trade as a card at every width, and its reasoning is
 * sound where it applies: a seven-column table squeezed to 320px is unreadable
 * whichever columns survive, and choosing which to drop is choosing which fact
 * the trader on a phone is not allowed to have.
 *
 * But that argument is about 320px, and it was being applied at 1440. On a
 * laptop the cards left two thirds of the row empty and put the entry price,
 * the exit price and the quantity — the three things that make a record a
 * record rather than a list of outcomes — behind a click. A trader reviewing
 * eleven trades had to open eleven disclosures to see what they actually did.
 *
 * So: table from `lg` up, cards below it. Same read model, same figures, two
 * presentations of one truth, each suited to the space it has.
 *
 * ## Why every column is scannable
 *
 * Tabular numerals throughout and right-aligned numeric columns, so the digits
 * line up down the page. A column of prices whose decimal points wander cannot
 * be compared at a glance, and comparison is the only reason to put them in a
 * column.
 */

const OUTCOME_COLOR: Record<JournalEntry['outcome'], string> = {
  win: 'var(--wariba-accent-emerald)',
  loss: 'var(--wariba-accent-red)',
  breakeven: 'var(--wariba-text-secondary)',
};

export function JournalTable({ entries }: { entries: readonly JournalEntry[] }) {
  return (
    /*
     * The scroll container is the table's own, not the page's. §32: wide
     * content scrolls inside its module; the document body never scrolls
     * sideways.
     */
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full border-collapse text-left" data-testid="journal-table">
        <caption className="sr-only">
          Aller-retours clôturés : date, instrument, sens, quantité, prix d’entrée, prix de sortie,
          durée et résultat net.
        </caption>
        <thead>
          <tr className="border-b border-[color:var(--warix-border-subtle)]">
            {[
              { label: 'Date', align: 'left' },
              { label: 'Instrument', align: 'left' },
              { label: 'Sens', align: 'left' },
              { label: 'Quantité', align: 'right' },
              { label: 'Entrée', align: 'right' },
              { label: 'Sortie', align: 'right' },
              { label: 'Durée', align: 'right' },
              { label: 'Résultat net', align: 'right' },
            ].map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`px-3 pb-2.5 text-[length:var(--wariba-font-size-label-sm)] font-medium text-[color:var(--wariba-text-tertiary)] ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              data-testid="journal-table-row"
              data-outcome={entry.outcome}
              className="border-b border-[color:var(--warix-border-subtle)] last:border-0 transition-colors hover:bg-[color:var(--warix-surface-hover)] motion-reduce:transition-none"
            >
              <td className="whitespace-nowrap px-3 py-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {entry.timestampLabel}
              </td>
              <td className="wariba-data whitespace-nowrap px-3 py-3 text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
                {entry.symbol}
              </td>
              <td className="px-3 py-3">
                {/*
                 * Buy/Sell stay English — the vocabulary traders actually use —
                 * and carry a colour dot so direction is not colour-only.
                 */}
                <span
                  className="inline-flex items-center gap-1.5 text-[length:var(--wariba-font-size-body-sm)]"
                  style={{
                    color:
                      entry.direction === 'long'
                        ? 'var(--wariba-accent-emerald)'
                        : 'var(--wariba-accent-red)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: 'currentColor' }}
                  />
                  {entry.direction === 'long' ? 'Buy' : 'Sell'}
                </span>
              </td>
              <td className="wariba-data whitespace-nowrap px-3 py-3 text-right tabular-nums text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {entry.quantity}
              </td>
              <td className="wariba-data whitespace-nowrap px-3 py-3 text-right tabular-nums text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {/* Null on rows written before opening-fill linkage existed —
                    a dash, never a fabricated price. */}
                {entry.entryPrice ?? '—'}
              </td>
              <td className="wariba-data whitespace-nowrap px-3 py-3 text-right tabular-nums text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {entry.exitPrice}
              </td>
              <td className="wariba-data whitespace-nowrap px-3 py-3 text-right tabular-nums text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-tertiary)]">
                {entry.durationLabel ?? '—'}
              </td>
              {/*
               * Not `whitespace-nowrap`: the eligibility note below is a
               * sentence, and forbidding it to wrap made the table wider than
               * its own scroll container — pushing this column, the one the
               * whole row exists for, off the right edge.
               */}
              <td
                className="px-3 py-3 text-right align-top"
                style={{ color: OUTCOME_COLOR[entry.outcome] }}
              >
                <span className="wariba-data whitespace-nowrap tabular-nums text-[length:var(--wariba-font-size-body-sm)] font-semibold">
                  {entry.netPnlFormatted}
                </span>
                {/*
                 * The eligibility note belongs on the figure it qualifies. A
                 * short-duration profit counts toward the balance but not
                 * toward the objective, and a trader who learns that from a
                 * support ticket has been failed by this table.
                 */}
                {entry.eligibilityNote ? (
                  <span className="ml-auto mt-1 block max-w-[24ch] text-[length:var(--wariba-font-size-label-sm)] font-normal leading-snug text-[color:var(--wariba-accent-amber)]">
                    {entry.eligibilityNote}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
