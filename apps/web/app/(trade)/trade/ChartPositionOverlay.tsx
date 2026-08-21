'use client';

import { useState, type ReactNode } from 'react';
import { flashToneFor, parseFormattedNumber, useValueFlash } from './use-value-flash';

/**
 * WariX's live trade objects — the HTML layer over the chart (Appendix 07-C
 * §3-§5, rebuilt for VX1 §10-§21).
 *
 * lightweight-charts draws the horizontal stroke and the price-axis plate for a
 * level, and nothing else: its price lines take no click handler and offer no
 * per-pixel offset. So every part of a trade a trader can *act on* is one of
 * these components, absolutely positioned by TradeChart from
 * `series.priceToCoordinate` and nudged apart by chart-overlay-geometry.
 *
 * **What VX1 changed, and why.** WX1 rendered a position as one sentence —
 * `ACHAT 0.1000 EURUSD · 1.08272 -1.40 USD Gérer Fermer` — pinned to the right
 * edge of the plot. Read as a trading object rather than as a row of text, three
 * things were wrong: it repeated what the toolbar and the axis already said, it
 * cost a third of the chart's width to say it, and the number a trader actually
 * looks at (the money) had no more weight than the word "Gérer" beside it.
 *
 * A trade object here is now a **segmented chip attached to its own level**:
 *
 *     ┌───┬──────────────────┬──────┬───┐
 *     │ ⋮ │  +$95.70   TP    │ 0.10 │ × │
 *     └───┴──────────────────┴──────┴───┘
 *       │          │            │     └─ remove this level / close this position
 *       │          │            └─ the size it applies to, quiet
 *       │          └─ the consequence in money, dominant
 *       └─ drag grip: the level is movable, and says so on hover
 *
 * Four identities, never merged (§10/§13): entry is cobalt, take profit
 * emerald, stop loss coral, and the market's own current price is ice — drawn
 * by the series itself, not by this file. The chip's colour is the line's
 * colour, so a glance at either answers "which level is this".
 *
 * **This file computes nothing financial.** Every figure arrives formatted from
 * TradeChart, which derives it from the canonical estimators. The only thing
 * these components decide is what a number *looks* like when it changes.
 */

export type LevelSyncState =
  | 'confirmed'
  | 'dragging_preview'
  /**
   * VX1-D.1 §8 — dragged to a price that is not a legal side for this level.
   * Advisory and transient: the server remains the only authority on whether an
   * order is accepted, and this state exists so the trader sees the problem
   * before releasing rather than after being refused.
   */
  | 'invalid_zone'
  | 'pending_server'
  | 'stale_disabled'
  | 'rejected';

export const SYNC_DOT_CLASS: Record<LevelSyncState, string> = {
  confirmed: 'bg-[color:var(--wariba-status-success-text)]',
  dragging_preview: 'bg-[color:var(--wariba-status-information-text)]',
  invalid_zone: 'bg-[color:var(--wariba-component-workstation-trading-warning)]',
  pending_server: 'bg-[color:var(--wariba-status-warning-text)] animate-pulse',
  stale_disabled: 'bg-[color:var(--wariba-text-tertiary)]',
  // Appendix 07-D acceptance gate 4 — a modify was rejected server-side; the
  // line's price never advanced optimistically (see TradeChart's
  // PendingOrderLine/AlertLine, always bound to the server-confirmed value,
  // never the drag preview), so there is nothing to roll back numerically —
  // only this transient dot to explain why the drag "snapped back".
  rejected: 'bg-[color:var(--wariba-status-danger-text)]',
};

export type TradeObjectKind = 'entry' | 'stop_loss' | 'take_profit';

/**
 * Which edge a level was pinned to because its price is outside the visible
 * band (VX1 §21), or `null` when the object is where its price actually is.
 */
export type TradeObjectEdge = 'above' | 'below' | null;

/**
 * The caret a pinned object carries.
 *
 * It is not decoration: it is the difference between "your Take Profit is here"
 * and "your Take Profit is up there, off the top of what you are looking at".
 * The chip dims slightly with it, so a pinned level never reads as a level
 * standing on the price it appears to touch.
 */
function EdgeCaret({ edge }: { edge: Exclude<TradeObjectEdge, null> }) {
  return (
    <span
      aria-hidden="true"
      title={edge === 'above' ? 'Au-dessus de la vue' : 'En dessous de la vue'}
      className="flex h-full shrink-0 items-center pl-1 text-[color:var(--wariba-component-workstation-text-tertiary)]"
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true">
        <path
          d={edge === 'above' ? 'M2.5 7.5L6 4l3.5 3.5' : 'M2.5 4.5L6 8l3.5-3.5'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Where a trade chip sits horizontally.
 *
 * `level` is the VX1 placement (§21): on the line, in the left-middle of the
 * plot, clear of the price scale, the right utility drawer and the newest
 * candles. `axis` is the WX1 column the pending-order and alert lines still
 * use — those are not positions and are read against the scale.
 */
export type OverlayAlign = 'axis' | 'level';

/**
 * Horizontal placement.
 *
 * A trade object sits in the left-middle of the plot: clear of the price scale,
 * clear of the newest candles, and where the eye already is when reading a line.
 * Objects pinned to an edge keep the same column — TradeChart reserves the
 * legend's own band for them, so a pinned Take Profit comes to rest under the
 * OHLC row rather than through it.
 */
function alignClassFor(align: OverlayAlign): string {
  return align === 'axis' ? 'right-2' : 'left-[26%] max-[1279px]:left-[20%]';
}

export function OverlayAnchor({
  y,
  children,
  className = '',
  align = 'axis',
  edge: _edge = null,
}: {
  y: number;
  children: ReactNode;
  className?: string;
  align?: OverlayAlign;
  edge?: TradeObjectEdge;
}) {
  return (
    <div
      className={`pointer-events-auto absolute flex -translate-y-1/2 items-center gap-1.5 transition-[top] duration-[var(--wariba-component-workstation-motion-quick)] ease-[var(--wariba-component-workstation-ease-move)] motion-reduce:transition-none ${alignClassFor(align)} ${className}`}
      style={{ top: y }}
    >
      {children}
    </div>
  );
}

const OBJECT_ACCENT: Record<TradeObjectKind, string> = {
  entry: 'var(--wariba-component-workstation-trade-entry)',
  take_profit: 'var(--wariba-component-workstation-trade-take-profit)',
  stop_loss: 'var(--wariba-component-workstation-trade-stop-loss)',
};

const OBJECT_WASH: Record<TradeObjectKind, string> = {
  entry: 'var(--wariba-component-workstation-wash-entry)',
  take_profit: 'var(--wariba-component-workstation-wash-take-profit)',
  stop_loss: 'var(--wariba-component-workstation-wash-stop-loss)',
};

const OBJECT_GLOW: Record<TradeObjectKind, string> = {
  entry: 'var(--wariba-component-workstation-glow-entry)',
  take_profit: 'var(--wariba-component-workstation-glow-take-profit)',
  stop_loss: 'var(--wariba-component-workstation-glow-stop-loss)',
};

type MoneyTone = 'positive' | 'negative' | 'neutral';

/** §4 — the money's resting wash: enough to read the sign, not enough to shout. */
const MONEY_WASH_CLASS: Record<MoneyTone, string> = {
  positive: 'bg-[color:var(--wariba-component-workstation-wash-buy)]',
  negative: 'bg-[color:var(--wariba-component-workstation-wash-sell)]',
  neutral: '',
};

const MONEY_TONE_CLASS: Record<MoneyTone, string> = {
  positive: 'text-[color:var(--wariba-component-workstation-text-financial-positive)]',
  negative: 'text-[color:var(--wariba-component-workstation-text-financial-negative)]',
  neutral: 'text-[color:var(--wariba-component-workstation-text-primary)]',
};

/**
 * VX1 §22 / VX1-A.1 §2 — a changed P&L is *shown* changing, without ever
 * contradicting its own sign.
 *
 * The direction comes from `useValueFlash` and the permitted hue from
 * `flashToneFor`, both shared with the account strip: one implementation decides
 * what a live figure does when it moves, so a P&L on the chart and the same P&L
 * in the header never disagree. `motion-reduce` drops the wash entirely.
 */
const FLASH_CLASS: Record<'positive' | 'negative' | 'neutral', string> = {
  positive:
    'bg-[color:var(--wariba-component-workstation-flash-positive)] motion-reduce:bg-transparent',
  negative:
    'bg-[color:var(--wariba-component-workstation-flash-negative)] motion-reduce:bg-transparent',
  neutral:
    'bg-[color:var(--wariba-component-workstation-wash-neutral)] motion-reduce:bg-transparent',
};

/** The chip shell: accent edge, graphite material, hairline-separated segments. */
function ChipShell({
  kind,
  active,
  compact,
  edge = null,
  children,
}: {
  kind: TradeObjectKind;
  active: boolean;
  compact: boolean;
  edge?: TradeObjectEdge;
  children: ReactNode;
}) {
  return (
    <div
      data-trade-chip={kind}
      /* §23 — the chip arrives when the server says the trade did, in one short
         fade-and-settle. It is mounted by TradeChart from authoritative position
         state, so there is no state in which this animates ahead of the fill. */
      /*
       * VX1-A.1 §5 — grabbed, the object lifts.
       *
       * A hair over 1% of scale, a pixel of elevation and its own coloured glow,
       * settling back in ~100ms on release. Small enough that nothing under the
       * cursor jumps, large enough that a trader knows the level is now theirs
       * to move. No bounce: this is an instrument, and the settle is a stop, not
       * a rebound.
       */
      className={`group/chip flex items-stretch overflow-hidden rounded-[7px] bg-[color:var(--wariba-component-workstation-surface-chip)]/95 ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)] backdrop-blur-[2px] transition-[transform,box-shadow] duration-[var(--wariba-component-workstation-motion-micro)] ease-[var(--wariba-component-workstation-ease-move)] hover:-translate-y-px motion-safe:animate-[wariba-trade-object-enter_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-settle)] motion-reduce:transition-none ${
        active ? '-translate-y-px scale-[1.012]' : ''
      } ${compact ? 'h-6' : 'h-7'}`}
      data-trade-chip-edge={edge ?? 'none'}
      style={{
        boxShadow: active
          ? OBJECT_GLOW[kind]
          : 'var(--wariba-component-workstation-elevation-chip)',
        opacity: edge ? 0.82 : 1,
      }}
    >
      {/* The identity edge: same colour as the line this chip is standing on. */}
      <span
        aria-hidden="true"
        className="w-[3px] shrink-0"
        style={{ backgroundColor: OBJECT_ACCENT[kind] }}
      />
      {edge ? <EdgeCaret edge={edge} /> : null}
      {children}
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden="true"
      className="w-px shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]"
    />
  );
}

/** VX1 §18 — the grip appears on intent and says "this level moves". */
function Grip({ held = false }: { held?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-full w-2.5 shrink-0 flex-col items-center justify-center gap-[2px] transition-opacity duration-[var(--wariba-component-workstation-motion-micro)] group-hover/chip:opacity-90 ${
        held ? 'opacity-100' : 'opacity-35'
      }`}
    >
      <span className="h-[2px] w-2 rounded-full bg-[color:var(--wariba-component-workstation-text-tertiary)]" />
      <span className="h-[2px] w-2 rounded-full bg-[color:var(--wariba-component-workstation-text-tertiary)]" />
      <span className="h-[2px] w-2 rounded-full bg-[color:var(--wariba-component-workstation-text-tertiary)]" />
    </span>
  );
}

/**
 * §3 — a segment that arrives on engagement fades in over ~140ms.
 *
 * The chip's own width animates through the flex layout; the contents ramp their
 * opacity so nothing appears mid-slide. `motion-reduce` drops the ramp and the
 * segment is simply there.
 */
const ENGAGE_ENTER =
  'motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-quick)_var(--wariba-component-workstation-ease-enter)]';

function CloseSegment({
  label,
  disabled,
  onClick,
  compact,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  compact: boolean;
}) {
  return (
    <>
      <Divider />
      {/*
       * §17 — the close segment stays neutral until it is touched. A permanently
       * red square beside a Buy chip reads as a second Sell button, which is the
       * one thing an on-chart control must never be mistaken for.
       */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={`${ENGAGE_ENTER} flex shrink-0 items-center justify-center text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-micro)] hover:bg-[color:var(--wariba-component-workstation-wash-sell)] hover:text-[color:var(--wariba-component-workstation-trading-sell)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] disabled:cursor-not-allowed disabled:opacity-40 ${
          compact ? 'w-5' : 'w-6'
        }`}
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true">
          <path
            d="M2.5 2.5l7 7M9.5 2.5l-7 7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </>
  );
}

export interface PositionChipProps {
  y: number;
  side: 'buy' | 'sell';
  /** Already formatted at the instrument's own lot precision. */
  quantityFormatted: string;
  /** Live unrealised P&L, formatted, sign included. */
  pnlFormatted: string;
  pnlTone: MoneyTone;
  syncState: LevelSyncState;
  syncLabel: string | null;
  entryPriceFormatted: string;
  symbol: string;
  onManage: () => void;
  onClose: () => void;
  closeDisabled: boolean;
  showCloseButton: boolean;
  compact?: boolean;
  /** Set when the entry price is outside the visible band (§21). */
  edge?: TradeObjectEdge;
}

const SIDE_LABEL: Record<'buy' | 'sell', string> = { buy: 'BUY', sell: 'SELL' };

/**
 * The open position, on its entry line (§12).
 *
 * Side, size and live money — nothing else on the face of it. The instrument and
 * the entry price are already stated by the toolbar and by the axis plate this
 * chip is standing beside, so they live in the accessible name and the tooltip
 * instead of taking a third of the plot to repeat themselves.
 */
export function PositionChip({
  y,
  side,
  quantityFormatted,
  pnlFormatted,
  pnlTone,
  syncState,
  syncLabel,
  entryPriceFormatted,
  symbol,
  onManage,
  onClose,
  closeDisabled,
  showCloseButton,
  compact = false,
  edge = null,
}: PositionChipProps) {
  /*
   * VX1-C §2 — on a phone the object rests small and expands where it stands.
   *
   * A 390px chart cannot spare the width for a permanent close segment beside
   * every level, and the desktop chip's full grammar covered a third of the
   * plot. At rest the phone carries the facts a trader glances at — side, size,
   * money — and the *actions* arrive on tap, in place, without opening a sheet
   * to reach a control that was already on screen (§2).
   *
   * Desktop is unaffected: `engaged` is pinned true there, which is the state
   * the accepted desktop chip already is.
   */
  const [engaged, setEngaged] = useState(false);
  const expanded = !compact || engaged;
  const flash = useValueFlash(pnlFormatted);
  const flashTone = flashToneFor(flash, parseFormattedNumber(pnlFormatted));
  const description = `${side === 'buy' ? 'Position acheteuse' : 'Position vendeuse'} ${quantityFormatted} ${symbol}, entrée ${entryPriceFormatted}, résultat latent ${pnlFormatted}`;

  return (
    <OverlayAnchor y={y} align="level" edge={edge}>
      <ChipShell
        kind="entry"
        active={syncState === 'dragging_preview'}
        compact={compact}
        edge={edge}
      >
        <button
          type="button"
          onClick={() => {
            // First tap opens the object; the second reaches management. On a
            // pointer device there is no first tap to spend.
            if (compact && !engaged) {
              setEngaged(true);
              return;
            }
            onManage();
          }}
          title={description}
          aria-label={`${description}. Ouvrir la gestion de la position.`}
          data-testid="chart-position-chip"
          data-engaged={expanded ? 'true' : 'false'}
          className={`flex min-w-0 items-center gap-2 transition-colors duration-[var(--wariba-component-workstation-motion-micro)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
            compact ? 'px-1.5' : 'px-2'
          }`}
        >
          <span
            className="wariba-data shrink-0 text-[length:var(--wariba-component-workstation-type-trade-label)] font-bold uppercase tracking-[var(--wariba-component-workstation-tracking-label)]"
            style={{ color: OBJECT_ACCENT.entry }}
          >
            {SIDE_LABEL[side]}
          </span>
          <span className="wariba-data shrink-0 text-[length:var(--wariba-component-workstation-type-trade-label)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)]">
            {quantityFormatted}
          </span>
          {syncState !== 'confirmed' ? (
            <span
              aria-hidden="true"
              title={syncLabel ?? undefined}
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${SYNC_DOT_CLASS[syncState]}`}
            />
          ) : null}
        </button>
        <Divider />
        {/* §4 — the money is the loudest thing on the chip, and it rests on its
            own semantic wash so the sign is legible before the digits are. */}
        <span
          data-testid="chart-position-chip-pnl"
          data-flash={flashTone === 'neutral' && !flash ? 'none' : flashTone}
          className={`flex shrink-0 items-center transition-colors duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${
            compact ? 'px-1.5' : 'px-2'
          } ${flash ? FLASH_CLASS[flashTone] : MONEY_WASH_CLASS[pnlTone]}`}
        >
          <span
            key={pnlFormatted}
            className={`wariba-data text-[length:var(--wariba-component-workstation-type-trade-value)] font-bold tabular-nums motion-safe:animate-[wariba-value-roll_var(--wariba-component-workstation-motion-micro)_var(--wariba-component-workstation-ease-move)] ${MONEY_TONE_CLASS[pnlTone]}`}
          >
            {pnlFormatted}
          </span>
        </span>
        {showCloseButton && expanded ? (
          <CloseSegment
            label={`Fermer la position ${symbol}`}
            disabled={closeDisabled}
            onClick={onClose}
            compact={compact}
          />
        ) : null}
      </ChipShell>
    </OverlayAnchor>
  );
}

export interface TradeLevelChipProps {
  y: number;
  kind: 'stop_loss' | 'take_profit';
  priceFormatted: string;
  /** Money at stake if this level executes, formatted with its sign. */
  pnlFormatted: string;
  quantityFormatted: string;
  syncState: LevelSyncState;
  disabled: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  onActivate: () => void;
  onRemove: () => void;
  /** Appendix §4 — the non-drag equivalent: one tick per press, committed immediately. */
  onKeyboardAdjust: (direction: 1 | -1) => void;
  compact?: boolean;
  /** Set when the level's price is outside the visible band (§21). */
  edge?: TradeObjectEdge;
}

const LEVEL_LABEL: Record<'stop_loss' | 'take_profit', string> = {
  stop_loss: 'SL',
  take_profit: 'TP',
};

const LEVEL_NAME: Record<'stop_loss' | 'take_profit', string> = {
  stop_loss: 'Stop Loss',
  take_profit: 'Take Profit',
};

/**
 * A protective level, on its own line (§14/§15).
 *
 * The money dominates and the label explains it: `+$95.70  TP`. That order is
 * the point — a prop trader's question at a stop is "how much does this cost
 * me", and WX1 answered it with a price they then had to convert in their head.
 *
 * Still one control with two ways in, as it has been since Appendix 07-C: press
 * and drag to move the level, click (or Enter) to open exact-price entry, arrow
 * keys to step one tick. The grip is new; the interactions are not.
 */
export function TradeLevelChip({
  y,
  kind,
  priceFormatted,
  pnlFormatted,
  quantityFormatted,
  syncState,
  disabled,
  onPointerDown,
  onActivate,
  onRemove,
  onKeyboardAdjust,
  compact = false,
  edge = null,
}: TradeLevelChipProps) {
  /* §2/§3 — same two states as the position chip: `TP +$21.10` at rest, the
     full grammar (grip, size, remove) once the trader engages it. */
  const [engaged, setEngaged] = useState(false);
  const expanded = !compact || engaged;
  const flash = useValueFlash(pnlFormatted);
  const tone: MoneyTone = kind === 'take_profit' ? 'positive' : 'negative';
  const flashTone = flashToneFor(flash, parseFormattedNumber(pnlFormatted));
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onKeyboardAdjust(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onKeyboardAdjust(-1);
    }
  };

  return (
    <OverlayAnchor y={y} align="level" edge={edge}>
      <ChipShell
        kind={kind}
        active={syncState === 'dragging_preview'}
        compact={compact}
        edge={edge}
      >
        <button
          type="button"
          onPointerDown={onPointerDown}
          onClick={() => {
            if (compact && !engaged) {
              setEngaged(true);
              return;
            }
            onActivate();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          data-testid={`chart-level-chip-${kind}`}
          data-engaged={expanded ? 'true' : 'false'}
          /* VX1-D.1 §8 — published so the illegal-drag state can be asserted
             rather than only photographed. */
          data-sync={syncState}
          aria-label={`${LEVEL_NAME[kind]} à ${priceFormatted}, ${pnlFormatted} sur ${quantityFormatted}. Flèches haut/bas pour ajuster d’un pas, Entrée pour saisir un prix exact.`}
          title={`${LEVEL_NAME[kind]} · ${priceFormatted}`}
          className={`flex min-w-0 cursor-ns-resize items-center gap-2 transition-colors duration-[var(--wariba-component-workstation-motion-micro)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] disabled:cursor-not-allowed disabled:opacity-50 ${
            compact ? 'px-1' : 'px-1.5'
          }`}
        >
          {expanded ? <Grip held={syncState === 'dragging_preview'} /> : null}
          <span
            data-testid={`chart-level-chip-${kind}-pnl`}
            data-flash={flash ? flashTone : 'none'}
            className={`wariba-data rounded-[3px] px-1 text-[length:var(--wariba-component-workstation-type-trade-value)] font-bold tabular-nums transition-colors duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${MONEY_TONE_CLASS[tone]} ${
              flash ? FLASH_CLASS[flashTone] : MONEY_WASH_CLASS[tone]
            }`}
          >
            <span
              key={pnlFormatted}
              className="motion-safe:animate-[wariba-value-roll_var(--wariba-component-workstation-motion-micro)_var(--wariba-component-workstation-ease-move)]"
            >
              {pnlFormatted}
            </span>
          </span>
          <span
            className="wariba-data shrink-0 text-[length:var(--wariba-component-workstation-type-trade-label)] font-bold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] opacity-80"
            style={{ color: OBJECT_ACCENT[kind] }}
          >
            {LEVEL_LABEL[kind]}
          </span>
          {syncState !== 'confirmed' && syncState !== 'stale_disabled' ? (
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${SYNC_DOT_CLASS[syncState]}`}
            />
          ) : null}
        </button>
        {expanded ? (
          <>
            <Divider />
            <span
              className="flex shrink-0 items-center px-1.5"
              style={{ backgroundColor: OBJECT_WASH[kind] }}
            >
              <span className="wariba-data text-[length:var(--wariba-component-workstation-type-trade-label)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)]">
                {quantityFormatted}
              </span>
            </span>
          </>
        ) : null}
        {expanded ? (
          <CloseSegment
            label={`Retirer le ${LEVEL_NAME[kind]}`}
            disabled={disabled}
            onClick={onRemove}
            compact={compact}
          />
        ) : null}
      </ChipShell>
    </OverlayAnchor>
  );
}

export interface AddLevelChipProps {
  y: number;
  kind: 'stop_loss' | 'take_profit';
  disabled: boolean;
  disabledReason: string | null;
  onPointerDown: (event: React.PointerEvent) => void;
  onActivate: () => void;
  compact?: boolean;
}

function AddLevelButton({
  kind,
  disabled,
  disabledReason,
  onPointerDown,
  onActivate,
  compact,
}: Omit<AddLevelChipProps, 'y'> & { compact: boolean }) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={onActivate}
      disabled={disabled}
      title={disabledReason ?? `Placer un ${LEVEL_NAME[kind]}`}
      data-testid={`chart-add-level-${kind}`}
      aria-label={kind === 'stop_loss' ? 'Placer un Stop Loss' : 'Placer un Take Profit'}
      className={`flex cursor-ns-resize items-center gap-1 rounded-[5px] text-[length:var(--wariba-component-workstation-type-trade-label)] font-bold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] transition-[background-color,color,opacity] duration-[var(--wariba-component-workstation-motion-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] disabled:cursor-not-allowed disabled:opacity-45 ${
        compact ? 'h-[18px] px-1.5' : 'h-5 px-1.5'
      }`}
      style={{ color: OBJECT_ACCENT[kind] }}
    >
      <span aria-hidden="true" className="text-[11px] leading-none">
        +
      </span>
      {LEVEL_LABEL[kind]}
    </button>
  );
}

export interface PositionProtectionControlsProps {
  y: number;
  disabled: boolean;
  disabledReason: string | null;
  onStopPointerDown: (event: React.PointerEvent) => void;
  onTargetPointerDown: (event: React.PointerEvent) => void;
  onActivate: () => void;
  compact?: boolean;
}

/**
 * The protection a position does not have yet — VX1-D.1 §5, Case B.
 *
 * **What was wrong.** These two controls used to be rendered as two independent
 * `AddLevelChip`s, each anchored at `badgeY + 24 × (stop ? 1 : 2)` — a constant
 * pixel offset with no relationship to price and none to the position's side.
 * Three things followed from that, and all three were visible:
 *
 * - they stacked directly under the entry chip as a tiny two-storey pile,
 *   reading as two *levels* the position already had;
 * - "+ TP" always sat below "+ SL", so on a long the take profit appeared
 *   *under* the entry — the exact inversion §3 forbids;
 * - being anchored like levels, they competed with real levels for the same
 *   vertical space.
 *
 * **What replaces it.** One cluster, one row, attached to the entry chip by a
 * short stem: unmistakably a pair of *actions* belonging to that position
 * rather than two prices on the scale. There is no vertical order to misread,
 * because neither control claims a price yet — a level appears only when the
 * trader drags one out and a real price exists to put it at, and from that
 * moment its Y comes from `priceToCoordinate` like every other level.
 *
 * The drag-to-create gesture is untouched: pointer-down on either action still
 * starts the same drag from the market reference.
 */
export function PositionProtectionControls({
  y,
  disabled,
  disabledReason,
  onStopPointerDown,
  onTargetPointerDown,
  onActivate,
  compact = false,
}: PositionProtectionControlsProps) {
  return (
    <OverlayAnchor y={y} align="level">
      <span className="flex flex-col items-end">
        {/* The stem: what makes the cluster read as belonging to the chip above
            it rather than as free-floating objects on the plot. */}
        <span
          aria-hidden="true"
          className="h-1.5 w-px bg-[color:var(--wariba-component-workstation-border-strong)]"
          style={{ marginRight: compact ? 14 : 18 }}
        />
        <span
          data-testid="chart-protection-controls"
          className="flex items-center gap-0.5 rounded-[6px] border border-dashed border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-chip)]/80 px-0.5 py-0.5 shadow-[var(--wariba-component-workstation-elevation-key)]"
        >
          <AddLevelButton
            kind="stop_loss"
            disabled={disabled}
            disabledReason={disabledReason}
            onPointerDown={onStopPointerDown}
            onActivate={onActivate}
            compact={compact}
          />
          <span
            aria-hidden="true"
            className="h-3 w-px bg-[color:var(--wariba-component-workstation-border-hairline)]"
          />
          <AddLevelButton
            kind="take_profit"
            disabled={disabled}
            disabledReason={disabledReason}
            onPointerDown={onTargetPointerDown}
            onActivate={onActivate}
            compact={compact}
          />
        </span>
      </span>
    </OverlayAnchor>
  );
}

export interface DragPreviewPanelProps {
  kind: 'stop_loss' | 'take_profit';
  priceFormatted: string;
  /**
   * Every economic figure is nullable, and all of them are null together.
   *
   * VX1-D.1.1 §1 — they answer "what happens if this level fills", which is a
   * question an illegal level does not have. TradeChart nulls them rather than
   * computing something unusable.
   */
  distancePointsFormatted: string | null;
  pnlFormatted: string | null;
  percentOfAccountFormatted: string | null;
  riskRewardFormatted: string | null;
  dailyLossRemainingAfterFormatted: string | null;
  /** Set only while the pointer is on the wrong side of entry. */
  invalidReason?: string | null;
  /**
   * The card's resolved top edge, in plot coordinates.
   *
   * Chosen by `resolveDragCardTop` against everything on the plot that must not
   * be covered (VX1-D.1.2 §1). This component draws where it is told; it does
   * not decide, because it cannot see the chips.
   */
  top: number;
  /** A phone, where the card narrows to leave the chip column clear. */
  compact?: boolean;
}

/**
 * The card shown while a level is being dragged (Appendix §4), restyled for VX1.
 *
 * It is the only place the secondary metadata lives — distance, share of the
 * account, risk/reward, the daily budget after execution — because §14 is
 * explicit that a chip must not carry all of it permanently. Every figure is
 * computed by the canonical estimator in TradeChart and passed in formatted.
 */
export function DragPreviewPanel({
  kind,
  priceFormatted,
  distancePointsFormatted,
  pnlFormatted,
  percentOfAccountFormatted,
  riskRewardFormatted,
  dailyLossRemainingAfterFormatted,
  invalidReason = null,
  top,
  compact = false,
}: DragPreviewPanelProps) {
  const invalid = invalidReason !== null;
  /*
   * §1 — the level keeps its identity, and loses its authority.
   *
   * The accent stays coral for a stop and emerald for a target, because the
   * trader is still dragging *that* level and swapping its colour would be a
   * second thing to decode mid-gesture. What changes is that the card stops
   * behaving like a quotation: the heading says INVALIDE, the price sits in the
   * warning tone rather than as a settled figure, and the reason replaces the
   * economics instead of accompanying them.
   */
  const accent = OBJECT_ACCENT[kind];
  return (
    <div
      data-testid="chart-drag-preview"
      data-invalid={invalid ? 'true' : 'false'}
      style={{ top }}
      className={`pointer-events-none absolute right-14 flex flex-col gap-1 overflow-hidden rounded-[10px] border bg-[color:var(--wariba-component-workstation-surface-popover)]/95 ${
        /* §1 — narrower on a phone, so the card and the chip column can coexist
           horizontally when the vertical resolver has to put them on the same
           line. The type sizes are untouched: this trims padding and width, not
           readability. */
        compact ? 'w-44 p-2.5' : 'w-52 p-3'
      }  shadow-[var(--wariba-component-workstation-elevation-popover)] motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-micro)_ease-out] ${
        invalid
          ? 'border-[color:var(--wariba-component-workstation-trading-warning)]/60'
          : 'border-[color:var(--wariba-component-workstation-border-strong)]'
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ backgroundColor: accent }}
      />
      <span className="flex items-baseline justify-between gap-2">
        <span
          className="text-[length:var(--wariba-component-workstation-type-trade-label)] font-bold uppercase tracking-[var(--wariba-component-workstation-tracking-label)]"
          style={{ color: accent }}
        >
          {invalid ? `${LEVEL_LABEL[kind]} invalide` : LEVEL_NAME[kind]}
        </span>
        <span
          className={`wariba-data text-[length:var(--wariba-component-workstation-type-data-strong)] font-semibold tabular-nums ${
            invalid
              ? 'text-[color:var(--wariba-component-workstation-trading-warning)]'
              : 'text-[color:var(--wariba-component-workstation-text-primary)]'
          }`}
        >
          {priceFormatted}
        </span>
      </span>

      {invalid ? (
        <span
          data-testid="chart-drag-preview-reason"
          className="text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-trading-warning)]"
        >
          {invalidReason}
        </span>
      ) : (
        <>
          <span
            className={`wariba-data text-[length:var(--wariba-component-workstation-type-quote-hero-compact)] font-bold tabular-nums ${
              kind === 'take_profit' ? MONEY_TONE_CLASS.positive : MONEY_TONE_CLASS.negative
            }`}
          >
            {pnlFormatted}
          </span>
          <span className="wariba-data text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            {distancePointsFormatted} points · {percentOfAccountFormatted}% du compte
          </span>
          {riskRewardFormatted && (
            <span className="wariba-data text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
              Ratio risque/rendement : {riskRewardFormatted}
            </span>
          )}
          {dailyLossRemainingAfterFormatted && (
            <span className="wariba-data text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
              PMJ restante après exécution : {dailyLossRemainingAfterFormatted}
            </span>
          )}
        </>
      )}
    </div>
  );
}
