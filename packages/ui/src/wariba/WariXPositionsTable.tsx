import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { MobileStructuredRow } from '../components/Workstation';

export interface WariXPosition {
  id: string;
  symbol: string;
  sideLabel: string;
  /** Which direction the label names, for the row's own colour language. */
  sideTone?: 'buy' | 'sell';
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
  /** What will appear here once positions exist. Rendered under `emptyLabel`. */
  emptyHint?: string;
}

const PNL_TONE_CLASS: Record<WariXPosition['livePnlTone'], string> = {
  positive: 'text-[color:var(--wariba-component-workstation-text-financial-positive)]',
  negative: 'text-[color:var(--wariba-component-workstation-text-financial-negative)]',
  neutral: 'text-[color:var(--wariba-component-workstation-text-primary)]',
};

const SIDE_TONE_CLASS: Record<'buy' | 'sell', string> = {
  buy: 'text-[color:var(--wariba-component-workstation-trading-buy)]',
  sell: 'text-[color:var(--wariba-component-workstation-trading-sell)]',
};

const SIDE_ACCENT_CLASS: Record<'buy' | 'sell', string> = {
  buy: 'bg-[color:var(--wariba-component-workstation-trading-buy)]',
  sell: 'bg-[color:var(--wariba-component-workstation-trading-sell)]',
};

/**
 * A dock row action.
 *
 * Visual closure §14 — the dock's actions were three full `Button` ghosts at
 * product scale, which is most of what made a populated dock read as an admin
 * table. These are workstation chips: small caps, hairline enclosure on hover,
 * and the destructive one taking a coral hover rather than being identical to
 * the other two.
 */
function RowAction({
  onClick,
  disabled,
  destructive = false,
  ariaLabel,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
      className={cx(
        'rounded-[6px] px-2 py-1 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase',
        'tracking-[var(--wariba-component-workstation-tracking-label)] transition-colors',
        'duration-[var(--wariba-component-workstation-motion-interaction)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
        'disabled:cursor-not-allowed disabled:text-[color:var(--wariba-component-workstation-border-strong)]',
        destructive
          ? 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:enabled:bg-[color:var(--wariba-component-workstation-wash-sell)] hover:enabled:text-[color:var(--wariba-component-workstation-trading-sell)]'
          : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:enabled:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:enabled:text-[color:var(--wariba-component-workstation-text-primary)]',
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Final closure §17 — a reported condition, not a missing feature.
 *
 * A semantic marker, one strong line, and one quiet line naming what will
 * occupy the surface. No illustration, no onboarding card, no call to action:
 * a dock reports.
 */
function EmptyState({ title, hint }: { title: string; hint?: string | undefined }) {
  return (
    <div className="flex min-h-16 flex-col items-center justify-center gap-1.5 px-4 py-5 text-center">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-[color:var(--wariba-component-workstation-border-strong)]"
      />
      <p className="text-[length:var(--wariba-component-workstation-type-data)] font-semibold text-[color:var(--wariba-component-workstation-text-secondary)]">
        {title}
      </p>
      {hint ? (
        <p className="max-w-[16rem] text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const HEADER_CELL =
  'px-2 py-1.5 text-[length:var(--wariba-component-workstation-type-section-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]';
const DATA_CELL =
  'wariba-data px-2 py-1.5 text-[length:var(--wariba-component-workstation-type-data)] tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)]';

/**
 * WariX's own open-positions table — distinct from the Hub's (ENG-028: no
 * floating PnL there by design). Here the live PnL is exactly the point, but
 * it's computed by the caller (TradeClient, reusing @wariba/domain's
 * quotedPrice + computeRealizedPnl against the current tick) — this
 * component only lays out already-formatted values (Design System §48).
 *
 * **Visual closure §14 — trading activity, not an administrative table.** The
 * generic `DataTable` primitive is deliberately not used here: it paints the
 * light product surface, runs 14px body copy with 12px spacing, and gives every
 * column the same weight, so a position's P&L had exactly the visual authority
 * of its stop-loss. This table is the workstation's own — a side-coloured edge
 * rule per row, the symbol in bold with its direction in the direction's colour,
 * every price at tabular 12px in secondary, and the live P&L alone at 15px in
 * its financial tone. What a trader looks at is what the row makes loudest.
 */
export function WariXPositionsTable({
  positions,
  onClose,
  onModify,
  onPartialClose,
  closeDisabled,
  emptyLabel,
  emptyHint,
}: WariXPositionsTableProps) {
  return (
    <>
      <div className="lg:hidden">
        {positions.length === 0 ? (
          <EmptyState title={emptyLabel} hint={emptyHint} />
        ) : (
          positions.map((position) => (
            <MobileStructuredRow
              key={position.id}
              {...(position.sideTone
                ? { accentClassName: SIDE_ACCENT_CLASS[position.sideTone] }
                : {})}
              primary={`${position.symbol} · ${position.sideLabel} ${position.quantityFormatted}`}
              secondary={`Entrée ${position.entryPriceFormatted} · Actuel ${position.currentPriceFormatted}`}
              trailing={
                <span className={cx('font-bold', PNL_TONE_CLASS[position.livePnlTone])}>
                  {position.livePnlFormatted}
                </span>
              }
              details={`SL ${position.stopLossFormatted} · TP ${position.takeProfitFormatted}`}
              action={
                <div className="flex flex-wrap justify-end gap-1">
                  <RowAction className="min-h-11 px-3" onClick={() => onModify(position.id)}>
                    SL / TP
                  </RowAction>
                  <RowAction
                    className="min-h-11 px-3"
                    onClick={() => onPartialClose(position.id)}
                    disabled={closeDisabled}
                  >
                    Clôture %
                  </RowAction>
                  <RowAction
                    className="min-h-11 px-3"
                    destructive
                    onClick={() => onClose(position.id)}
                    disabled={closeDisabled}
                  >
                    Fermer
                  </RowAction>
                </div>
              }
            />
          ))
        )}
      </div>
      <div className="hidden w-full overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[color:var(--wariba-component-workstation-surface-canvas)]">
            <tr className="border-b border-[color:var(--wariba-component-workstation-border-hairline)]">
              <th scope="col" className={cx(HEADER_CELL, 'text-left')}>
                Symbole
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                Taille
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                Entrée
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                Actuel
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                SL
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                TP
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                PnL
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState title={emptyLabel} hint={emptyHint} />
                </td>
              </tr>
            ) : (
              positions.map((position) => (
                <tr
                  key={position.id}
                  className="group border-b border-[color:var(--wariba-component-workstation-border-hairline)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] last:border-0 hover:bg-[color:var(--wariba-component-workstation-wash-neutral)]"
                >
                  <td className="relative py-1.5 pl-3 pr-2 text-[length:var(--wariba-component-workstation-type-data-strong)]">
                    {position.sideTone ? (
                      <span
                        aria-hidden="true"
                        className={cx(
                          'absolute bottom-1 left-0 top-1 w-0.5 rounded-r-full',
                          SIDE_ACCENT_CLASS[position.sideTone],
                        )}
                      />
                    ) : null}
                    <span className="font-bold tracking-[-0.01em] text-[color:var(--wariba-component-workstation-text-primary)]">
                      {position.symbol}
                    </span>
                    {' · '}
                    <span
                      className={cx(
                        'font-semibold',
                        position.sideTone
                          ? SIDE_TONE_CLASS[position.sideTone]
                          : 'text-[color:var(--wariba-component-workstation-text-secondary)]',
                      )}
                    >
                      {position.sideLabel}
                    </span>
                  </td>
                  <td className={cx(DATA_CELL, 'text-right')}>{position.quantityFormatted}</td>
                  <td className={cx(DATA_CELL, 'text-right')}>{position.entryPriceFormatted}</td>
                  <td
                    className={cx(
                      DATA_CELL,
                      'text-right text-[color:var(--wariba-component-workstation-text-primary)]',
                    )}
                  >
                    {position.currentPriceFormatted}
                  </td>
                  <td
                    className={cx(
                      DATA_CELL,
                      'text-right text-[color:var(--wariba-component-workstation-text-tertiary)]',
                    )}
                  >
                    {position.stopLossFormatted}
                  </td>
                  <td
                    className={cx(
                      DATA_CELL,
                      'text-right text-[color:var(--wariba-component-workstation-text-tertiary)]',
                    )}
                  >
                    {position.takeProfitFormatted}
                  </td>
                  <td
                    className={cx(
                      'wariba-data px-2 py-1.5 text-right tabular-nums',
                      'text-[length:var(--wariba-component-workstation-type-metric)] font-bold',
                      PNL_TONE_CLASS[position.livePnlTone],
                    )}
                  >
                    {position.livePnlFormatted}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className="flex justify-end gap-0.5">
                      <RowAction
                        onClick={() => onModify(position.id)}
                        ariaLabel={`Modifier SL/TP — ${position.symbol} · ${position.sideLabel}`}
                      >
                        Modifier
                      </RowAction>
                      <RowAction
                        onClick={() => onPartialClose(position.id)}
                        disabled={closeDisabled}
                        ariaLabel={`Clôture partielle — ${position.symbol} · ${position.sideLabel}`}
                      >
                        Clôture %
                      </RowAction>
                      <RowAction
                        destructive
                        onClick={() => onClose(position.id)}
                        disabled={closeDisabled}
                        ariaLabel={`Fermer ${position.symbol} · ${position.sideLabel}`}
                      >
                        Fermer
                      </RowAction>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
