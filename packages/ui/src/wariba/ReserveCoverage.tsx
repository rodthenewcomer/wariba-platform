import { cx } from '../lib/cx';

export type ReserveZone = 'normal' | 'prudence' | 'defensive' | 'critical';

export interface ReserveCoverageProps {
  reserveFormatted: string;
  projectedPayouts30dFormatted: string;
  /** e.g. "2.4x" — already computed. */
  coverageRatioFormatted: string;
  zone: ReserveZone;
}

const ZONE_META: Record<ReserveZone, { label: string; tone: string }> = {
  normal: {
    label: 'Normal (≥ 2,0x)',
    tone: 'text-[color:var(--wariba-status-success-text)] bg-[color:var(--wariba-status-success-background)] border-[color:var(--wariba-status-success-border)]',
  },
  prudence: {
    label: 'Prudence (1,5–2,0x)',
    tone: 'text-[color:var(--wariba-status-warning-text)] bg-[color:var(--wariba-status-warning-background)] border-[color:var(--wariba-status-warning-border)]',
  },
  defensive: {
    label: 'Défensif (1,2–1,5x)',
    tone: 'text-[color:var(--wariba-status-warning-text)] bg-[color:var(--wariba-status-warning-background)] border-[color:var(--wariba-status-warning-border)]',
  },
  critical: {
    label: 'Critique (< 1,2x)',
    tone: 'text-[color:var(--wariba-status-danger-text)] bg-[color:var(--wariba-status-danger-background)] border-[color:var(--wariba-status-danger-border)]',
  },
};

const ZONE_ACTION: Record<ReserveZone, string> = {
  normal: 'Ventes et promotions normales.',
  prudence: 'Réduire les promotions, surveiller les cohortes.',
  defensive: 'Suspendre le 25K, alimenter la réserve.',
  critical: 'Suspendre les nouvelles ventes, alimenter la réserve, revue exécutive.',
};

/** Design System §25.10 — Control only. Never implies a payout already earned can be reduced (Rulebook §42.3). */
export function ReserveCoverage({
  reserveFormatted,
  projectedPayouts30dFormatted,
  coverageRatioFormatted,
  zone,
}: ReserveCoverageProps) {
  const meta = ZONE_META[zone];
  return (
    <div
      className={cx(
        'flex flex-col gap-3 rounded-[var(--wariba-radius-lg)] border p-[var(--wariba-space-5)]',
        meta.tone,
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold">
          Couverture de réserve
        </span>
        <span className="wariba-data text-[length:var(--wariba-font-size-data-lg)] font-semibold">
          {coverageRatioFormatted}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-[length:var(--wariba-font-size-body-sm)]">
        <div>
          <p className="text-[color:var(--wariba-text-secondary)]">Réserve disponible</p>
          <p className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">
            {reserveFormatted}
          </p>
        </div>
        <div>
          <p className="text-[color:var(--wariba-text-secondary)]">Payouts projetés (30j)</p>
          <p className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">
            {projectedPayouts30dFormatted}
          </p>
        </div>
      </div>
      <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium">
        {meta.label} — {ZONE_ACTION[zone]}
      </p>
    </div>
  );
}
