import type { BalancePoint } from '@wariba/application';
import { productCopy } from '../../../lib/product-copy';
import { EquityCurve, type EquityThreshold } from '../../../components/hub/charts/EquityCurve';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

const copy = productCopy.hub.dashboard;

export interface AccountEvolutionProps {
  points: readonly BalancePoint[];
  finalizedSessionCount: number;
  /** Decided by the read model — see `isBalanceHistoryMeaningful`. */
  meaningful: boolean;
  /** The floor and the target, drawn on the curve. Real values only. */
  thresholds?: readonly EquityThreshold[];
}

/**
 * The account's evolution — or an honest sentence saying there isn't one yet.
 *
 * A newly activated account has one open snapshot at its opening balance.
 * Charting it gave the dashboard its single worst element: a 220px panel whose
 * axis read 9 999,95 / 10 000,00 / 10 000,05, drawing a flat line through
 * floating-point noise in the most valuable position on the page.
 *
 * There is no sparkline fallback, no seeded demo series, no "example" curve. A
 * product that draws a shape where it has no data has taught its user that its
 * charts are decorative, and nothing it draws later will be trusted.
 *
 * When there *is* a curve, the maximum-loss floor and the profit target are
 * drawn on it. A balance line alone says where the trader has been; the two
 * thresholds say how much room is left and how far there is to go, which is
 * the question they opened the page to answer.
 */
export function AccountEvolution({
  points,
  finalizedSessionCount,
  meaningful,
  thresholds = [],
}: AccountEvolutionProps) {
  if (!meaningful) {
    return (
      <Surface data-testid="account-evolution-empty" className="p-5 sm:p-6">
        <SurfaceTitle>{copy.evolution}</SurfaceTitle>
        <p className="mt-3 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]">
          {/* Two different absences, said accurately. "No closed session" is
              false once a session has closed, even if one is not enough to
              draw a line through. */}
          {finalizedSessionCount === 0 ? copy.noSessions : copy.notEnoughHistory}
        </p>
        <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          {copy.noSessionsHint}
        </p>
      </Surface>
    );
  }

  return (
    <Surface data-testid="account-evolution" className="p-5 sm:p-6">
      <SurfaceTitle
        action={
          thresholds.length > 0 ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {thresholds.map((threshold) => (
                <span
                  key={threshold.label}
                  className="flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-[2px] w-3 rounded-full"
                    style={{
                      background:
                        threshold.tone === 'emerald'
                          ? 'var(--wariba-accent-emerald)'
                          : threshold.tone === 'red'
                            ? 'var(--wariba-accent-red)'
                            : threshold.tone === 'amber'
                              ? 'var(--wariba-accent-amber)'
                              : 'var(--wariba-accent-cyan)',
                    }}
                  />
                  {threshold.label}
                </span>
              ))}
            </span>
          ) : undefined
        }
      >
        {copy.evolution}
      </SurfaceTitle>
      <div className="mt-4">
        <EquityCurve
          points={points.map((point) => ({ time: point.time, value: point.balance }))}
          thresholds={thresholds}
        />
      </div>
    </Surface>
  );
}
