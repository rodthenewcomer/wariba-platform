import type { Db, DbExecutor } from './client';
import { SupportTicketStateError } from './support-tickets';
import type {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  TicketMessageActorType,
} from './schema';

/**
 * Phase 3.2 — WARIBA Control's support queue.
 *
 * Read models and the mutation primitives, kept apart from the trader module
 * so that widening what an operator may do cannot widen what a trader may
 * read. Orchestration, RBAC and the audit write live in @wariba/application's
 * control-support-actions.ts, following the same shape Control's payout and
 * integrity actions already use.
 *
 * Filtering, counting and paging all happen in PostgreSQL. An operator's
 * browser never receives the whole queue, which matters more here than
 * elsewhere: a support queue is the one Control surface that necessarily
 * touches every trader.
 */

export interface ControlSupportFilters {
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
  /** 'assigned' / 'unassigned' / a specific staff user id. */
  assignment?: 'assigned' | 'unassigned';
  assignedStaffId?: string;
  /** Only tickets older than this many hours, for triage by age. */
  minAgeHours?: number;
  /** Public reference or account reference, matched case-insensitively. */
  query?: string;
}

export interface ControlSupportQueueRow {
  publicId: string;
  /** Masked at the application layer before it reaches a list view. */
  traderEmail: string | null;
  category: SupportTicketCategory;
  accountPublicId: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: Date;
  updatedAt: Date;
  assignedStaffEmail: string | null;
  hasContestation: boolean;
}

export interface ControlSupportQueuePage {
  items: readonly ControlSupportQueueRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;

export async function loadControlSupportQueue(
  db: Db,
  params: { filters: ControlSupportFilters; page: number; now?: Date },
): Promise<ControlSupportQueuePage> {
  const { filters } = params;
  const page = Math.max(1, params.page);
  const now = params.now ?? new Date();

  const base = db
    .selectFrom('app.support_tickets')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.support_tickets.account_id')
    .$if(filters.status !== undefined, (qb) =>
      qb.where('app.support_tickets.status', '=', filters.status as SupportTicketStatus),
    )
    .$if(filters.category !== undefined, (qb) =>
      qb.where('app.support_tickets.category', '=', filters.category as SupportTicketCategory),
    )
    .$if(filters.assignment === 'unassigned', (qb) =>
      qb.where('app.support_tickets.assigned_staff_id', 'is', null),
    )
    .$if(filters.assignment === 'assigned', (qb) =>
      qb.where('app.support_tickets.assigned_staff_id', 'is not', null),
    )
    .$if(filters.assignedStaffId !== undefined, (qb) =>
      qb.where('app.support_tickets.assigned_staff_id', '=', filters.assignedStaffId as string),
    )
    .$if(filters.minAgeHours !== undefined, (qb) =>
      qb.where(
        'app.support_tickets.created_at',
        '<=',
        new Date(now.getTime() - (filters.minAgeHours as number) * 3_600_000),
      ),
    )
    .$if(filters.query !== undefined, (qb) => {
      const pattern = `%${(filters.query as string).replace(/[%_]/g, (m) => `\\${m}`)}%`;
      return qb.where((eb) =>
        eb.or([
          eb('app.support_tickets.public_id', 'ilike', pattern),
          eb('app.trading_accounts.public_id', 'ilike', pattern),
        ]),
      );
    });

  const [rows, count] = await Promise.all([
    base
      .leftJoin('auth.users as trader', 'trader.id', 'app.support_tickets.user_id')
      .leftJoin('auth.users as operator', 'operator.id', 'app.support_tickets.assigned_staff_id')
      .leftJoin('app.contestations', 'app.contestations.ticket_id', 'app.support_tickets.id')
      .select([
        'app.support_tickets.public_id as public_id',
        'app.support_tickets.category as category',
        'app.support_tickets.status as status',
        'app.support_tickets.priority as priority',
        'app.support_tickets.created_at as created_at',
        'app.support_tickets.updated_at as updated_at',
        'app.trading_accounts.public_id as account_public_id',
        'trader.email as trader_email',
        'operator.email as operator_email',
        'app.contestations.public_id as contestation_public_id',
      ])
      // Oldest first: a support queue sorted newest-first is a queue where the
      // person who has waited longest is on the last page.
      .orderBy('app.support_tickets.created_at', 'asc')
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
    base.select((eb) => eb.fn.countAll<string>().as('total')).executeTakeFirst(),
  ]);

  return {
    items: rows.map((row) => ({
      publicId: row.public_id,
      traderEmail: row.trader_email,
      category: row.category,
      accountPublicId: row.account_public_id,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assignedStaffEmail: row.operator_email,
      hasContestation: row.contestation_public_id !== null,
    })),
    total: Number(count?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

export interface ControlSupportTicketDetail {
  id: string;
  publicId: string;
  traderUserId: string;
  traderEmail: string | null;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignedStaffId: string | null;
  assignedStaffEmail: string | null;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  account: {
    accountId: string;
    accountPublicId: string;
    programType: string;
    status: string;
    nominalBalance: string;
    currency: string;
  } | null;
  messages: readonly {
    actorType: TicketMessageActorType;
    /** Present for staff messages only — operators may see each other. */
    actorEmail: string | null;
    body: string;
    createdAt: Date;
  }[];
  contestation: {
    publicId: string;
    status: string;
    targetType: string;
  } | null;
}

export async function loadControlSupportTicket(
  db: Db,
  params: { publicId: string },
): Promise<ControlSupportTicketDetail | null> {
  const ticket = await db
    .selectFrom('app.support_tickets')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.support_tickets.account_id')
    .leftJoin('auth.users as trader', 'trader.id', 'app.support_tickets.user_id')
    .leftJoin('auth.users as operator', 'operator.id', 'app.support_tickets.assigned_staff_id')
    .select([
      'app.support_tickets.id as id',
      'app.support_tickets.public_id as public_id',
      'app.support_tickets.user_id as user_id',
      'app.support_tickets.category as category',
      'app.support_tickets.subject as subject',
      'app.support_tickets.status as status',
      'app.support_tickets.priority as priority',
      'app.support_tickets.assigned_staff_id as assigned_staff_id',
      'app.support_tickets.correlation_id as correlation_id',
      'app.support_tickets.created_at as created_at',
      'app.support_tickets.updated_at as updated_at',
      'app.support_tickets.resolved_at as resolved_at',
      'app.support_tickets.closed_at as closed_at',
      'app.trading_accounts.id as account_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.trading_accounts.program_type as program_type',
      'app.trading_accounts.status as account_status',
      'app.trading_accounts.nominal_balance as nominal_balance',
      'app.trading_accounts.currency as currency',
      'trader.email as trader_email',
      'operator.email as operator_email',
    ])
    .where('app.support_tickets.public_id', '=', params.publicId)
    .executeTakeFirst();
  if (!ticket) return null;

  const [messages, contestation] = await Promise.all([
    db
      .selectFrom('app.ticket_messages')
      .leftJoin('auth.users as author', 'author.id', 'app.ticket_messages.actor_staff_id')
      .select([
        'app.ticket_messages.actor_type as actor_type',
        'app.ticket_messages.body as body',
        'app.ticket_messages.created_at as created_at',
        'author.email as author_email',
      ])
      .where('app.ticket_messages.ticket_id', '=', ticket.id)
      .orderBy('app.ticket_messages.created_at', 'asc')
      .orderBy('app.ticket_messages.id', 'asc')
      .execute(),
    db
      .selectFrom('app.contestations')
      .select(['public_id', 'status', 'target_type'])
      .where('ticket_id', '=', ticket.id)
      .executeTakeFirst(),
  ]);

  return {
    id: ticket.id,
    publicId: ticket.public_id,
    traderUserId: ticket.user_id,
    traderEmail: ticket.trader_email,
    category: ticket.category,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    assignedStaffId: ticket.assigned_staff_id,
    assignedStaffEmail: ticket.operator_email,
    correlationId: ticket.correlation_id,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    resolvedAt: ticket.resolved_at,
    closedAt: ticket.closed_at,
    account: ticket.account_id
      ? {
          accountId: ticket.account_id,
          accountPublicId: ticket.account_public_id as string,
          programType: ticket.program_type as string,
          status: ticket.account_status as string,
          nominalBalance: ticket.nominal_balance as string,
          currency: ticket.currency as string,
        }
      : null,
    messages: messages.map((row) => ({
      actorType: row.actor_type,
      actorEmail: row.author_email,
      body: row.body,
      createdAt: row.created_at,
    })),
    contestation: contestation
      ? {
          publicId: contestation.public_id,
          status: contestation.status,
          targetType: contestation.target_type,
        }
      : null,
  };
}

export interface TicketBeforeAfter {
  ticketId: string;
  before: { status: SupportTicketStatus; assignedStaffId: string | null };
  after: { status: SupportTicketStatus; assignedStaffId: string | null };
}

/** Locks and returns the ticket, or refuses in the caller's transaction. */
async function lockTicket(trx: DbExecutor, publicId: string) {
  const ticket = await trx
    .selectFrom('app.support_tickets')
    .select(['id', 'status', 'assigned_staff_id'])
    .where('public_id', '=', publicId)
    .forUpdate()
    .executeTakeFirst();
  if (!ticket) throw new SupportTicketStateError('This request does not exist.');
  return ticket;
}

/** A finished ticket accepts no operator action but reopening is not one of them. */
function assertActionable(status: SupportTicketStatus): void {
  if (status === 'closed') {
    throw new SupportTicketStateError('This request is closed.');
  }
}

export async function assignSupportTicketInTransaction(
  trx: DbExecutor,
  params: { publicId: string; assignToStaffId: string; now: Date },
): Promise<TicketBeforeAfter> {
  const ticket = await lockTicket(trx, params.publicId);
  assertActionable(ticket.status);

  // Picking a ticket up is also a triage statement: it moves out of the
  // untriaged pile so two operators do not answer the same person twice.
  const nextStatus: SupportTicketStatus = ticket.status === 'open' ? 'under_review' : ticket.status;

  await trx
    .updateTable('app.support_tickets')
    .set({
      assigned_staff_id: params.assignToStaffId,
      status: nextStatus,
      updated_at: params.now,
    })
    .where('id', '=', ticket.id)
    .execute();

  return {
    ticketId: ticket.id,
    before: { status: ticket.status, assignedStaffId: ticket.assigned_staff_id },
    after: { status: nextStatus, assignedStaffId: params.assignToStaffId },
  };
}

export async function appendStaffMessageInTransaction(
  trx: DbExecutor,
  params: {
    publicId: string;
    staffUserId: string;
    body: string;
    /** `true` when the operator is asking the trader for something. */
    requestsInformation: boolean;
    correlationId: string;
    now: Date;
  },
): Promise<TicketBeforeAfter> {
  const ticket = await lockTicket(trx, params.publicId);
  assertActionable(ticket.status);

  await trx
    .insertInto('app.ticket_messages')
    .values({
      ticket_id: ticket.id,
      actor_type: 'staff',
      actor_staff_id: params.staffUserId,
      body: params.body.trim(),
      correlation_id: params.correlationId,
      created_at: params.now,
    })
    .execute();

  const nextStatus: SupportTicketStatus = params.requestsInformation
    ? 'waiting_for_user'
    : 'under_review';

  await trx
    .updateTable('app.support_tickets')
    .set({
      status: nextStatus,
      // Answering a resolved ticket makes it live again, and the constraint on
      // this table requires the timestamps to agree with the status.
      resolved_at: null,
      assigned_staff_id: ticket.assigned_staff_id ?? params.staffUserId,
      updated_at: params.now,
    })
    .where('id', '=', ticket.id)
    .execute();

  return {
    ticketId: ticket.id,
    before: { status: ticket.status, assignedStaffId: ticket.assigned_staff_id },
    after: {
      status: nextStatus,
      assignedStaffId: ticket.assigned_staff_id ?? params.staffUserId,
    },
  };
}

export async function setSupportTicketResolutionInTransaction(
  trx: DbExecutor,
  params: {
    publicId: string;
    staffUserId: string;
    resolution: 'resolved' | 'closed';
    reason: string;
    correlationId: string;
    now: Date;
  },
): Promise<TicketBeforeAfter> {
  const ticket = await lockTicket(trx, params.publicId);
  if (ticket.status === 'closed') {
    throw new SupportTicketStateError('This request is already closed.');
  }

  /*
   * A contestation still under review keeps its ticket open.
   *
   * Closing the conversation while the dispute behind it is undecided leaves
   * the trader with a resolved request and an unanswered contestation, and no
   * surface that tells them so. The dispute has to be decided first.
   */
  const liveContestation = await trx
    .selectFrom('app.contestations')
    .select('public_id')
    .where('ticket_id', '=', ticket.id)
    .where('status', 'in', ['open', 'under_review', 'needs_information'])
    .executeTakeFirst();
  if (liveContestation) {
    throw new SupportTicketStateError(
      `Contestation ${liveContestation.public_id} is still open on this request.`,
    );
  }

  await trx
    .updateTable('app.support_tickets')
    .set(
      params.resolution === 'resolved'
        ? { status: 'resolved', resolved_at: params.now, closed_at: null, updated_at: params.now }
        : { status: 'closed', closed_at: params.now, updated_at: params.now },
    )
    .where('id', '=', ticket.id)
    .execute();

  await trx
    .insertInto('app.ticket_messages')
    .values({
      ticket_id: ticket.id,
      actor_type: 'system',
      body:
        params.resolution === 'resolved'
          ? `Demande marquée comme résolue. Motif : ${params.reason.trim()}`
          : `Demande clôturée. Motif : ${params.reason.trim()}`,
      correlation_id: params.correlationId,
      created_at: params.now,
    })
    .execute();

  return {
    ticketId: ticket.id,
    before: { status: ticket.status, assignedStaffId: ticket.assigned_staff_id },
    after: { status: params.resolution, assignedStaffId: ticket.assigned_staff_id },
  };
}
