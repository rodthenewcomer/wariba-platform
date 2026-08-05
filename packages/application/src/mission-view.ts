import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';
import { deriveHubDisplayState, type HubDisplayState } from '@wariba/domain';
import {
  loadAccountRiskEngineInputs,
  UnsupportedProgramError,
  type AccountRiskEngineInputs,
} from './risk-engine-inputs';

export type AccountMissionState =
  'active' | 'attention' | 'reached' | 'waiting' | 'passed' | 'breached' | 'frozen';

export interface AccountMissionCondition {
  label: string;
  detail: string;
  met: boolean;
}

export interface AccountMissionNextAction {
  label: string;
  href: string;
}

export interface AccountConsistencyView {
  ratioPercent: number;
  limitPercent: number;
  bestDayFormatted: string;
  totalProfitFormatted: string;
  requiredProfitFormatted?: string;
}

export interface AccountMissionView {
  available: true;
  variant: 'evaluation';
  state: AccountMissionState;
  title: string;
  progressPercent: number;
  conditions: AccountMissionCondition[];
  nextAction: AccountMissionNextAction | null;
  consistency: AccountConsistencyView | null;
}

export interface AccountMissionUnavailable {
  available: false;
  reason: string;
}

export interface BuildAccountMissionViewParams {
  accountId: string;
  now: Date;
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

function toPercent(ratio: string): number {
  return Math.round(new Decimal(ratio).times(100).toNumber());
}

/**
 * Exhaustive on purpose (see @wariba/domain's deriveHubDisplayState for the
 * same pattern): a silent `default: return 'active'` would let a
 * pending/inactive/closed account's mission view render as if it were
 * actively evaluating. Those three states are genuinely out of scope for a
 * mission view — the only known caller (apps/web/app/(platform)/hub/page.tsx)
 * already filters them out before calling buildAccountMissionView — so this
 * throws instead of guessing, the same way evaluateAccountRisk refuses to
 * silently invent a result for an unsupported shape.
 */
function toMissionState(hubState: HubDisplayState): AccountMissionState {
  switch (hubState) {
    case 'active':
      return 'active';
    case 'attention':
      return 'attention';
    case 'soft_locked':
      return 'frozen';
    case 'target_waiting':
      return 'waiting';
    case 'passed':
      return 'passed';
    case 'breached':
      return 'breached';
    case 'pending_activation':
    case 'inactive':
    case 'closed':
      throw new Error(
        `toMissionState: hub state "${hubState}" has no mission-view representation — ` +
          'callers must filter pending/inactive/closed accounts out before building a mission view.',
      );
    default: {
      const exhaustive: never = hubState;
      throw new Error(`toMissionState: unhandled hub display state ${String(exhaustive)}`);
    }
  }
}

/**
 * Prompt 06 account_mission_view — WARIBA ONE (Evaluation) only. No
 * "Journées qualifiées" section: ONE-024 (LOCKED) removed qualified days
 * from Evaluation entirely; the component built for them is documented as
 * Performance-only, and no WARIBA_PERFORMANCE policy is published yet
 * (returns `available: false` instead of inventing data — Prompt Pack STOP
 * CONDITION). No "minimum trading days" condition either — ONE-023.
 */
export async function buildAccountMissionView(
  db: Db,
  params: BuildAccountMissionViewParams,
): Promise<AccountMissionView | AccountMissionUnavailable> {
  let inputs: AccountRiskEngineInputs;
  try {
    inputs = await loadAccountRiskEngineInputs(db, params);
  } catch (error) {
    if (error instanceof UnsupportedProgramError) {
      return {
        available: false,
        reason: 'Mission Performance : aucune règle publiée pour l’instant.',
      };
    }
    throw error;
  }
  return projectAccountMissionView(inputs);
}

export function projectAccountMissionView(inputs: AccountRiskEngineInputs): AccountMissionView {
  const { result } = inputs;

  const hubState = deriveHubDisplayState({
    accountStatus: inputs.accountStatus,
    attention: {
      dailyLossFloor: result.dailyLoss.floor,
      dailyLossUsed: result.dailyLoss.used,
      maximumLossRemaining: result.maximumLoss.remaining,
      maximumLossBudget: new Decimal(inputs.nominalBalance)
        .times(inputs.policy.parameters.maximum_loss_rate)
        .toFixed(2),
    },
  });

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        new Decimal(result.realizedNetProfit)
          .dividedBy(result.target.required)
          .times(100)
          .toNumber(),
      ),
    ),
  );

  const conditions: AccountMissionCondition[] = [
    {
      label: 'Objectif de profit',
      detail: `${formatUsd(result.realizedNetProfit)} / ${formatUsd(result.target.required)}`,
      met: result.target.reached,
    },
    {
      label: 'Consistance',
      detail:
        result.bestDay.ratio === null
          ? 'Aucune journée positive pour l’instant'
          : `${toPercent(result.bestDay.ratio)} % (limite ${toPercent(inputs.policy.parameters.best_day_max_ratio)} %)`,
      met: result.bestDay.compliant,
    },
    {
      label: 'Aucune position ouverte',
      detail:
        inputs.openPositionCount === 0
          ? 'Confirmé'
          : `${inputs.openPositionCount} position(s) ouverte(s)`,
      met: inputs.openPositionCount === 0,
    },
    {
      label: 'Perte maximale non atteinte',
      detail: result.maximumLoss.breached ? 'Plancher atteint' : 'Plancher non atteint',
      met: !result.maximumLoss.breached,
    },
  ];

  const nextAction = deriveNextAction(hubState, inputs.openPositionCount);

  let consistency: AccountConsistencyView | null = null;
  if (result.bestDay.ratio !== null) {
    consistency = {
      ratioPercent: toPercent(result.bestDay.ratio),
      limitPercent: toPercent(inputs.policy.parameters.best_day_max_ratio),
      bestDayFormatted: formatUsd(result.bestDay.bestDayProfit),
      totalProfitFormatted: formatUsd(result.bestDay.positiveDaysProfitSum),
    };
    // UX §21.4 — "profit total requis pour conformité lorsque calculable": the
    // additional total positive-day profit that would bring the ratio back to
    // the limit, keeping the same best day. Pure algebra on already-computed
    // figures, not a new financial rule.
    if (!result.bestDay.compliant) {
      consistency.requiredProfitFormatted = formatUsd(
        Decimal.max(
          0,
          new Decimal(result.bestDay.bestDayProfit)
            .dividedBy(inputs.policy.parameters.best_day_max_ratio)
            .minus(result.bestDay.positiveDaysProfitSum),
        ).toFixed(2),
      );
    }
  }

  return {
    available: true,
    variant: 'evaluation',
    state: toMissionState(hubState),
    title:
      hubState === 'passed'
        ? 'Évaluation réussie'
        : hubState === 'breached'
          ? 'Évaluation terminée'
          : 'Atteignez 10 % de profit net réalisé',
    progressPercent,
    conditions,
    nextAction,
    consistency,
  };
}

/**
 * `attention` and `soft_locked` return null here on purpose: the page
 * substitutes the risk-detail dialog trigger (HubRiskDetail) for those two
 * states instead of a plain link, since "see the rule" is an interruption
 * (Design System §24.12 Dialog), not a navigation.
 */
function deriveNextAction(
  hubState: HubDisplayState,
  openPositionCount: number,
): AccountMissionNextAction | null {
  switch (hubState) {
    case 'active':
      return { label: 'Ouvrir WariX', href: '/trade' };
    case 'target_waiting':
      return openPositionCount > 0
        ? { label: 'Fermer les positions ouvertes', href: '/trade' }
        : null;
    case 'breached':
      return { label: 'Voir la chronologie et la preuve', href: '#activity' };
    default:
      return null;
  }
}
