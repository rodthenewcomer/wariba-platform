import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import {
  appendTraderMessage,
  createSupportTicket,
  listSupportTicketsForUser,
  loadSupportTicketForUser,
  SupportOwnershipError,
  SupportTicketStateError,
} from '../src/support-tickets';
import {
  openContestation,
  loadContestationForUser,
  DuplicateContestationError,
  ContestationTargetError,
} from '../src/contestations';
import { listContestableDecisions } from '../src/contestation-evidence';
import {
  appendStaffMessageInTransaction,
  assignSupportTicketInTransaction,
  loadControlSupportQueue,
  loadControlSupportTicket,
  setSupportTicketResolutionInTransaction,
} from '../src/control-support';
import {
  loadControlContestation,
  recordContestationDecisionInTransaction,
  setContestationReviewStateInTransaction,
  ContestationStateError,
} from '../src/control-contestations';

/**
 * Phase 3.2 — support and contestations against a real database.
 *
 * The contestation invariant is what most of this file exists to pin: opening,
 * reviewing and deciding a dispute must leave every financial record exactly
 * as it was. That is asserted by snapshotting the account row, the risk
 * violation and the state transition before the decision and comparing them
 * after — not by reading the code and concluding it looks safe.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('support tickets and contestations (real database)', () => {
  let db: Db;
  let userA: string;
  let userB: string;
  let staffUser: string;
  let accountA: string;
  let accountAPublicId: string;
  let accountB: string;
  let violationA: string;
  const cleanupUserIds: string[] = [];

  const createTestUser = async (label: string): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `support-${label}-${randomUUID()}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    const id = ((await res.json()) as { id: string }).id;
    cleanupUserIds.push(id);
    return id;
  };

  const createAccountFor = async (userId: string): Promise<{ id: string; publicId: string }> => {
    const productVersion = await db
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select([
        'app.product_versions.id',
        'app.products.nominal_balance',
        'app.products.nominal_currency',
      ])
      .where('app.products.code', '=', '10K')
      .executeTakeFirstOrThrow();
    const order = await db
      .insertInto('app.purchase_orders')
      .values({
        user_id: userId,
        product_version_id: productVersion.id,
        idempotency_key: randomUUID(),
        status: 'paid',
        total_amount: '39900.00',
        total_currency: 'XOF',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const account = await activateEvaluationAccount(db, {
      purchaseOrderId: order.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    return { id: account.id, publicId: account.publicId };
  };

  /** A recorded hard breach on `accountId`, derived from its own policy. */
  const recordBreach = async (accountId: string): Promise<string> => {
    const account = await db
      .selectFrom('app.trading_accounts')
      .select(['policy_version_id', 'nominal_balance'])
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    const transition = await db
      .insertInto('app.account_state_transitions')
      .values({
        account_id: accountId,
        from_status: 'active',
        to_status: 'breached',
        reason: 'maximum_loss_breached',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const violation = await db
      .insertInto('app.risk_violations')
      .values({
        account_id: accountId,
        rule_code: 'RISK_MAXIMUM_LOSS_BREACH',
        severity: 'critical',
        consequence: 'hard_breach',
        policy_version_id: account.policy_version_id,
        threshold_value: '9000.00',
        observed_value: '8999.00',
        account_state_transition_id: transition.id,
        trigger_event_type: 'manual_review',
        trigger_event_id: randomUUID(),
        price_snapshot: JSON.stringify({}),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .updateTable('app.trading_accounts')
      .set({ status: 'breached' })
      .where('id', '=', accountId)
      .execute();
    return violation.id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userA = await createTestUser('a');
    userB = await createTestUser('b');
    staffUser = await createTestUser('staff');
    await db
      .insertInto('app.staff_members')
      .values({ user_id: staffUser, role: 'support' })
      .execute();
    const a = await createAccountFor(userA);
    accountA = a.id;
    accountAPublicId = a.publicId;
    accountB = (await createAccountFor(userB)).id;
    violationA = await recordBreach(accountA);
  });

  afterAll(async () => {
    for (const userId of cleanupUserIds) {
      await db.deleteFrom('app.contestations').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.support_tickets').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.staff_members').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.staff_action_rate_limits').where('actor_id', '=', userId).execute();
      const accounts = await db
        .selectFrom('app.trading_accounts')
        .select('id')
        .where('user_id', '=', userId)
        .execute();
      for (const account of accounts) {
        await db.deleteFrom('app.risk_violations').where('account_id', '=', account.id).execute();
        await db
          .deleteFrom('app.account_state_transitions')
          .where('account_id', '=', account.id)
          .execute();
        await db
          .deleteFrom('app.account_daily_snapshots')
          .where('account_id', '=', account.id)
          .execute();
        await db
          .deleteFrom('app.trading_ledger_entries')
          .where('account_id', '=', account.id)
          .execute();
        await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', account.id).execute();
      }
      await db.deleteFrom('app.trading_accounts').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.purchase_orders').where('user_id', '=', userId).execute();
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
    await db.destroy();
  });

  describe('a trader and their own requests', () => {
    it('creates a ticket with its opening message and a readable reference', async () => {
      const created = await createSupportTicket(db, {
        userId: userA,
        accountId: accountA,
        category: 'trading',
        subject: 'Ordre refusé sur XAUUSD',
        body: 'Mon ordre a été refusé alors que la marge semblait suffisante.',
        correlationId: randomUUID(),
      });

      expect(created.publicId).toMatch(/^WRB-\d{5}$/);

      const thread = await loadSupportTicketForUser(db, {
        userId: userA,
        publicId: created.publicId,
      });
      expect(thread?.status).toBe('open');
      expect(thread?.accountPublicId).toBe(accountAPublicId);
      expect(thread?.messages).toHaveLength(1);
      expect(thread?.messages[0]?.actorType).toBe('trader');
    });

    it('refuses an account that belongs to somebody else', async () => {
      await expect(
        createSupportTicket(db, {
          userId: userA,
          accountId: accountB,
          category: 'account',
          subject: 'Compte de quelqu’un d’autre',
          body: 'Cette demande nomme un compte qui ne m’appartient pas.',
          correlationId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(SupportOwnershipError);
    });

    it('returns nothing for another trader’s reference', async () => {
      const created = await createSupportTicket(db, {
        userId: userA,
        accountId: null,
        category: 'general',
        subject: 'Question de A',
        body: 'Une question qui n’appartient qu’à A.',
        correlationId: randomUUID(),
      });

      // Not "forbidden" — indistinguishable from a reference that was never
      // issued. B learns nothing about whether WRB-xxxxx exists.
      await expect(
        loadSupportTicketForUser(db, { userId: userB, publicId: created.publicId }),
      ).resolves.toBeNull();

      const listForB = await listSupportTicketsForUser(db, { userId: userB });
      expect(listForB.map((row) => row.publicId)).not.toContain(created.publicId);
    });

    it('refuses to append a message to another trader’s thread', async () => {
      const created = await createSupportTicket(db, {
        userId: userA,
        accountId: null,
        category: 'general',
        subject: 'Fil de A',
        body: 'Seul A devrait pouvoir écrire ici.',
        correlationId: randomUUID(),
      });

      await expect(
        appendTraderMessage(db, {
          userId: userB,
          publicId: created.publicId,
          body: 'Message injecté par B.',
          correlationId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(SupportOwnershipError);

      const thread = await loadSupportTicketForUser(db, {
        userId: userA,
        publicId: created.publicId,
      });
      expect(thread?.messages).toHaveLength(1);
    });

    it('never edits an existing message — the conversation only grows', async () => {
      const created = await createSupportTicket(db, {
        userId: userA,
        accountId: null,
        category: 'general',
        subject: 'Fil append-only',
        body: 'Premier message.',
        correlationId: randomUUID(),
      });
      await appendTraderMessage(db, {
        userId: userA,
        publicId: created.publicId,
        body: 'Deuxième message.',
        correlationId: randomUUID(),
      });

      const thread = await loadSupportTicketForUser(db, {
        userId: userA,
        publicId: created.publicId,
      });
      expect(thread?.messages.map((message) => message.body)).toEqual([
        'Premier message.',
        'Deuxième message.',
      ]);

      // The database, not a convention: the trigger refuses the UPDATE even on
      // the privileged service connection every command here uses.
      await expect(
        db
          .updateTable('app.ticket_messages')
          .set({ body: 'réécrit' })
          .where('ticket_id', '=', created.id)
          .execute(),
      ).rejects.toThrow(/append-only/);
    });
  });

  describe('an operator working the queue', () => {
    it('assigns, replies, requests information and resolves', async () => {
      const created = await createSupportTicket(db, {
        userId: userA,
        accountId: accountA,
        category: 'risk',
        subject: 'Demande traitée de bout en bout',
        body: 'Je ne comprends pas ce blocage.',
        correlationId: randomUUID(),
      });

      const assigned = await db.transaction().execute((trx) =>
        assignSupportTicketInTransaction(trx, {
          publicId: created.publicId,
          assignToStaffId: staffUser,
          now: new Date(),
        }),
      );
      expect(assigned.before.status).toBe('open');
      expect(assigned.after.status).toBe('under_review');

      await db.transaction().execute((trx) =>
        appendStaffMessageInTransaction(trx, {
          publicId: created.publicId,
          staffUserId: staffUser,
          body: 'Pouvez-vous préciser l’heure exacte ?',
          requestsInformation: true,
          correlationId: randomUUID(),
          now: new Date(),
        }),
      );

      let thread = await loadSupportTicketForUser(db, {
        userId: userA,
        publicId: created.publicId,
      });
      expect(thread?.status).toBe('waiting_for_user');
      expect(thread?.messages.at(-1)?.actorType).toBe('staff');

      // The trader answering hands the ticket back to WARIBA.
      await appendTraderMessage(db, {
        userId: userA,
        publicId: created.publicId,
        body: 'C’était à 14h32 UTC.',
        correlationId: randomUUID(),
      });
      thread = await loadSupportTicketForUser(db, { userId: userA, publicId: created.publicId });
      expect(thread?.status).toBe('open');

      await db.transaction().execute((trx) =>
        setSupportTicketResolutionInTransaction(trx, {
          publicId: created.publicId,
          staffUserId: staffUser,
          resolution: 'resolved',
          reason: 'Blocage expliqué au trader.',
          correlationId: randomUUID(),
          now: new Date(),
        }),
      );

      thread = await loadSupportTicketForUser(db, { userId: userA, publicId: created.publicId });
      expect(thread?.status).toBe('resolved');
      expect(thread?.resolvedAt).not.toBeNull();
      // A system message explains the state change rather than leaving the
      // trader to infer it from a status word.
      expect(thread?.messages.at(-1)?.actorType).toBe('system');
    });

    it('shows the operator the trader, the account and the whole thread', async () => {
      const created = await createSupportTicket(db, {
        userId: userA,
        accountId: accountA,
        category: 'breach',
        subject: 'Vue opérateur',
        body: 'Le détail doit être lisible côté Control.',
        correlationId: randomUUID(),
      });

      const detail = await loadControlSupportTicket(db, { publicId: created.publicId });
      expect(detail?.traderEmail).toContain('@wariba-test.invalid');
      expect(detail?.account?.accountPublicId).toBe(accountAPublicId);
      expect(detail?.messages).toHaveLength(1);

      const queue = await loadControlSupportQueue(db, { filters: { category: 'breach' }, page: 1 });
      expect(queue.items.map((row) => row.publicId)).toContain(created.publicId);
    });
  });

  describe('contestations', () => {
    it('lists only decisions that actually restricted the account', async () => {
      const decisions = await listContestableDecisions(db, { userId: userA, accountId: accountA });
      expect(decisions.map((decision) => decision.riskViolationId)).toContain(violationA);
      expect(decisions.every((decision) => decision.consequence !== 'none')).toBe(true);

      // Scoped through the account's owner, so B sees nothing on A's account.
      const forB = await listContestableDecisions(db, { userId: userB, accountId: accountA });
      expect(forB).toHaveLength(0);
    });

    it('opens a contestation that references the evidence rather than copying it', async () => {
      const opened = await openContestation(db, {
        userId: userA,
        accountId: accountA,
        targetType: 'account_breach',
        targetId: violationA,
        reasonCategory: 'rule_misapplied',
        traderStatement: 'Le plancher retenu ne correspond pas à ma meilleure balance de clôture.',
        correlationId: randomUUID(),
      });

      expect(opened.contestationPublicId).toMatch(/^CTS-\d{5}$/);

      const detail = await loadContestationForUser(db, {
        userId: userA,
        publicId: opened.contestationPublicId,
      });
      expect(detail?.status).toBe('open');
      // The figures come from app.risk_violations at read time, at the
      // column's own scale — nothing is re-rounded on the way out.
      expect(detail?.evidence?.violation.thresholdValue).toBe('9000.0000');
      expect(detail?.evidence?.violation.observedValue).toBe('8999.0000');
      expect(detail?.evidence?.policy.semanticVersion).toBeTruthy();
      expect(detail?.evidence?.transition?.toStatus).toBe('breached');

      const row = await db
        .selectFrom('app.contestations')
        .select('evidence_ref')
        .where('public_id', '=', opened.contestationPublicId)
        .executeTakeFirstOrThrow();
      const ref = row.evidence_ref as Record<string, unknown>;
      expect(ref.riskViolationId).toBe(violationA);
      // Identifiers only. Asserted as an exact key set rather than as "does
      // not contain 9000" — a substring check would pass for a reference that
      // had quietly grown a `thresholdValue` field with a different number in
      // it, which is precisely the drift this guards against.
      expect(Object.keys(ref).sort()).toEqual([
        'accountDailySnapshotId',
        'accountStateTransitionId',
        'correlationId',
        'policyVersionId',
        'riskViolationId',
        'triggerEventId',
        'triggerEventType',
      ]);
    });

    it('refuses a second live contestation for the same decision', async () => {
      await expect(
        openContestation(db, {
          userId: userA,
          accountId: accountA,
          targetType: 'account_breach',
          targetId: violationA,
          reasonCategory: 'evidence_incomplete',
          traderStatement: 'Je tente d’ouvrir une seconde contestation sur la même décision.',
          correlationId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(DuplicateContestationError);
    });

    it('refuses a decision that is not on the trader’s own account', async () => {
      await expect(
        openContestation(db, {
          userId: userB,
          accountId: accountB,
          targetType: 'account_breach',
          targetId: violationA,
          reasonCategory: 'other',
          traderStatement: 'Je conteste une décision qui appartient à un autre compte.',
          correlationId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(ContestationTargetError);
    });

    it('refuses `overturned` — no corrective command exists in this build', async () => {
      const contestation = await db
        .selectFrom('app.contestations')
        .select('public_id')
        .where('target_id', '=', violationA)
        .executeTakeFirstOrThrow();

      await expect(
        db.transaction().execute((trx) =>
          recordContestationDecisionInTransaction(trx, {
            publicId: contestation.public_id,
            reviewerUserId: staffUser,
            decision: 'overturned',
            reason: 'Tentative de réversion.',
            correlationId: randomUUID(),
            now: new Date(),
          }),
        ),
      ).rejects.toBeInstanceOf(ContestationStateError);
    });

    /**
     * The invariant the whole slice turns on.
     *
     * Snapshots the account row, the risk violation and the state transition,
     * records a decision, then compares. Anything that mutated historical
     * financial truth fails here.
     */
    it('records a decision without touching any historical financial record', async () => {
      const contestation = await db
        .selectFrom('app.contestations')
        .select('public_id')
        .where('target_id', '=', violationA)
        .executeTakeFirstOrThrow();

      const before = {
        account: await db
          .selectFrom('app.trading_accounts')
          .selectAll()
          .where('id', '=', accountA)
          .executeTakeFirstOrThrow(),
        violation: await db
          .selectFrom('app.risk_violations')
          .selectAll()
          .where('id', '=', violationA)
          .executeTakeFirstOrThrow(),
        transitions: await db
          .selectFrom('app.account_state_transitions')
          .selectAll()
          .where('account_id', '=', accountA)
          .orderBy('occurred_at', 'asc')
          .execute(),
        ledger: await db
          .selectFrom('app.trading_ledger_entries')
          .selectAll()
          .where('account_id', '=', accountA)
          .execute(),
      };

      await db.transaction().execute((trx) =>
        setContestationReviewStateInTransaction(trx, {
          publicId: contestation.public_id,
          reviewerUserId: staffUser,
          nextStatus: 'under_review',
          now: new Date(),
        }),
      );
      await db.transaction().execute((trx) =>
        recordContestationDecisionInTransaction(trx, {
          publicId: contestation.public_id,
          reviewerUserId: staffUser,
          decision: 'upheld',
          reason: 'Le plancher appliqué correspond à la policy publiée.',
          correlationId: randomUUID(),
          now: new Date(),
        }),
      );

      const after = {
        account: await db
          .selectFrom('app.trading_accounts')
          .selectAll()
          .where('id', '=', accountA)
          .executeTakeFirstOrThrow(),
        violation: await db
          .selectFrom('app.risk_violations')
          .selectAll()
          .where('id', '=', violationA)
          .executeTakeFirstOrThrow(),
        transitions: await db
          .selectFrom('app.account_state_transitions')
          .selectAll()
          .where('account_id', '=', accountA)
          .orderBy('occurred_at', 'asc')
          .execute(),
        ledger: await db
          .selectFrom('app.trading_ledger_entries')
          .selectAll()
          .where('account_id', '=', accountA)
          .execute(),
      };

      expect(after.account).toEqual(before.account);
      expect(after.violation).toEqual(before.violation);
      expect(after.transitions).toEqual(before.transitions);
      expect(after.ledger).toEqual(before.ledger);
      expect(after.account.status).toBe('breached');

      const decided = await loadControlContestation(db, { publicId: contestation.public_id });
      expect(decided?.status).toBe('upheld');
      expect(decided?.decision).toBe('upheld');
      expect(decided?.decisionReason).toBe('Le plancher appliqué correspond à la policy publiée.');
      // And the trader is told, in their own thread.
      const traderView = await loadContestationForUser(db, {
        userId: userA,
        publicId: contestation.public_id,
      });
      expect(traderView?.decision).toBe('upheld');
    });

    it('refuses a second decision on an already decided contestation', async () => {
      const contestation = await db
        .selectFrom('app.contestations')
        .select('public_id')
        .where('target_id', '=', violationA)
        .executeTakeFirstOrThrow();

      await expect(
        db.transaction().execute((trx) =>
          recordContestationDecisionInTransaction(trx, {
            publicId: contestation.public_id,
            reviewerUserId: staffUser,
            decision: 'upheld',
            reason: 'Seconde décision.',
            correlationId: randomUUID(),
            now: new Date(),
          }),
        ),
      ).rejects.toBeInstanceOf(ContestationStateError);
    });

    it('keeps a request open while its contestation is still live', async () => {
      const secondViolation = await recordBreach(accountB);
      const opened = await openContestation(db, {
        userId: userB,
        accountId: accountB,
        targetType: 'account_breach',
        targetId: secondViolation,
        reasonCategory: 'market_data_disputed',
        traderStatement: 'Les prix retenus ne correspondent pas à ce que j’ai vu à l’écran.',
        correlationId: randomUUID(),
      });

      await expect(
        db.transaction().execute((trx) =>
          setSupportTicketResolutionInTransaction(trx, {
            publicId: opened.ticketPublicId,
            staffUserId: staffUser,
            resolution: 'closed',
            reason: 'Tentative de clôture prématurée.',
            correlationId: randomUUID(),
            now: new Date(),
          }),
        ),
      ).rejects.toBeInstanceOf(SupportTicketStateError);
    });
  });
});
