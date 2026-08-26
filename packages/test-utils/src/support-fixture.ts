import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import type { ContestationReasonCategory, Db, SupportTicketCategory } from '@wariba/database';

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
      // La valeur que `risk.ts` écrit réellement pour active->breached. La
      // fixture disait `maximum_loss_breached` — un mot que la production
      // n'écrit jamais — et le fil d'activité, faute de traduction, imprimait
      // l'identifiant tel quel dans les captures de preuve.
      reason: 'maximum_loss_breach',
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

export interface SeededSupportTicket {
  id: string;
  reference: string;
}

/**
 * A support request that already exists, without driving the UI to make one.
 *
 * ## Why a fixture rather than "just create it through the form"
 *
 * Creating a ticket through the form is the *functional* test's subject, and
 * it belongs there. Every other suite — the authorization checks, the
 * responsive captures — needs a ticket to exist, not a ticket to be created;
 * making them each walk the form spends a minute of wall clock and a login on
 * setup, and couples an RBAC failure to a form regression. Two suites failing
 * for one cause is two investigations.
 *
 * Nothing here is invented: the row is written through the same columns the
 * application command writes, and the reference comes back from the database's
 * own `public_id` sequence rather than being chosen here.
 */
export async function seedSupportTicket(
  db: Db,
  params: {
    userId: string;
    accountId?: string | null;
    category?: SupportTicketCategory;
    subject?: string;
    body?: string;
  },
): Promise<SeededSupportTicket> {
  const correlationId = randomUUID();
  const ticket = await db
    .insertInto('app.support_tickets')
    .values({
      user_id: params.userId,
      account_id: params.accountId ?? null,
      category: params.category ?? 'trading',
      subject: params.subject ?? 'Ordre refusé sur XAUUSD',
      correlation_id: correlationId,
    })
    .returning(['id', 'public_id'])
    .executeTakeFirstOrThrow();

  await db
    .insertInto('app.ticket_messages')
    .values({
      ticket_id: ticket.id,
      actor_type: 'trader',
      actor_user_id: params.userId,
      body:
        params.body ??
        'Mon ordre a été refusé alors que la marge me semblait suffisante. Pouvez-vous vérifier ?',
      correlation_id: correlationId,
    })
    .execute();

  return { id: ticket.id, reference: ticket.public_id };
}

export interface SeededContestation {
  id: string;
  reference: string;
  ticketId: string;
}

/**
 * An open contestation pointing at a real recorded violation.
 *
 * Requires `seedBreachEvidence` to have run for the account: a contestation
 * whose `target_id` names no row is the incoherent state this package refuses
 * to create, because the evidence panel would then have nothing to render and
 * the test would be measuring an empty state it did not mean to.
 */
export async function seedContestation(
  db: Db,
  params: {
    userId: string;
    accountId: string;
    riskViolationId: string;
    reasonCategory?: ContestationReasonCategory;
    traderStatement?: string;
  },
): Promise<SeededContestation> {
  const correlationId = randomUUID();
  const ticket = await seedSupportTicket(db, {
    userId: params.userId,
    accountId: params.accountId,
    category: 'account',
    subject: 'Contestation de la décision de perte maximale',
  });

  const contestation = await db
    .insertInto('app.contestations')
    .values({
      user_id: params.userId,
      ticket_id: ticket.id,
      account_id: params.accountId,
      target_type: 'account_breach',
      target_id: params.riskViolationId,
      reason_category: params.reasonCategory ?? 'rule_misapplied',
      trader_statement:
        params.traderStatement ??
        'Le plancher de perte maximale retenu ne correspond pas à ma meilleure balance de clôture.',
      evidence_ref: JSON.stringify({ riskViolationId: params.riskViolationId }),
      correlation_id: correlationId,
    })
    .returning(['id', 'public_id'])
    .executeTakeFirstOrThrow();

  return { id: contestation.id, reference: contestation.public_id, ticketId: ticket.id };
}
