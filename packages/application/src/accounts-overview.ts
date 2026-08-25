import type { Db } from '@wariba/database';
import { listAccountsForUser, type AccountSummaryDTO } from './accounts-list';
import { buildAccountRiskView, type AccountRiskView } from './risk-view';
import { buildAccountMissionView } from './mission-view';
import { buildAccountPerformanceMissionView } from './performance-mission-view';
import { deriveAccountHealth, type AccountHealthView } from './account-health';
import { deriveAccountLifecycle, type AccountLifecycleView } from './account-lifecycle';

/**
 * Every account a trader owns, each with enough state to be worth a card.
 *
 * ## Why the per-account detail is optional
 *
 * The risk engine only has anything to say about an account that has been
 * activated: `loadAccountRiskEngineInputs` refuses a `pending_activation` row,
 * and it should — there is no equity, no floor and no daily reference until
 * activation writes them. So `detail` is `null` for those accounts and the
 * card renders its lifecycle state alone, which is all that is true of them.
 *
 * Failures are caught per account rather than per request. One account whose
 * policy is mid-migration must not blank the list of the other four; the card
 * degrades to its lifecycle state and the rest of the page is unaffected.
 */

export interface AccountOverviewDetail {
  balanceFormatted: string;
  equity: string;
  dailyLossRemainingFormatted: string;
  maximumLossRemainingFormatted: string;
  health: AccountHealthView;
  /**
   * Mission progress, 0-100. `null` on accounts with no mission.
   *
   * What it measures differs by program — the profit objective on WARIBA ONE,
   * the permanent buffer on Performance — so the label travels with it. A card
   * that hardcodes "Objectif" reports a rule a Performance account does not
   * have.
   */
  progressPercent: number | null;
  progressLabel: string | null;
  /** "612 / 1 000 USD" — the figures behind the percentage. */
  progressDetail: string | null;
  consistencyLabel: string | null;
  /**
   * Remaining room on each budget, 0-100.
   *
   * Carried per account so the portfolio can draw the same risk strips the
   * dashboard draws, from the same projection. `health.roomPercent` is only
   * the *worse* of the two — enough for a single ring, not enough to show a
   * trader which of their five accounts is short of daily room specifically.
   */
  room: AccountRiskView['room'];
  /** Closed sessions on this account. `null` when none have been recorded. */
  tradingDays: number | null;
  /** `21 août 2026` — the last day the account actually recorded a session. */
  lastActivityLabel: string | null;
  hasViolation: boolean;
}

export interface AccountOverviewItem {
  account: AccountSummaryDTO;
  lifecycle: AccountLifecycleView;
  detail: AccountOverviewDetail | null;
}

export type AccountFilter = 'all' | 'evaluation' | 'review' | 'funded' | 'failed' | 'closed';

/**
 * Which filter bucket an account falls in.
 *
 * Buckets are lifecycle-driven, not status-driven, so "En vérification"
 * genuinely means the two states a trader experiences as waiting on WARIBA
 * rather than the single database value they happen to share.
 */
export function accountFilterOf(item: AccountOverviewItem): Exclude<AccountFilter, 'all'> {
  switch (item.lifecycle.state) {
    case 'breached':
      return 'failed';
    case 'closed':
    case 'inactive':
      return 'closed';
    case 'under_review':
    case 'passed':
    case 'funded_preparing':
      return 'review';
    case 'funded_active':
      return 'funded';
    default:
      return 'evaluation';
  }
}

export async function buildAccountsOverview(
  db: Db,
  params: { userId: string },
): Promise<AccountOverviewItem[]> {
  const accounts = await listAccountsForUser(db, { userId: params.userId });

  return Promise.all(
    accounts.map(async (account): Promise<AccountOverviewItem> => {
      const activated =
        account.status !== 'pending_activation' &&
        account.status !== 'inactive' &&
        account.status !== 'closed';

      if (!activated) {
        return {
          account,
          lifecycle: deriveAccountLifecycle({
            accountStatus: account.status,
            programType: account.programType,
          }),
          detail: null,
        };
      }

      try {
        const now = new Date();
        const [risk, mission, sessions] = await Promise.all([
          buildAccountRiskView(db, { accountId: account.id, now }),
          account.programType === 'WARIBA_PERFORMANCE'
            ? buildAccountPerformanceMissionView(db, { accountId: account.id })
            : buildAccountMissionView(db, { accountId: account.id, now }),
          /*
           * Closed sessions, newest first.
           *
           * "Last activity" on a trading account means the last day it
           * actually traded, not the last time a row was touched — an
           * `updated_at` moves whenever a background job writes, which would
           * tell a dormant trader they were active this morning.
           */
          db
            .selectFrom('app.account_daily_snapshots')
            .select(['trading_day'])
            .where('account_id', '=', account.id)
            .where('status', '=', 'finalized')
            .orderBy('trading_day', 'desc')
            .execute()
            .catch(() => [] as { trading_day: string }[]),
        ]);

        const lifecycle = deriveAccountLifecycle({
          accountStatus: account.status,
          programType: account.programType,
          inAttentionZone: risk.status === 'attention',
        });

        const health = deriveAccountHealth({
          dailyLossRemaining: risk.amounts.dailyLossRemaining,
          dailyLossBudget: risk.amounts.dailyLossBudget,
          maximumLossRemaining: risk.amounts.maximumLossRemaining,
          maximumLossBudget: risk.amounts.maximumLossBudget,
          hasViolation: risk.violations.length > 0,
          terminal: lifecycle.terminal,
        });

        return {
          account,
          lifecycle,
          detail: {
            balanceFormatted: risk.currentEquityFormatted,
            equity: risk.amounts.currentEquity,
            dailyLossRemainingFormatted: risk.dailyLossRemainingFormatted,
            maximumLossRemainingFormatted: risk.maximumLossRemainingFormatted,
            health,
            room: risk.room,
            progressPercent: mission.available ? mission.progressPercent : null,
            progressLabel: mission.available ? mission.progressLabel : null,
            progressDetail: mission.available ? mission.progressDetail : null,
            consistencyLabel: mission.available
              ? (mission.conditions.find((condition) => condition.label === 'Consistance')
                  ?.detail ?? null)
              : null,
            tradingDays: sessions.length > 0 ? sessions.length : null,
            lastActivityLabel: sessions[0]
              ? new Date(`${sessions[0].trading_day}T00:00:00.000Z`).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : null,
            hasViolation: risk.violations.length > 0,
          },
        };
      } catch {
        /*
         * One account's read model failing must not blank the other four. The
         * card falls back to its lifecycle state, which is derived from the
         * status column alone and cannot fail.
         */
        return {
          account,
          lifecycle: deriveAccountLifecycle({
            accountStatus: account.status,
            programType: account.programType,
          }),
          detail: null,
        };
      }
    }),
  );
}
