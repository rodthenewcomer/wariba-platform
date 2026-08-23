import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';
import { computeDailyLossRemaining, isInAttentionZone } from '@wariba/domain';
import { loadAccountRiskEngineInputs, type AccountRiskEngineInputs } from './risk-engine-inputs';
import { nextResetAt } from './trading-day';

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
  /**
   * The same boundary, as an absolute instant.
   *
   * Phase 2.5 §13: a countdown may only exist because WARIBA's reset really is
   * midnight UTC (see `trading-day.ts`). The client recomputes the remaining
   * time from this instant on every tick and after every visibility change,
   * rather than decrementing a number that was already stale when it was
   * serialised.
   */
  nextResetAt: string;
  currentEquityFormatted: string;
  violations: readonly AccountRiskViolation[];
  /**
   * The same figures, unformatted.
   *
   * Added in Phase 2 so the account-health reading — which is a ratio of
   * remaining room against a published budget — can be computed from the
   * authoritative numbers rather than by parsing "300 USD" back out of a
   * display string. Every consumer that only needs to render still uses the
   * `Formatted` fields above; nothing on the client does arithmetic on these.
   */
  amounts: {
    dailyLossRemaining: string;
    /** Today's full daily-loss budget: reference − floor. */
    dailyLossBudget: string;
    maximumLossRemaining: string;
    /** nominal × maximum-loss rate. Fixed, unaffected by floor ratcheting. */
    maximumLossBudget: string;
    currentEquity: string;
    /** The ratcheting floor itself, for drawing on an equity curve. */
    maximumLossFloor: string;
  };
  /**
   * How much room is left, as a proportion of the published budget.
   *
   * Projected once here rather than derived per bar. §12 asks for visual risk
   * telemetry, and the ratio behind those bars is the same ratio
   * `deriveAccountHealth` already reasons about — two independent divisions of
   * the same two numbers is how a bar and a label end up disagreeing about the
   * same account on the same screen.
   *
   * Both are 0-100 integers, clamped. A budget of zero yields 100: no budget
   * cannot be partly consumed.
   */
  room: {
    dailyRemainingPercent: number;
    maximumRemainingPercent: number;
    /** The binding constraint — the one that will stop the trader first. */
    binding: 'daily' | 'maximum';
  };
}

export interface BuildAccountRiskViewParams {
  accountId: string;
  now: Date;
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

/**
 * Remaining room as a clamped 0-100 integer.
 *
 * A non-positive budget returns 100 rather than dividing by zero: an account
 * with no budget to lose has not consumed any of it, and 0 % would paint a
 * full red bar on an account that is in no trouble at all.
 */
function remainingPercent(remaining: string, budget: string): number {
  const total = new Decimal(budget);
  if (total.lessThanOrEqualTo(0)) return 100;
  const ratio = new Decimal(remaining).dividedBy(total).toNumber();
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
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
  return projectAccountRiskView(inputs, params.now);
}

/**
 * `now` is passed rather than read from the clock so the projection stays a
 * pure function of its inputs — the reset instant is part of the snapshot the
 * caller asked for, not a side effect of when the formatting happened to run.
 */
export function projectAccountRiskView(
  inputs: AccountRiskEngineInputs,
  now: Date = new Date(),
): AccountRiskView {
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

  const dailyLossBudget = new Decimal(result.dailyLoss.reference)
    .minus(result.dailyLoss.floor)
    .toFixed(2);

  const dailyRemainingPercent = remainingPercent(dailyLossRemaining, dailyLossBudget);
  const maximumRemainingPercent = remainingPercent(result.maximumLoss.remaining, maximumLossBudget);

  return {
    status,
    dailyLossRemainingFormatted: formatUsd(dailyLossRemaining),
    maximumLossRemainingFormatted: formatUsd(result.maximumLoss.remaining),
    nextResetLabel: '00:00 UTC',
    nextResetAt: nextResetAt(now).toISOString(),
    currentEquityFormatted: formatUsd(result.currentEquity),
    room: {
      dailyRemainingPercent,
      maximumRemainingPercent,
      // Ties go to the daily limit: it is the one that resets, so naming it is
      // the more actionable of two equal readings.
      binding: dailyRemainingPercent <= maximumRemainingPercent ? 'daily' : 'maximum',
    },
    amounts: {
      dailyLossRemaining,
      dailyLossBudget,
      maximumLossRemaining: result.maximumLoss.remaining,
      maximumLossBudget,
      currentEquity: result.currentEquity,
      maximumLossFloor: result.maximumLoss.floor,
    },
    violations: result.violations.map((violation): AccountRiskViolation => ({
      ruleCode: violation.ruleCode,
      ruleLabel: RISK_RULE_LABELS[violation.ruleCode] ?? violation.ruleCode,
      thresholdFormatted: formatUsd(violation.thresholdValue),
      observedFormatted: formatUsd(violation.observedValue),
      consequence: violation.consequence,
    })),
  };
}
