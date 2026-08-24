import {
  appendTraderMessage,
  consumeActorActionRateLimit,
  createSupportTicket,
  listContestableDecisions,
  openContestation,
  type ContestableDecision,
  type ContestationReasonCategory,
  type ContestationTargetType,
  type Db,
  type SupportTicketCategory,
} from '@wariba/database';
import { RISK_RULE_LABELS } from './risk-view';
import { CONSEQUENCE_LABELS, formatSupportTimestamp } from './support-view';

/**
 * Phase 3.2 — the trader's write path into Support.
 *
 * ## Rate limits, sized for a person having a bad day
 *
 * A trader whose account has just been terminated will legitimately send
 * several messages in a row, and a limit that treats that as abuse is a limit
 * that punishes exactly the person support exists for. So the windows are
 * generous and the failure is explicit ("réessayez dans un instant"), never a
 * silent drop:
 *
 *   5 new requests / hour        — a real person opens one, maybe two
 *   20 messages / hour           — a conversation, not a flood
 *   3 contestations / day        — each one is a formal dispute
 *
 * These are beta-level guards against a script, not a commercial quota, and
 * nothing here is presented to the trader as an entitlement.
 */

const RATE_LIMITS = {
  ticket: { action: 'support.ticket.create', limit: 5, windowMs: 3_600_000 },
  message: { action: 'support.message.create', limit: 20, windowMs: 3_600_000 },
  contestation: { action: 'support.contestation.create', limit: 3, windowMs: 86_400_000 },
} as const;

export interface SubmitSupportTicketParams {
  userId: string;
  category: SupportTicketCategory;
  accountId: string | null;
  subject: string;
  body: string;
  correlationId: string;
  now?: Date;
}

export async function submitSupportTicket(
  db: Db,
  params: SubmitSupportTicketParams,
): Promise<{ publicId: string }> {
  await consumeActorActionRateLimit(db, {
    actorId: params.userId,
    action: RATE_LIMITS.ticket.action,
    limit: RATE_LIMITS.ticket.limit,
    windowMs: RATE_LIMITS.ticket.windowMs,
    ...(params.now ? { now: params.now } : {}),
  });

  const created = await createSupportTicket(db, {
    userId: params.userId,
    accountId: params.accountId,
    category: params.category,
    subject: params.subject,
    body: params.body,
    correlationId: params.correlationId,
    ...(params.now ? { now: params.now } : {}),
  });
  return { publicId: created.publicId };
}

export interface SubmitSupportReplyParams {
  userId: string;
  publicId: string;
  body: string;
  correlationId: string;
  now?: Date;
}

export async function submitSupportReply(db: Db, params: SubmitSupportReplyParams): Promise<void> {
  await consumeActorActionRateLimit(db, {
    actorId: params.userId,
    action: RATE_LIMITS.message.action,
    limit: RATE_LIMITS.message.limit,
    windowMs: RATE_LIMITS.message.windowMs,
    ...(params.now ? { now: params.now } : {}),
  });

  await appendTraderMessage(db, {
    userId: params.userId,
    publicId: params.publicId,
    body: params.body,
    correlationId: params.correlationId,
    ...(params.now ? { now: params.now } : {}),
  });
}

export interface SubmitContestationParams {
  userId: string;
  accountId: string;
  targetId: string;
  targetType?: ContestationTargetType;
  reasonCategory: ContestationReasonCategory;
  traderStatement: string;
  correlationId: string;
  now?: Date;
}

export async function submitContestation(
  db: Db,
  params: SubmitContestationParams,
): Promise<{ contestationPublicId: string; ticketPublicId: string }> {
  await consumeActorActionRateLimit(db, {
    actorId: params.userId,
    action: RATE_LIMITS.contestation.action,
    limit: RATE_LIMITS.contestation.limit,
    windowMs: RATE_LIMITS.contestation.windowMs,
    ...(params.now ? { now: params.now } : {}),
  });

  /*
   * The contested rule's name, in the product's language.
   *
   * Resolved here because the rule vocabulary lives in this layer. The lookup
   * is scoped to the trader's own account, so it cannot be used to learn
   * anything about a decision that is not theirs — and if the decision does
   * not resolve, the command's own ownership check refuses the write a moment
   * later anyway.
   */
  const decisions = await listContestableDecisions(db, {
    userId: params.userId,
    accountId: params.accountId,
  });
  const target = decisions.find((decision) => decision.riskViolationId === params.targetId);
  const ruleLabel = target ? (RISK_RULE_LABELS[target.ruleCode] ?? target.ruleCode) : undefined;

  const opened = await openContestation(db, {
    userId: params.userId,
    accountId: params.accountId,
    targetType: params.targetType ?? 'account_breach',
    targetId: params.targetId,
    reasonCategory: params.reasonCategory,
    traderStatement: params.traderStatement,
    ...(ruleLabel ? { ruleLabel } : {}),
    correlationId: params.correlationId,
    ...(params.now ? { now: params.now } : {}),
  });
  return {
    contestationPublicId: opened.contestationPublicId,
    ticketPublicId: opened.ticketPublicId,
  };
}

export interface ContestableDecisionOption {
  targetId: string;
  targetType: ContestationTargetType;
  ruleLabel: string;
  ruleCode: string;
  consequenceLabel: string;
  occurredAtLabel: string;
  thresholdFormatted: string;
  observedFormatted: string;
  /** Set when a live contestation already exists — the option is shown, disabled. */
  existingContestationPublicId: string | null;
}

function formatUsd(amount: string | null): string {
  if (amount === null) return '—';
  const parsed = Number.parseFloat(amount);
  if (Number.isNaN(parsed)) return '—';
  return `${parsed.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

/**
 * A terminal breach is contested as a breach; a session lock is a risk
 * decision. The distinction survives into the queue, where the two are
 * triaged by different people.
 */
function targetTypeFor(decision: ContestableDecision): ContestationTargetType {
  return decision.consequence === 'hard_breach' ? 'account_breach' : 'risk_decision';
}

/**
 * The decisions this trader may contest on this account.
 *
 * Returned as options rather than as a free-text field: a contestation names
 * a specific recorded decision, and letting someone type an identifier is both
 * an enumeration surface and a guarantee of typos in a formal dispute.
 */
export async function listContestableDecisionOptions(
  db: Db,
  params: { userId: string; accountId: string },
): Promise<readonly ContestableDecisionOption[]> {
  const decisions = await listContestableDecisions(db, params);
  return decisions.map((decision) => ({
    targetId: decision.riskViolationId,
    targetType: targetTypeFor(decision),
    ruleLabel: RISK_RULE_LABELS[decision.ruleCode] ?? decision.ruleCode,
    ruleCode: decision.ruleCode,
    consequenceLabel: CONSEQUENCE_LABELS[decision.consequence] ?? decision.consequence,
    occurredAtLabel: formatSupportTimestamp(decision.occurredAt),
    thresholdFormatted: formatUsd(decision.thresholdValue),
    observedFormatted: formatUsd(decision.observedValue),
    existingContestationPublicId: decision.existingContestationPublicId,
  }));
}
