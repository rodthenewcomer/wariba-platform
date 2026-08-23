import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';
import { deriveAccountHealth, type AccountHealthView } from './account-health';
import { deriveAccountLifecycle, type AccountLifecycleView } from './account-lifecycle';
import type { AccountSummaryDTO } from './accounts-list';
import { buildAccountHubView, type AccountHubView } from './hub-view';
import {
  buildAccountMissionView,
  type AccountMissionUnavailable,
  type AccountMissionView,
} from './mission-view';
import {
  buildAccountPerformanceMissionView,
  type AccountPerformanceMissionUnavailable,
  type AccountPerformanceMissionView,
} from './performance-mission-view';
import { buildAccountRiskView, type AccountRiskView } from './risk-view';
import { buildPerformanceAnalytics, type PerformanceAnalytics } from './performance-analytics';
import { buildRecentActivityView, type ActivityItem } from './activity-view';
import { buildOpenPositionsView, type OpenPositionItem } from './positions-view';
import { buildPayoutLifecycle, type PayoutLifecycleView } from './payout-lifecycle';

/**
 * Both programs' missions, as one value.
 *
 * An Evaluation account is working toward a profit objective; a Performance
 * account is working through a payout cycle. They are genuinely different
 * missions, so they are different shapes rather than one shape with half its
 * fields nullable — and `variant` is the discriminant every consumer narrows
 * on before reading either.
 */
export type CommandCenterMission =
  | AccountMissionView
  | AccountMissionUnavailable
  | AccountPerformanceMissionView
  | AccountPerformanceMissionUnavailable;

/**
 * One account, as of one instant.
 *
 * ## Why this exists
 *
 * Before Phase 2.5 the dashboard called seven read models itself and then did
 * the last mile of reasoning in the page component: which lifecycle applies,
 * whether the account is healthy, what the P&L's sign is, which threshold
 * lines to draw. Each of those is a statement about money, and each was being
 * made in a React component that also decides grid columns.
 *
 * The cost is not theoretical. Two of those derivations were already wrong in
 * ways only a read of the source would reveal — the P&L colour came from a
 * regex over a formatted string, and account health graded an untraded account
 * "Excellent". Both are the same failure: financial meaning derived at the
 * presentation layer, where nobody tests it.
 *
 * So this composes the snapshot once, on the server, and every figure in it
 * describes the same account at the same `capturedAt`. The page arranges it.
 * It does not reinterpret it.
 *
 * ## What this is not
 *
 * It is not a new financial model. Every number here comes from a read model
 * that already owned it — `evaluateAccountRisk` still owns risk,
 * `performance-analytics` still owns the record, `payout-lifecycle` still owns
 * eligibility. This is composition and one derived reading (`hasMeaningfulActivity`),
 * and that reading is a fact about data volume, not about money.
 */
export interface CommandCenterView {
  account: {
    id: string;
    publicId: string;
    programType: string;
    nominalBalance: string;
    nominalCurrency: string;
  };
  lifecycle: AccountLifecycleView;
  hub: AccountHubView;
  risk: AccountRiskView;
  mission: CommandCenterMission;
  health: AccountHealthView;
  performance: PerformanceAnalytics;
  positions: readonly OpenPositionItem[];
  activity: readonly ActivityItem[];
  /** Only ever populated for a Performance account. */
  payout: PayoutLifecycleView | null;
  /**
   * Whether this account has been exposed to a decision yet.
   *
   * True once a trade has closed or a session has finalised. It gates §11's
   * health copy and the surfaces that would otherwise render an analytics
   * skeleton for an account with nothing in it.
   */
  hasMeaningfulActivity: boolean;
  /**
   * The lines worth drawing on the balance axis.
   *
   * Built here because both come from read models — the ratcheting floor from
   * the risk engine, the objective from the mission — and a chart component
   * that reconstructed either would be re-deriving a threshold the rulebook
   * defines.
   */
  thresholds: readonly { value: number; label: string; tone: 'red' | 'emerald' }[];
  /** The instant every figure above describes. */
  capturedAt: string;
}

export interface BuildCommandCenterViewParams {
  account: AccountSummaryDTO;
  now: Date;
}

/**
 * Precondition: `account.status` has left `pending_activation` and is neither
 * `inactive` nor `closed`. Those three have no risk-engine state to read and
 * the read models below throw rather than invent one — the caller renders them
 * from the lighter `AccountSummaryDTO` instead.
 */
export async function buildCommandCenterView(
  db: Db,
  params: BuildCommandCenterViewParams,
): Promise<CommandCenterView> {
  const { account, now } = params;
  const isPerformance = account.programType === 'WARIBA_PERFORMANCE';

  /*
   * The mission is the only one of these that may legitimately have nothing to
   * say — a Performance account whose cycle has not opened has no progress,
   * and `evaluateCycleProgress` throws rather than fabricating one. Correct of
   * it, and no reason to blank a dashboard whose account, risk and balance are
   * all still true.
   */
  const [hub, mission, risk, activity, positions, performance] = await Promise.all([
    buildAccountHubView(db, { accountId: account.id, now }),
    (isPerformance
      ? buildAccountPerformanceMissionView(db, { accountId: account.id })
      : buildAccountMissionView(db, { accountId: account.id, now })
    ).catch((): AccountMissionUnavailable => ({
      available: false,
      reason: 'La progression de ce compte n’est pas encore disponible.',
    })),
    buildAccountRiskView(db, { accountId: account.id, now }),
    buildRecentActivityView(db, { accountId: account.id, limit: 12 }),
    buildOpenPositionsView(db, { accountId: account.id }),
    buildPerformanceAnalytics(db, { accountId: account.id }),
  ]);

  const payout = isPerformance
    ? await buildPayoutLifecycle(db, {
        accountId: account.id,
        kycVerified: account.kycSandboxVerified ?? false,
      }).catch(() => null)
    : null;

  const lifecycle = deriveAccountLifecycle({
    accountStatus: account.status,
    programType: account.programType,
    inAttentionZone: risk.status === 'attention',
    // A session is closed once today's snapshot is finalised — which is what
    // separates "objective reached, still trading" from "under review".
    currentSessionFinalized: hub.tradingDays[0]?.finalized ?? false,
  });

  /*
   * Two independent signals, either of which is sufficient.
   *
   * A closed trade means risk was taken. A finalised session means a full day
   * elapsed under the rules. An account can have the second without the first
   * — activated on Monday, traded nothing, Tuesday's job finalised Monday —
   * and that day still tested the account's discipline in the only sense the
   * rulebook measures.
   */
  const hasMeaningfulActivity = performance.kpis.tradeCount > 0 || hub.finalizedSessionCount > 0;

  const health = deriveAccountHealth({
    dailyLossRemaining: risk.amounts.dailyLossRemaining,
    dailyLossBudget: risk.amounts.dailyLossBudget,
    maximumLossRemaining: risk.amounts.maximumLossRemaining,
    maximumLossBudget: risk.amounts.maximumLossBudget,
    hasViolation: risk.violations.length > 0,
    terminal: lifecycle.terminal,
    hasMeaningfulActivity,
  });

  const thresholds: CommandCenterView['thresholds'] = [
    {
      value: new Decimal(risk.amounts.maximumLossFloor).toNumber(),
      label: 'Perte max.',
      tone: 'red',
    },
    ...(mission.available && mission.variant === 'evaluation'
      ? [
          {
            value: new Decimal(mission.amounts.targetBalance).toNumber(),
            label: 'Objectif',
            tone: 'emerald' as const,
          },
        ]
      : []),
  ];

  return {
    account: {
      id: account.id,
      publicId: account.publicId,
      programType: account.programType,
      nominalBalance: account.nominalBalance,
      nominalCurrency: account.nominalCurrency,
    },
    lifecycle,
    hub,
    risk,
    mission,
    health,
    performance,
    positions,
    activity,
    payout,
    hasMeaningfulActivity,
    thresholds,
    capturedAt: now.toISOString(),
  };
}

/**
 * The subset the client refreshes on a timer (§23).
 *
 * Deliberately small. The whole snapshot includes twelve activity rows and a
 * full analytics pass over every fill the account has ever made; re-fetching
 * that every few seconds to learn whether a balance moved would be expensive
 * and, worse, would make a page that mostly cannot change look like one that
 * constantly does. What actually moves intraday is the balance, the day's P&L,
 * the two risk budgets and the objective — so that is what comes back.
 */
export interface AccountTelemetry {
  accountId: string;
  balance: string;
  balanceFormatted: string;
  pnlToday: string;
  pnlTodayFormatted: string;
  currentEquityFormatted: string;
  dailyLossRemainingFormatted: string;
  maximumLossRemainingFormatted: string;
  room: AccountRiskView['room'];
  riskStatus: AccountRiskView['status'];
  openPositionCount: number;
  progressPercent: number | null;
  nextResetAt: string;
  capturedAt: string;
}

export async function buildAccountTelemetry(
  db: Db,
  params: { account: AccountSummaryDTO; now: Date },
): Promise<AccountTelemetry> {
  const { account, now } = params;
  const isPerformance = account.programType === 'WARIBA_PERFORMANCE';

  const [hub, risk, positions, mission] = await Promise.all([
    buildAccountHubView(db, { accountId: account.id, now }),
    buildAccountRiskView(db, { accountId: account.id, now }),
    buildOpenPositionsView(db, { accountId: account.id }),
    (isPerformance
      ? buildAccountPerformanceMissionView(db, { accountId: account.id })
      : buildAccountMissionView(db, { accountId: account.id, now })
    ).catch((): AccountMissionUnavailable => ({ available: false, reason: '' })),
  ]);

  return {
    accountId: account.id,
    balance: hub.amounts.balance,
    balanceFormatted: hub.balanceFormatted,
    pnlToday: hub.amounts.pnlToday,
    pnlTodayFormatted: hub.pnlTodayFormatted,
    currentEquityFormatted: risk.currentEquityFormatted,
    dailyLossRemainingFormatted: risk.dailyLossRemainingFormatted,
    maximumLossRemainingFormatted: risk.maximumLossRemainingFormatted,
    room: risk.room,
    riskStatus: risk.status,
    openPositionCount: positions.length,
    progressPercent: mission.available ? mission.progressPercent : null,
    nextResetAt: risk.nextResetAt,
    capturedAt: now.toISOString(),
  };
}
