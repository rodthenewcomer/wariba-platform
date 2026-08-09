import { evaluateReserveStatus, type Db } from '@wariba/database';

// Mirrors @wariba/ui's own ReserveZone (ReserveCoverage.tsx) — not imported
// from there, same reasoning as performance-mission-view.ts's
// AccountPerformanceMissionState: this package doesn't take a design-system
// dependency just for a type name.
export type ControlReserveZone = 'normal' | 'prudence' | 'defensive' | 'critical';

export interface ControlReserveView {
  reserveFormatted: string;
  projectedPayouts30dFormatted: string;
  coverageRatioFormatted: string;
  zone: ControlReserveZone;
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

/** Prompt 08 Phase G — real treasury/actuarial engine data (packages/database/src/treasury.ts) for /control's overview ReserveCoverage card, replacing the DEMO placeholder. */
export async function buildControlReserveView(db: Db): Promise<ControlReserveView> {
  const status = await evaluateReserveStatus(db);
  return {
    reserveFormatted: formatUsd(status.availableReserve),
    projectedPayouts30dFormatted: formatUsd(status.projectedPayoutsNext30Days),
    coverageRatioFormatted:
      status.coverageRatio === null ? '—' : `${Number(status.coverageRatio).toFixed(1)}x`,
    zone: status.zone,
  };
}
