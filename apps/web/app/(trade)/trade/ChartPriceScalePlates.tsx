'use client';

import { memo } from 'react';
import {
  PLATE_PRIORITY,
  resolvePriceScalePlates,
  type PriceScalePlateInput,
} from './chart-price-plate-layout';
import { usePriceMotion } from './chart-price-motion';

/**
 * WariX's own price-scale plates (VX1 §20, VX1-A.1 §1).
 *
 * lightweight-charts draws an axis label per price line, into the canvas, with
 * no collision handling and no offset API: two levels a few ticks apart print
 * two plates on top of each other, and the trader reads neither. The library's
 * labels are therefore switched off for the levels that matter and drawn here
 * instead, as HTML over the scale, where they can be laid out by priority.
 *
 * **The price is never moved, only the plate.** Each plate prints its own true
 * price and, when it has stepped aside for a more important one, draws a
 * connector back to the exact coordinate of its line. A displaced plate says
 * "my level is *there*"; it never pretends the level is where the plate is.
 */

export type PriceScalePlateKind = 'take_profit' | 'stop_loss' | 'entry' | 'current';

export interface PriceScalePlate {
  id: string;
  kind: PriceScalePlateKind;
  /** Formatted at the instrument's own precision by the caller. */
  priceFormatted: string;
  /** True vertical centre, from `series.priceToCoordinate`. */
  y: number;
}

export interface ChartPriceScalePlatesProps {
  plates: readonly PriceScalePlate[];
  /** The price scale's measured width, so the strip lines up with the canvas. */
  width: number;
  /** Plot height, for clamping. */
  height: number;
  compact?: boolean;
}

const PLATE_SURFACE: Record<PriceScalePlateKind, string> = {
  take_profit: 'var(--wariba-component-workstation-trade-take-profit)',
  stop_loss: 'var(--wariba-component-workstation-trade-stop-loss)',
  entry: 'var(--wariba-component-workstation-trade-entry)',
  current: 'var(--wariba-component-workstation-market-current)',
};

const PLATE_PRIORITY_FOR: Record<PriceScalePlateKind, PriceScalePlateInput['priority']> = {
  take_profit: PLATE_PRIORITY.trade,
  stop_loss: PLATE_PRIORITY.trade,
  entry: PLATE_PRIORITY.trade,
  current: PLATE_PRIORITY.current,
};

const PLATE_NAME: Record<PriceScalePlateKind, string> = {
  take_profit: 'Take Profit',
  stop_loss: 'Stop Loss',
  entry: 'Entrée',
  current: 'Prix actuel',
};

const PLATE_HEIGHT = 16;
const COMPACT_PLATE_HEIGHT = 15;

export const ChartPriceScalePlates = memo(function ChartPriceScalePlates({
  plates,
  width,
  height,
  compact = false,
}: ChartPriceScalePlatesProps) {
  /*
   * VX1-D §5-§7 — the market plate is the one that is allowed to move.
   *
   * Read before the early return, because a hook cannot be conditional: the
   * market's own last price is what the trader watches travel, while entry, SL
   * and TP are *decisions* and sit exactly where they were put. Those three
   * still transition, but only when the collision resolver moves them (§34),
   * never because the market did something.
   */
  const currentPrice = plates.find((plate) => plate.kind === 'current')?.priceFormatted ?? null;
  const marketMotion = usePriceMotion(currentPrice);

  if (width <= 0 || height <= 0 || plates.length === 0) return null;
  const plateHeight = compact ? COMPACT_PLATE_HEIGHT : PLATE_HEIGHT;

  const placements = resolvePriceScalePlates(
    plates.map((plate) => ({
      id: plate.id,
      y: plate.y,
      height: plateHeight,
      priority: PLATE_PRIORITY_FOR[plate.kind],
    })),
    { height, gap: 2 },
  );
  const placementById = new Map(placements.map((placement) => [placement.id, placement]));

  return (
    <div
      aria-hidden="true"
      data-testid="chart-price-scale-plates"
      className="pointer-events-none absolute inset-y-0 right-0 z-20 overflow-hidden"
      style={{ width }}
    >
      {plates.map((plate) => {
        const placement = placementById.get(plate.id);
        if (!placement) return null;
        const surface = PLATE_SURFACE[plate.kind];
        return (
          <div key={plate.id} data-plate={plate.kind}>
            {/*
             * The connector, drawn only when the plate has moved: a hairline in
             * the plate's own colour from where it sits to where its line
             * actually is, ending in a short tick on the line itself.
             */}
            {placement.displaced ? (
              <>
                <span
                  className="absolute left-0 w-px"
                  style={{
                    top: Math.min(placement.y, placement.trueY),
                    height: Math.abs(placement.y - placement.trueY),
                    backgroundColor: surface,
                    opacity: 0.7,
                  }}
                />
                <span
                  className="absolute left-0 h-px w-2"
                  style={{ top: placement.trueY, backgroundColor: surface, opacity: 0.9 }}
                />
              </>
            ) : null}
            {/*
             * VX1-D §5-§7 — the plate travels, the number does not.
             *
             * `top` is the only animated property and it always resolves to the
             * coordinate the *authoritative* price already produced; the text
             * child is the new authoritative string in this same frame. The
             * duration is the tick cadence's answer, so a slow feed glides and
             * a burst snaps rather than falling behind the market.
             *
             * §6's directional emphasis is a border in the move's own colour
             * rather than a recolour of the plate: the current price must not
             * be left permanently green or red, and a plate that changes its
             * fill would be claiming the *level* has a direction. The `beat`
             * key restarts the one-shot pulse (§7) on a genuine change only.
             */}
            <span
              key={plate.kind === 'current' ? `current:${marketMotion.beat}` : plate.id}
              data-testid={`chart-price-plate-${plate.kind}`}
              data-displaced={placement.displaced ? 'true' : 'false'}
              data-move={plate.kind === 'current' ? (marketMotion.direction ?? 'none') : 'none'}
              title={`${PLATE_NAME[plate.kind]} ${plate.priceFormatted}`}
              className={`wariba-data absolute flex items-center justify-end rounded-[3px] font-semibold tabular-nums ease-[var(--wariba-component-workstation-ease-move)] motion-reduce:transition-none ${
                plate.kind === 'current' && marketMotion.direction !== null
                  ? 'motion-safe:animate-[wariba-plate-tick_var(--wariba-component-workstation-motion-instant)_var(--wariba-component-workstation-ease-settle)]'
                  : ''
              } ${compact ? 'text-[10px]' : 'text-[11px]'}`}
              style={{
                top: placement.y - plateHeight / 2,
                height: plateHeight,
                left: placement.displaced ? 3 : 1,
                right: 1,
                backgroundColor: surface,
                color: 'var(--wariba-chart-background)',
                paddingRight: 4,
                transitionProperty: 'top, box-shadow',
                transitionDuration:
                  plate.kind === 'current'
                    ? `${marketMotion.durationMs}ms, var(--wariba-component-workstation-motion-quick)`
                    : 'var(--wariba-component-workstation-motion-quick)',
                boxShadow:
                  plate.kind === 'current' && marketMotion.direction !== null
                    ? `inset 0 0 0 1px ${
                        marketMotion.direction === 'up'
                          ? 'var(--wariba-component-workstation-trading-buy)'
                          : 'var(--wariba-component-workstation-trading-sell)'
                      }`
                    : undefined,
              }}
            >
              {plate.priceFormatted}
            </span>
          </div>
        );
      })}
    </div>
  );
});
