import { computeDailyLossUsedRatio } from '@wariba/domain';
import type { AccountRisk } from '@wariba/contracts';
import type { RiskRibbonStatus } from '@wariba/ui';

/**
 * UX Architecture §23.3: normal < attention < near-limit < soft-lock, an
 * early warning before the actual soft-lock gate (softLockTriggered/status)
 * fires. Thresholds aren't specified numerically anywhere in the docs — 50%
 * and 80% of today's daily-loss budget used are this module's own choice,
 * not a rule figure.
 */
const ATTENTION_THRESHOLD = '0.5';
const NEAR_LIMIT_THRESHOLD = '0.8';

export function deriveRiskRibbonStatus(params: {
  risk: AccountRisk | null;
  isStale: boolean;
  isResyncing: boolean;
}): RiskRibbonStatus {
  if (params.isStale || params.isResyncing) return 'stale';
  if (!params.risk) return 'normal';
  if (params.risk.status === 'breached') return 'hard-breach';
  if (params.risk.status === 'soft_locked' || params.risk.dailyLoss.softLockTriggered) {
    return 'soft-lock';
  }
  const usedRatio = computeDailyLossUsedRatio(params.risk.dailyLoss);
  if (Number(usedRatio) >= Number(NEAR_LIMIT_THRESHOLD)) return 'near-limit';
  if (Number(usedRatio) >= Number(ATTENTION_THRESHOLD)) return 'attention';
  return 'normal';
}
