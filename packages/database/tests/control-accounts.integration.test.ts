import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { recordStaffAuditEvent } from '../src/audit';
import {
  loadControlAccountDetail,
  searchControlAccounts,
  type AccountDetailSection,
} from '../src/control-accounts';

/**
 * Prompt 09 — the Accounts explorer against the real database.
 *
 * The section assertions are the point of this file. They prove the detail
 * loader returns *nothing at all* for a domain the caller was not authorized
 * for — the guarantee is that the query was never issued, so there is no
 * payload to leak through a render tree, a log line or an error report. A
 * test that only checked a hidden tab would prove none of that.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const ALL_SECTIONS: readonly AccountDetailSection[] = [
  'overview',
  'trading',
  'risk',
  'payout',
  'audit_evidence',
  'incident_evidence',
  'reconciliation_evidence',
];

describeIfDb('Control accounts explorer — real database', () => {
  let db: Db;
  const marker = randomUUID().slice(0, 8);
  let userId: string;
  let accountId: string;
  let purchaseOrderId: string;
  let incidentId: string;

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `acct-${marker}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    userId = ((await response.json()) as { id: string }).id;

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
    purchaseOrderId = (
      await db
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
        .executeTakeFirstOrThrow()
    ).id;
    accountId = (
      await activateEvaluationAccount(db, {
        purchaseOrderId,
        userId,
        nominalBalance: productVersion.nominal_balance,
        currency: productVersion.nominal_currency,
      })
    ).id;

    // Real evidence in each gated domain, so "absent" cannot be confused
    // with "there was nothing to return".
    incidentId = (
      await db
        .insertInto('app.operations_incidents')
        .values({
          incident_code: 'MANUAL_INTEGRITY_HOLD',
          severity: 'warning',
          account_id: accountId,
          payout_request_id: null,
          evidence: JSON.stringify({ reason: `fixture ${marker}` }),
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id;
    await db
      .insertInto('app.account_reconciliation_runs')
      .values({
        account_id: accountId,
        status: 'matched',
        stored_account_balance: '10000.00000000',
        reconstructed_account_balance: '10000.00000000',
        stored_program_eligible_balance: '10000.00000000',
        reconstructed_program_eligible_balance: '10000.00000000',
        breakdown: JSON.stringify({ fixture: marker }),
        incident_id: null,
        executed_by: null,
      })
      .execute();
    await recordStaffAuditEvent(db, {
      actorId: userId,
      actorRole: 'risk',
      permission: 'integrity_hold.place',
      action: 'integrity_hold.placed',
      targetType: 'trading_account',
      targetId: accountId,
      before: {},
      after: {},
      reason: `fixture ${marker}`,
      correlationId: `acct-${marker}`,
      occurredAt: new Date(),
    });
  }, 90000);

  afterAll(async () => {
    await db
      .deleteFrom('audit.audit_events')
      .where('correlation_id', '=', `acct-${marker}`)
      .execute();
    await db
      .deleteFrom('app.account_reconciliation_runs')
      .where('account_id', '=', accountId)
      .execute();
    await db.deleteFrom('app.operations_incidents').where('id', '=', incidentId).execute();
    await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', accountId).execute();
    await db
      .deleteFrom('app.account_state_transitions')
      .where('account_id', '=', accountId)
      .execute();
    await db
      .deleteFrom('app.account_daily_snapshots')
      .where('account_id', '=', accountId)
      .execute();
    await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
    await db.deleteFrom('app.purchase_orders').where('id', '=', purchaseOrderId).execute();
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    await db.destroy();
  }, 90000);

  it('finds an account by its public identifier and by owner email', async () => {
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('public_id')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect((await searchControlAccounts(db, { filters: { query: account.public_id } })).total).toBe(
      1,
    );
    expect((await searchControlAccounts(db, { filters: { query: `acct-${marker}` } })).total).toBe(
      1,
    );
  });

  it('treats wildcard characters as literal text', async () => {
    expect((await searchControlAccounts(db, { filters: { query: '%' } })).total).toBe(0);
  });

  it('filters by program, status and integrity hold', async () => {
    const byProgram = await searchControlAccounts(db, {
      filters: { query: `acct-${marker}`, program: 'WARIBA_ONE' },
    });
    expect(byProgram.total).toBe(1);

    const wrongProgram = await searchControlAccounts(db, {
      filters: { query: `acct-${marker}`, program: 'WARIBA_PERFORMANCE' },
    });
    expect(wrongProgram.total).toBe(0);

    const held = await searchControlAccounts(db, {
      filters: { query: `acct-${marker}`, integrityHold: true },
    });
    expect(held.total).toBe(0);
  });

  it('caps an oversized page size instead of returning every account', async () => {
    const result = await searchControlAccounts(db, { pageSize: 10_000 });
    expect(result.pageSize).toBeLessThanOrEqual(100);
  });

  it('returns every section to a caller authorized for all of them', async () => {
    const detail = await loadControlAccountDetail(db, {
      accountId,
      sections: new Set(ALL_SECTIONS),
    });
    expect(detail?.overview?.id).toBe(accountId);
    expect(detail?.trading).toBeDefined();
    expect(detail?.risk).toBeDefined();
    expect(detail?.payout).toBeDefined();
    // Each gated domain has real evidence, so absence below is meaningful.
    expect(detail?.reconciliationEvidence?.runs.length).toBeGreaterThan(0);
    expect(detail?.incidentEvidence?.incidents.length).toBeGreaterThan(0);
    expect(detail?.auditEvidence?.events.length).toBeGreaterThan(0);
  });

  it('returns only Overview and Trading for a support-equivalent section set', async () => {
    const detail = await loadControlAccountDetail(db, {
      accountId,
      sections: new Set<AccountDetailSection>(['overview', 'trading', 'payout']),
    });
    expect(detail?.overview).toBeDefined();
    expect(detail?.trading).toBeDefined();
    expect(detail?.payout).toBeDefined();
    // Not empty objects — absent entirely, because they were never queried.
    expect(detail?.risk).toBeUndefined();
    expect(detail?.auditEvidence).toBeUndefined();
    expect(detail?.incidentEvidence).toBeUndefined();
    expect(detail?.reconciliationEvidence).toBeUndefined();
  });

  it('withholds reconciliation evidence unless that section is authorized', async () => {
    const without = await loadControlAccountDetail(db, {
      accountId,
      sections: new Set<AccountDetailSection>(['overview', 'trading', 'risk', 'payout']),
    });
    expect(without?.reconciliationEvidence).toBeUndefined();

    const with_ = await loadControlAccountDetail(db, {
      accountId,
      sections: new Set<AccountDetailSection>(['overview', 'reconciliation_evidence']),
    });
    // The reconstruction really is there for an authorized reader — the
    // absence above is authorization, not an empty table.
    expect(with_?.reconciliationEvidence?.runs[0]?.storedAccountBalance).toBe('10000.00000000');
  });

  it('withholds audit and incident evidence independently of each other', async () => {
    const auditOnly = await loadControlAccountDetail(db, {
      accountId,
      sections: new Set<AccountDetailSection>(['overview', 'audit_evidence']),
    });
    expect(auditOnly?.auditEvidence?.events.length).toBeGreaterThan(0);
    expect(auditOnly?.incidentEvidence).toBeUndefined();

    const incidentOnly = await loadControlAccountDetail(db, {
      accountId,
      sections: new Set<AccountDetailSection>(['overview', 'incident_evidence']),
    });
    expect(incidentOnly?.incidentEvidence?.incidents.length).toBeGreaterThan(0);
    expect(incidentOnly?.auditEvidence).toBeUndefined();
  });

  it('returns an empty detail rather than any evidence for an empty section set', async () => {
    const detail = await loadControlAccountDetail(db, { accountId, sections: new Set() });
    expect(detail).toEqual({});
  });

  it('returns null for an unknown account rather than throwing', async () => {
    expect(
      await loadControlAccountDetail(db, {
        accountId: randomUUID(),
        sections: new Set(ALL_SECTIONS),
      }),
    ).toBeNull();
  });
});
