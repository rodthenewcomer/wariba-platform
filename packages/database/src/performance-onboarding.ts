import type { Db } from './client';

export type PerformanceRulesAcknowledgementErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_NOT_PERFORMANCE'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'ACKNOWLEDGEMENT_INTEGRITY_ERROR';

export class PerformanceRulesAcknowledgementError extends Error {
  override readonly name = 'PerformanceRulesAcknowledgementError';

  constructor(
    readonly code: PerformanceRulesAcknowledgementErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface PerformanceRulesAcknowledgement {
  id: string;
  userId: string;
  accountId: string;
  policyVersionId: string;
  acknowledgedAt: Date;
  alreadyExisted: boolean;
}

/**
 * Records acknowledgement of the exact policy already attached to a
 * Performance account. This is evidence, not activation: it cannot change
 * account status, policy, balance, permissions, cycles or any risk fact.
 */
export async function acknowledgePerformanceRules(
  db: Db,
  params: {
    userId: string;
    accountId: string;
    correlationId: string;
    now: Date;
  },
): Promise<PerformanceRulesAcknowledgement> {
  return db.transaction().execute(async (trx) => {
    const account = await trx
      .selectFrom('app.trading_accounts')
      .select(['id', 'user_id', 'program_type', 'status', 'policy_version_id'])
      .where('id', '=', params.accountId)
      .where('user_id', '=', params.userId)
      .forUpdate()
      .executeTakeFirst();

    if (!account) {
      throw new PerformanceRulesAcknowledgementError(
        'ACCOUNT_NOT_FOUND',
        'Ce compte Performance est introuvable.',
      );
    }
    if (account.program_type !== 'WARIBA_PERFORMANCE') {
      throw new PerformanceRulesAcknowledgementError(
        'ACCOUNT_NOT_PERFORMANCE',
        'Cette confirmation concerne uniquement un compte WARIBA Performance.',
      );
    }
    if (account.status !== 'active') {
      throw new PerformanceRulesAcknowledgementError(
        'ACCOUNT_NOT_ACTIVE',
        'Ce compte Performance n’est pas actif.',
      );
    }

    const inserted = await trx
      .insertInto('app.performance_rule_acknowledgements')
      .values({
        user_id: params.userId,
        account_id: account.id,
        policy_version_id: account.policy_version_id,
        source: 'performance_onboarding',
        acknowledged_at: params.now,
        correlation_id: params.correlationId,
      })
      .onConflict((oc) => oc.column('account_id').doNothing())
      .returning(['id', 'acknowledged_at'])
      .executeTakeFirst();

    if (!inserted) {
      const existing = await trx
        .selectFrom('app.performance_rule_acknowledgements')
        .select(['id', 'user_id', 'policy_version_id', 'acknowledged_at'])
        .where('account_id', '=', account.id)
        .executeTakeFirstOrThrow();
      if (
        existing.user_id !== params.userId ||
        existing.policy_version_id !== account.policy_version_id
      ) {
        throw new PerformanceRulesAcknowledgementError(
          'ACKNOWLEDGEMENT_INTEGRITY_ERROR',
          'La preuve de lecture ne correspond pas à la version attachée au compte.',
        );
      }
      return {
        id: existing.id,
        userId: existing.user_id,
        accountId: account.id,
        policyVersionId: existing.policy_version_id,
        acknowledgedAt: existing.acknowledged_at,
        alreadyExisted: true,
      };
    }

    await trx
      .insertInto('audit.audit_events')
      .values({
        actor_type: 'user',
        actor_id: params.userId,
        role: 'trader',
        permission: 'performance.rules.acknowledge',
        action: 'performance.rules_acknowledged',
        target_type: 'trading_account',
        target_id: account.id,
        before_json: null,
        after_json: JSON.stringify({
          policyVersionId: account.policy_version_id,
          source: 'performance_onboarding',
        }),
        reason: 'performance_onboarding',
        source: 'web',
        correlation_id: params.correlationId,
        occurred_at: params.now,
        created_at: params.now,
      })
      .execute();

    await trx
      .insertInto('app.outbox_events')
      .values({
        aggregate_type: 'trading_account',
        aggregate_id: account.id,
        event_type: 'performance_rules_acknowledged',
        payload: JSON.stringify({
          accountId: account.id,
          userId: params.userId,
          policyVersionId: account.policy_version_id,
          acknowledgementId: inserted.id,
        }),
        occurred_at: params.now,
      })
      .execute();

    return {
      id: inserted.id,
      userId: params.userId,
      accountId: account.id,
      policyVersionId: account.policy_version_id,
      acknowledgedAt: inserted.acknowledged_at,
      alreadyExisted: false,
    };
  });
}

export async function loadPerformanceRulesAcknowledgement(
  db: Db,
  params: { userId: string; accountId: string },
): Promise<Omit<PerformanceRulesAcknowledgement, 'alreadyExisted'> | null> {
  const row = await db
    .selectFrom('app.performance_rule_acknowledgements')
    .select(['id', 'user_id', 'account_id', 'policy_version_id', 'acknowledged_at'])
    .where('user_id', '=', params.userId)
    .where('account_id', '=', params.accountId)
    .executeTakeFirst();
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        accountId: row.account_id,
        policyVersionId: row.policy_version_id,
        acknowledgedAt: row.acknowledged_at,
      }
    : null;
}
