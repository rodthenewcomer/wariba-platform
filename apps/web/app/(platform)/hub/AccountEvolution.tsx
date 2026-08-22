import type { BalancePoint } from '@wariba/application';
import { productCopy } from '../../../lib/product-copy';
import { HubBalanceChart } from './HubBalanceChart';
import { HubModule, HubModuleTitle } from './HubModule';

const copy = productCopy.hub.dashboard;

export interface AccountEvolutionProps {
  points: readonly BalancePoint[];
  finalizedSessionCount: number;
  /** Decided by the read model — see `isBalanceHistoryMeaningful`. */
  meaningful: boolean;
}

/**
 * The account's evolution — or an honest sentence saying there isn't one yet.
 *
 * A newly activated account has one open snapshot at its opening balance.
 * Charting it gave the dashboard its single worst element: a 220px panel whose
 * axis read 9 999,95 / 10 000,00 / 10 000,05, drawing a flat line through
 * floating-point noise in the most valuable position on the page. It looked
 * like performance data. It was an empty table with a grid on it.
 *
 * There is no sparkline fallback, no seeded demo series, no "example" curve.
 * A financial product that draws a shape where it has no data has taught its
 * user that its charts are decorative, and nothing it draws later will be
 * trusted the way it needs to be.
 *
 * So: chart when there is something to plot, one compact line when there is
 * not. The empty state is deliberately small — absence should occupy the space
 * of absence, not reserve the footprint of the chart it is standing in for.
 */
export function AccountEvolution({
  points,
  finalizedSessionCount,
  meaningful,
}: AccountEvolutionProps) {
  if (!meaningful) {
    return (
      <HubModule data-testid="account-evolution-empty" className="p-5 sm:p-6">
        <HubModuleTitle>{copy.evolution}</HubModuleTitle>
        <p className="mt-3 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]">
          {/* Two different absences, said accurately. "No closed session" is
              false once a session has closed, even if one is not enough to
              draw a line through. */}
          {finalizedSessionCount === 0 ? copy.noSessions : copy.notEnoughHistory}
        </p>
        <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          {copy.noSessionsHint}
        </p>
      </HubModule>
    );
  }

  return (
    <HubModule data-testid="account-evolution" className="p-5 sm:p-6">
      <HubModuleTitle>{copy.evolution}</HubModuleTitle>
      <div className="mt-4">
        <HubBalanceChart points={points} />
      </div>
    </HubModule>
  );
}
