import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { createSupportTicket } from '../src/support-tickets';
import { openContestation } from '../src/contestations';

/**
 * Phase 3.2 — row-level security for support and contestations.
 *
 * The UI already scopes every read by `user_id`, which is necessary and not
 * sufficient: these three tables carry a trader's own words about their money,
 * and the guarantee that trader B cannot read trader A's thread has to hold at
 * the database, independently of any query the application happens to write.
 *
 * Asserted as *outcomes* rather than as mechanism, the same way
 * payouts-rls.integration.test.ts is: A cannot see B's rows, anon is refused
 * outright, and nobody can write one from a browser session. Replacing the
 * policies later with a different shape keeps these tests meaningful.
 *
 * Same SET LOCAL ROLE + request.jwt.claims technique as the other RLS suites —
 * see trading-rls.integration.test.ts for why.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

async function asRole<T>(
  db: Db,
  role: 'authenticated' | 'anon',
  userId: string | null,
  fn: (trx: Db) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('role', ${role}, true)`.execute(trx);
    if (userId) {
      const claims = JSON.stringify({ sub: userId, role });
      await sql`select set_config('request.jwt.claims', ${claims}, true)`.execute(trx);
    }
    return fn(trx as unknown as Db);
  });
}

describeIfDb('support and contestations — row level security (real database)', () => {
  let db: Db;
  let userA: string;
  let userB: string;
  let ticketA: { id: string; publicId: string };
  let contestationA: string;
  let accountA: string;
  let identityReviewPublicId: string;
  const cleanupUserIds: string[] = [];

  const createTestUser = async (): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `support-rls-${randomUUID()}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    const id = ((await res.json()) as { id: string }).id;
    cleanupUserIds.push(id);
    return id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userA = await createTestUser();
    userB = await createTestUser();

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
        user_id: userA,
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
      userId: userA,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    accountA = account.id;
    identityReviewPublicId = (
      await db
        .insertInto('app.identity_review_cases')
        .values({
          user_id: userA,
          account_id: accountA,
          reason: 'first_payout',
          correlation_id: randomUUID(),
        })
        .returning('public_id')
        .executeTakeFirstOrThrow()
    ).public_id;

    const transition = await db
      .insertInto('app.account_state_transitions')
      .values({
        account_id: accountA,
        from_status: 'active',
        to_status: 'breached',
        reason: 'maximum_loss_breach',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const accountRow = await db
      .selectFrom('app.trading_accounts')
      .select('policy_version_id')
      .where('id', '=', accountA)
      .executeTakeFirstOrThrow();
    const violation = await db
      .insertInto('app.risk_violations')
      .values({
        account_id: accountA,
        rule_code: 'RISK_MAXIMUM_LOSS_BREACH',
        severity: 'critical',
        consequence: 'hard_breach',
        policy_version_id: accountRow.policy_version_id,
        threshold_value: '9000.00',
        observed_value: '8998.00',
        account_state_transition_id: transition.id,
        trigger_event_type: 'manual_review',
        trigger_event_id: randomUUID(),
        price_snapshot: JSON.stringify({}),
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    ticketA = await createSupportTicket(db, {
      userId: userA,
      accountId: accountA,
      category: 'breach',
      subject: 'Contenu privé de A',
      body: 'Ce message ne doit jamais être lisible par un autre trader.',
      correlationId: randomUUID(),
    });

    const opened = await openContestation(db, {
      userId: userA,
      accountId: accountA,
      targetType: 'account_breach',
      targetId: violation.id,
      reasonCategory: 'rule_misapplied',
      traderStatement: 'La décision me paraît fondée sur un plancher incorrect.',
      correlationId: randomUUID(),
    });
    contestationA = opened.contestationPublicId;
  });

  afterAll(async () => {
    for (const userId of cleanupUserIds) {
      await db.deleteFrom('app.contestations').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.support_tickets').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.identity_review_cases').where('user_id', '=', userId).execute();
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

  it('lets a trader read their own ticket', async () => {
    const rows = await asRole(db, 'authenticated', userA, (trx) =>
      trx.selectFrom('app.support_tickets').select('public_id').execute(),
    );
    expect(rows.map((row) => row.public_id)).toContain(ticketA.publicId);
  });

  it('hides another trader’s ticket entirely', async () => {
    const rows = await asRole(db, 'authenticated', userB, (trx) =>
      trx
        .selectFrom('app.support_tickets')
        .select('public_id')
        .where('public_id', '=', ticketA.publicId)
        .execute(),
    );
    expect(rows).toHaveLength(0);
  });

  it('hides another trader’s messages even when the ticket id is known', async () => {
    const rows = await asRole(db, 'authenticated', userB, (trx) =>
      trx
        .selectFrom('app.ticket_messages')
        .select('body')
        .where('ticket_id', '=', ticketA.id)
        .execute(),
    );
    expect(rows).toHaveLength(0);

    const own = await asRole(db, 'authenticated', userA, (trx) =>
      trx
        .selectFrom('app.ticket_messages')
        .select('body')
        .where('ticket_id', '=', ticketA.id)
        .execute(),
    );
    expect(own.length).toBeGreaterThan(0);
  });

  it('hides another trader’s contestation', async () => {
    const rows = await asRole(db, 'authenticated', userB, (trx) =>
      trx
        .selectFrom('app.contestations')
        .select('public_id')
        .where('public_id', '=', contestationA)
        .execute(),
    );
    expect(rows).toHaveLength(0);

    const own = await asRole(db, 'authenticated', userA, (trx) =>
      trx
        .selectFrom('app.contestations')
        .select(['public_id', 'trader_statement'])
        .where('public_id', '=', contestationA)
        .execute(),
    );
    expect(own).toHaveLength(1);
  });

  it('keeps identity workflow metadata behind the BFF for every browser role', async () => {
    for (const userId of [userA, userB]) {
      await expect(
        asRole(db, 'authenticated', userId, (trx) =>
          trx
            .selectFrom('app.identity_review_cases')
            .select('public_id')
            .where('public_id', '=', identityReviewPublicId)
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('keeps post-result operator reviews unreachable from trader sessions', async () => {
    for (const userId of [userA, userB]) {
      await expect(
        asRole(db, 'authenticated', userId, (trx) =>
          trx.selectFrom('app.pass_review_operator_states').selectAll().execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('gives the anon role no grant on any support table', async () => {
    // Stronger than "returns no rows": there is no grant at all, so the read
    // is refused before a policy is ever consulted. Asserted as the refusal
    // rather than as an empty result, so a future migration that adds a
    // well-meaning `grant select … to anon` fails here instead of silently
    // exposing every trader's support thread to a signed-out request.
    for (const table of [
      'app.support_tickets',
      'app.ticket_messages',
      'app.contestations',
      'app.identity_review_cases',
      'app.pass_review_operator_states',
    ] as const) {
      await expect(
        asRole(db, 'anon', null, (trx) => trx.selectFrom(table).selectAll().execute()),
        `${table} must be unreachable for anon`,
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('refuses every write from a browser session', async () => {
    // A trader creates a ticket through a server command, never by inserting.
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .insertInto('app.support_tickets')
          .values({
            user_id: userA,
            category: 'general',
            subject: 'Écriture directe',
            correlation_id: randomUUID(),
          })
          .execute(),
      ),
    ).rejects.toThrow();

    // Priority is an operator's decision: there is no grant that would let a
    // trader raise their own, which is why the absence of a UI control is a
    // guarantee rather than an omission.
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .updateTable('app.support_tickets')
          .set({ priority: 'urgent' })
          .where('public_id', '=', ticketA.publicId)
          .execute(),
      ),
    ).rejects.toThrow();

    // Nor can a trader decide their own contestation.
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .updateTable('app.contestations')
          .set({ status: 'overturned', decision: 'overturned' })
          .where('public_id', '=', contestationA)
          .execute(),
      ),
    ).rejects.toThrow();

    // And the authoritative evidence stays out of reach in both directions.
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .updateTable('app.risk_violations')
          .set({ observed_value: '99999.00' })
          .where('account_id', '=', accountA)
          .execute(),
      ),
    ).rejects.toThrow();
  });
});
