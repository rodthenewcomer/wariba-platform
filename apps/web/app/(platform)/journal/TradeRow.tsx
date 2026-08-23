'use client';

import { useState } from 'react';
import type { JournalEntry } from '@wariba/application';
import { HubIcon } from '../../../components/hub/icons';
import { StatusPill } from '../../../components/hub/StatusPill';

/**
 * One closed trade.
 *
 * ## Cards, not a squeezed table
 *
 * The same component at every width, laid out as a card and not as a table row
 * that has had its columns hidden. A seven-column table compressed to 320px is
 * unreadable whichever columns survive, and choosing which to drop is choosing
 * which fact the trader on a phone is not allowed to have.
 *
 * The summary line carries what identifies the trade — instrument, direction,
 * result. Everything else is one tap away, which keeps a list of forty trades
 * scannable while losing nothing.
 */
export function TradeRow({ entry }: { entry: JournalEntry }) {
  const [open, setOpen] = useState(false);

  const color =
    entry.outcome === 'win'
      ? 'var(--wariba-accent-emerald)'
      : entry.outcome === 'loss'
        ? 'var(--wariba-accent-red)'
        : 'var(--wariba-text-secondary)';

  return (
    <li
      data-testid="journal-entry"
      data-outcome={entry.outcome}
      className="overflow-hidden rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)]"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 p-3.5 text-left transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          <HubIcon role={entry.direction === 'long' ? 'performance' : 'warning'} size={18} active />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="wariba-data text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {entry.symbol}
            </span>
            {/* Buy/Sell stay English — the vocabulary traders actually use. */}
            <StatusPill tone={entry.direction === 'long' ? 'success' : 'danger'} size="sm">
              {entry.direction === 'long' ? 'Buy' : 'Sell'}
            </StatusPill>
            <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {entry.quantity} lot
            </span>
          </span>
          {/*
           * Wraps rather than truncates.
           *
           * `truncate` cut this line at "21 août 2026, 01:27…" on a 390px
           * phone, which discarded the holding duration — the one figure on
           * the summary line that says *how* the trade was taken rather than
           * when. Losing it to an ellipsis makes a scalp and a four-hour swing
           * look identical in the list. The line is two short facts; letting
           * it use a second row costs less than hiding one of them.
           */}
          <span className="text-[length:var(--wariba-font-size-label-sm)] leading-snug text-[color:var(--wariba-text-tertiary)]">
            {entry.timestampLabel}
            {entry.durationLabel ? ` · ${entry.durationLabel}` : ''}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span
            className="wariba-data text-[length:var(--wariba-font-size-body-md)] font-semibold"
            style={{ color }}
          >
            {entry.netPnlFormatted}
          </span>
          <span
            aria-hidden="true"
            className={`text-[color:var(--wariba-text-tertiary)] transition-transform duration-[var(--wariba-component-workstation-motion-interaction)] motion-reduce:transition-none ${
              open ? 'rotate-90' : ''
            }`}
          >
            <HubIcon role="chevron" size={16} />
          </span>
        </span>
      </button>

      {open ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[color:var(--warix-border-subtle)] bg-[color:color-mix(in_srgb,var(--warix-canvas)_40%,transparent)] p-3.5 sm:grid-cols-4">
          {[
            { label: 'Entrée', value: entry.entryPrice ?? '—' },
            { label: 'Sortie', value: entry.exitPrice },
            { label: 'Durée', value: entry.durationLabel ?? '—' },
            { label: 'Commission', value: `${entry.commission} USD` },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {row.label}
              </dt>
              <dd className="wariba-data mt-0.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                {row.value}
              </dd>
            </div>
          ))}
          {entry.eligibilityNote ? (
            <div className="col-span-full">
              <p className="rounded-[8px] border border-[color:var(--wariba-accent-amber-edge)] bg-[color:var(--wariba-accent-amber-wash)] p-2.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-primary)]">
                {entry.eligibilityNote}
              </p>
            </div>
          ) : null}
        </dl>
      ) : null}
    </li>
  );
}
