import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';

/**
 * Phase 3.2 fixtures — a recorded breach that can actually be contested.
 *
 * ## Why this exists
 *
 * `seedLifecycleFixture('breached')` poses `trading_accounts.status`, which is
 * enough to photograph a banner but not enough to contest anything: a
 * contestation points at a row in `app.risk_violations`, and the lifecycle
 * fixture writes none. An account marked breached with no violation behind it
 * is, in fact, the incoherent state — this makes the fixture whole.
 *
 * ## Nothing is invented
 *
 * The threshold is computed from the account's *own* published policy
 * (`maximum_loss_rate` against its nominal), exactly as the risk engine
 * computes the initial Maximum Loss floor. The observed value is one unit
 * below that threshold, which is the minimal state that satisfies the rule the
 * violation records. No balance, fill or snapshot is fabricated — this writes
 * the evidence row for a breach the fixture has already declared, and nothing
 * else.
 *
 * Same containment as the other fixtures: it lives in `@wariba/test-utils`,
 * which no application package depends on.
 */
export interface SeededBreachEvidence {
  riskViolationId: string;
  policyVersionId: string;
  thresholdValue: string;
  observedValue: string;
  accountStateTransitionId: string;
}

export async function seedBreachEvidence(
  db: Db,
  params: { accountId: string; now?: Date },
): Promise<SeededBreachEvidence> {
  const now = params.now ?? new Date();

  const account = await db
    .selectFrom('app.trading_accounts')
    .innerJoin(
      'app.policy_versions',
      'app.policy_versions.id',
      'app.trading_accounts.policy_version_id',
    )
    .select([
      'app.trading_accounts.id as id',
      'app.trading_accounts.nominal_balance as nominal_balance',
      'app.policy_versions.id as policy_version_id',
      'app.policy_versions.parameters_json as parameters_json',
    ])
    .where('app.trading_accounts.id', '=', params.accountId)
    .executeTakeFirstOrThrow();

  const parameters = account.parameters_json as { maximum_loss_rate?: string };
  const maximumLossRate = new Decimal(parameters.maximum_loss_rate ?? '0.10');
  const nominal = new Decimal(account.nominal_balance);
  // The initial Maximum Loss floor: nominal × (1 − rate). The same formula the
  // risk engine applies, not a number chosen to look plausible.
  const threshold = nominal.times(new Decimal(1).minus(maximumLossRate));
  const observed = threshold.minus(1);

  const transition = await db
    .insertInto('app.account_state_transitions')
    .values({
      account_id: account.id,
      from_status: 'active',
      to_status: 'breached',
      reason: 'maximum_loss_breached',
      occurred_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const violation = await db
    .insertInto('app.risk_violations')
    .values({
      account_id: account.id,
      rule_code: 'RISK_MAXIMUM_LOSS_BREACH',
      severity: 'critical',
      consequence: 'hard_breach',
      policy_version_id: account.policy_version_id,
      threshold_value: threshold.toFixed(2),
      observed_value: observed.toFixed(2),
      account_state_transition_id: transition.id,
      trigger_event_type: 'manual_review',
      trigger_event_id: randomUUID(),
      price_snapshot: JSON.stringify({}),
      occurred_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return {
    riskViolationId: violation.id,
    policyVersionId: account.policy_version_id,
    thresholdValue: threshold.toFixed(2),
    observedValue: observed.toFixed(2),
    accountStateTransitionId: transition.id,
  };
}

/**
 * Removes everything Phase 3.2 wrote for a user.
 *
 * `app.ticket_messages` is append-only and refuses a DELETE while its ticket
 * still exists, so teardown deletes the tickets and lets the cascade take the
 * messages — which is precisely the case the trigger allows.
 */
export async function deleteSupportFixture(db: Db, userId: string): Promise<void> {
  await db.deleteFrom('app.contestations').where('user_id', '=', userId).execute();
  await db.deleteFrom('app.support_tickets').where('user_id', '=', userId).execute();
  await db.deleteFrom('app.staff_action_rate_limits').where('actor_id', '=', userId).execute();
}
