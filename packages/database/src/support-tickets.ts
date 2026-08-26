import type { Db, DbExecutor } from './client';
import type { SupportTicketCategory, SupportTicketStatus, TicketMessageActorType } from './schema';

/**
 * Phase 3.2 — the trader's half of the support system.
 *
 * Everything here is scoped by `userId` in the query itself rather than
 * filtered after the fact. That is the same posture the rest of this package
 * takes with owner-scoped data: a read that forgets the scope returns nothing
 * instead of returning somebody else's ticket, and a lookup by public
 * reference is `where public_id = ? and user_id = ?` so a guessed WRB- number
 * is indistinguishable from one that does not exist.
 *
 * The operator half lives in control-support.ts, so a change to what staff can
 * do cannot accidentally widen what a trader can read.
 */

/** Statuses in which the trader is invited to write. */
const TRADER_REPLYABLE: readonly SupportTicketStatus[] = [
  'open',
  'waiting_for_user',
  'under_review',
  'resolved',
];

export function traderCanReply(status: SupportTicketStatus): boolean {
  return TRADER_REPLYABLE.includes(status);
}

export interface SupportTicketListRow {
  publicId: string;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  accountPublicId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Present when this request carries a contestation, so the list can say so. */
  contestationPublicId: string | null;
}

export async function listSupportTicketsForUser(
  db: Db,
  params: { userId: string; limit?: number },
): Promise<readonly SupportTicketListRow[]> {
  const rows = await db
    .selectFrom('app.support_tickets')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.support_tickets.account_id')
    .leftJoin('app.contestations', 'app.contestations.ticket_id', 'app.support_tickets.id')
    .select([
      'app.support_tickets.public_id as public_id',
      'app.support_tickets.category as category',
      'app.support_tickets.subject as subject',
      'app.support_tickets.status as status',
      'app.support_tickets.created_at as created_at',
      'app.support_tickets.updated_at as updated_at',
      'app.trading_accounts.public_id as account_public_id',
      'app.contestations.public_id as contestation_public_id',
    ])
    .where('app.support_tickets.user_id', '=', params.userId)
    .orderBy('app.support_tickets.updated_at', 'desc')
    .limit(params.limit ?? 50)
    .execute();

  return rows.map((row) => ({
    publicId: row.public_id,
    category: row.category,
    subject: row.subject,
    status: row.status,
    accountPublicId: row.account_public_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contestationPublicId: row.contestation_public_id,
  }));
}

export interface SupportThreadMessage {
  /**
   * Who wrote it, as a class rather than a person.
   *
   * The trader never receives a staff identity — not a name, not an id, not an
   * initial. Which operator answered is an internal fact, and a support thread
   * is the last place a product should start attaching employees to decisions
   * a trader may be unhappy about.
   */
  actorType: TicketMessageActorType;
  body: string;
  createdAt: Date;
}

export interface SupportTicketThread {
  publicId: string;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  accountPublicId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  /** Shown so a trader and an operator can name the same request. */
  correlationId: string;
  messages: readonly SupportThreadMessage[];
  contestation: { publicId: string; status: string } | null;
}

export async function loadSupportTicketForUser(
  db: Db,
  params: { userId: string; publicId: string },
): Promise<SupportTicketThread | null> {
  const ticket = await db
    .selectFrom('app.support_tickets')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.support_tickets.account_id')
    .select([
      'app.support_tickets.id as id',
      'app.support_tickets.public_id as public_id',
      'app.support_tickets.category as category',
      'app.support_tickets.subject as subject',
      'app.support_tickets.status as status',
      'app.support_tickets.created_at as created_at',
      'app.support_tickets.updated_at as updated_at',
      'app.support_tickets.resolved_at as resolved_at',
      'app.support_tickets.closed_at as closed_at',
      'app.support_tickets.correlation_id as correlation_id',
      'app.trading_accounts.public_id as account_public_id',
    ])
    .where('app.support_tickets.public_id', '=', params.publicId)
    .where('app.support_tickets.user_id', '=', params.userId)
    .executeTakeFirst();
  if (!ticket) return null;

  const [messages, contestation] = await Promise.all([
    db
      .selectFrom('app.ticket_messages')
      .select(['actor_type', 'body', 'created_at'])
      .where('ticket_id', '=', ticket.id)
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute(),
    db
      .selectFrom('app.contestations')
      .select(['public_id', 'status'])
      .where('ticket_id', '=', ticket.id)
      .executeTakeFirst(),
  ]);

  return {
    publicId: ticket.public_id,
    category: ticket.category,
    subject: ticket.subject,
    status: ticket.status,
    accountPublicId: ticket.account_public_id,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    resolvedAt: ticket.resolved_at,
    closedAt: ticket.closed_at,
    correlationId: ticket.correlation_id,
    messages: messages.map((row) => ({
      actorType: row.actor_type,
      body: row.body,
      createdAt: row.created_at,
    })),
    contestation: contestation
      ? { publicId: contestation.public_id, status: contestation.status }
      : null,
  };
}

export interface CreateSupportTicketParams {
  userId: string;
  /** Must belong to `userId`; verified against the database, never trusted. */
  accountId: string | null;
  category: SupportTicketCategory;
  subject: string;
  body: string;
  correlationId: string;
  now?: Date;
}

export interface CreatedSupportTicket {
  id: string;
  publicId: string;
}

export class SupportOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupportOwnershipError';
  }
}

export class SupportTicketStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupportTicketStateError';
  }
}

/**
 * Confirms an account belongs to this user, inside the caller's transaction.
 *
 * The account arrives from a form, so it is a claim. Resolving it here rather
 * than in the page means a crafted request naming somebody else's account
 * fails at the write, not at the render — and the two cannot drift apart.
 */
async function assertAccountOwnership(
  trx: DbExecutor,
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await trx
    .selectFrom('app.trading_accounts')
    .select('id')
    .where('id', '=', accountId)
    .where('user_id', '=', userId)
    .executeTakeFirst();
  if (!account) {
    throw new SupportOwnershipError('This account does not belong to the requesting user.');
  }
}

/**
 * The ticket and its opening message are one write.
 *
 * A ticket row with no message is a request with no content — an operator
 * would open it and find a subject line. Creating both in one transaction
 * means that state cannot exist.
 */
export async function createSupportTicket(
  db: Db,
  params: CreateSupportTicketParams,
): Promise<CreatedSupportTicket> {
  const now = params.now ?? new Date();
  return db.transaction().execute(async (trx) => {
    if (params.accountId) {
      await assertAccountOwnership(trx, params.userId, params.accountId);
    }

    const ticket = await trx
      .insertInto('app.support_tickets')
      .values({
        user_id: params.userId,
        account_id: params.accountId,
        category: params.category,
        subject: params.subject.trim(),
        correlation_id: params.correlationId,
        created_at: now,
        updated_at: now,
      })
      .returning(['id', 'public_id'])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('app.ticket_messages')
      .values({
        ticket_id: ticket.id,
        actor_type: 'trader',
        actor_user_id: params.userId,
        body: params.body.trim(),
        correlation_id: params.correlationId,
        created_at: now,
      })
      .execute();

    return { id: ticket.id, publicId: ticket.public_id };
  });
}

export interface AppendTraderMessageParams {
  userId: string;
  publicId: string;
  body: string;
  correlationId: string;
  now?: Date;
}

/**
 * A trader reply, and the one status move it is allowed to cause.
 *
 * Replying to a resolved request reopens it — the alternative is telling
 * someone whose problem was not actually fixed to file a second ticket and
 * re-explain it. A closed request stays closed: closure is the operator's
 * statement that the matter is finished, and a thread that can always be
 * revived is a thread that is never finished.
 */
export async function appendTraderMessage(
  db: Db,
  params: AppendTraderMessageParams,
): Promise<{ status: SupportTicketStatus }> {
  const now = params.now ?? new Date();
  return db.transaction().execute(async (trx) => {
    const ticket = await trx
      .selectFrom('app.support_tickets')
      .select(['id', 'status', 'version'])
      .where('public_id', '=', params.publicId)
      .where('user_id', '=', params.userId)
      .forUpdate()
      .executeTakeFirst();
    if (!ticket) {
      throw new SupportOwnershipError('This request is not accessible.');
    }
    if (!traderCanReply(ticket.status)) {
      throw new SupportTicketStateError('This request is closed and no longer accepts replies.');
    }

    await trx
      .insertInto('app.ticket_messages')
      .values({
        ticket_id: ticket.id,
        actor_type: 'trader',
        actor_user_id: params.userId,
        body: params.body.trim(),
        correlation_id: params.correlationId,
        created_at: now,
      })
      .execute();

    // `under_review` is left alone: an operator is already working it, and a
    // trader adding context should not push it back into the untriaged pile.
    const nextStatus: SupportTicketStatus =
      ticket.status === 'under_review' ? 'under_review' : 'open';

    await trx
      .updateTable('app.support_tickets')
      .set({
        status: nextStatus,
        resolved_at: null,
        closed_at: null,
        updated_at: now,
        version: ticket.version + 1,
      })
      .where('id', '=', ticket.id)
      .execute();

    return { status: nextStatus };
  });
}
