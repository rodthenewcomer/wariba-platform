import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';
import { computeDailyLossRemaining, isInAttentionZone } from '@wariba/domain';
import { loadAccountRiskEngineInputs, type AccountRiskEngineInputs } from './risk-engine-inputs';

// Structurally identical to @wariba/ui's RiskRibbonStatus — application
// layer stays UI-framework-agnostic, so the union is redeclared here rather
// than imported (apps/web passes this value straight into <RiskRibbon status>).
export type AccountRiskStatus =
  'normal' | 'attention' | 'near-limit' | 'soft-lock' | 'hard-breach' | 'stale';

export interface AccountRiskViolation {
  ruleCode: string;
  ruleLabel: string;
  thresholdFormatted: string;
  observedFormatted: string;
  consequence: string;
}

export interface AccountRiskView {
  status: AccountRiskStatus;
  dailyLossRemainingFormatted: string;
  maximumLossRemainingFormatted: string;
  nextResetLabel: string;
  currentEquityFormatted: string;
  violations: readonly AccountRiskViolation[];
}

export interface BuildAccountRiskViewParams {
  accountId: string;
  now: Date;
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

export const RISK_RULE_LABELS: Record<string, string> = {
  RISK_DAILY_LOSS_LOCK: 'Limite de perte quotidienne',
  RISK_MAXIMUM_LOSS_BREACH: 'Perte maximale',
};

/**
 * Prompt 06 account_risk_view. Pre-formats every figure so RiskRibbon does
 * no math (Design System §48 / Prompt Pack "pas de calcul frontend
 * autoritaire"). "stale" is never produced here — that's a client-fetch
 * concern the page layer may set itself.
 */
export async function buildAccountRiskView(
  db: Db,
  params: BuildAccountRiskViewParams,
): Promise<AccountRiskView> {
  const inputs = await loadAccountRiskEngineInputs(db, params);
  return projectAccountRiskView(inputs);
}

export function projectAccountRiskView(inputs: AccountRiskEngineInputs): AccountRiskView {
  const { result } = inputs;
  const maximumLossBudget = new Decimal(inputs.nominalBalance)
    .times(inputs.policy.parameters.maximum_loss_rate)
    .toFixed(2);

  let status: AccountRiskStatus = 'normal';
  if (result.maximumLoss.breached) {
    status = 'hard-breach';
  } else if (result.dailyLoss.softLockTriggered) {
    status = 'soft-lock';
  } else if (
    isInAttentionZone({
      dailyLossFloor: result.dailyLoss.floor,
      dailyLossUsed: result.dailyLoss.used,
      maximumLossRemaining: result.maximumLoss.remaining,
      maximumLossBudget,
    })
  ) {
    status = 'attention';
  }

  const dailyLossRemaining = computeDailyLossRemaining({
    reference: result.dailyLoss.reference,
    floor: result.dailyLoss.floor,
    used: result.dailyLoss.used,
  });

  return {
    status,
    dailyLossRemainingFormatted: formatUsd(dailyLossRemaining),
    maximumLossRemainingFormatted: formatUsd(result.maximumLoss.remaining),
    nextResetLabel: '00:00 UTC',
    currentEquityFormatted: formatUsd(result.currentEquity),
    violations: result.violations.map((violation): AccountRiskViolation => ({
      ruleCode: violation.ruleCode,
      ruleLabel: RISK_RULE_LABELS[violation.ruleCode] ?? violation.ruleCode,
      thresholdFormatted: formatUsd(violation.thresholdValue),
      observedFormatted: formatUsd(violation.observedValue),
      consequence: violation.consequence,
    })),
  };
}
