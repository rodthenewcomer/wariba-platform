import type { Db } from '@wariba/database';
import { listAccountsForUser, type AccountSummaryDTO } from './accounts-list';
import { buildAccountRiskView } from './risk-view';
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
  /** Objective progress, 0-100. `null` on accounts with no mission. */
  progressPercent: number | null;
  objectiveDetail: string | null;
  consistencyLabel: string | null;
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
        const [risk, mission] = await Promise.all([
          buildAccountRiskView(db, { accountId: account.id, now }),
          account.programType === 'WARIBA_PERFORMANCE'
            ? buildAccountPerformanceMissionView(db, { accountId: account.id })
            : buildAccountMissionView(db, { accountId: account.id, now }),
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
            progressPercent: mission.available ? mission.progressPercent : null,
            objectiveDetail: mission.available ? (mission.conditions[0]?.detail ?? null) : null,
            consistencyLabel: mission.available
              ? (mission.conditions.find((condition) => condition.label === 'Consistance')
                  ?.detail ?? null)
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
