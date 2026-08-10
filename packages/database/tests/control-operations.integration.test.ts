import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import {
  loadIncidentCodes,
  loadMarketOperationsState,
  searchControlIncidents,
} from '../src/control-operations';
import { loadRiskCases, loadRiskInvestigation } from '../src/control-risk-investigation';

/**
 * Prompt 09 milestone 3 — Incidents, Market Operations and the risk
 * investigation surface against the real database.
 *
 * The risk-surface assertions matter most: they prove the investigation view
 * carries only the identity an investigation needs, and that each evidence
 * domain is withheld unless its own authority was granted.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('Control operations surfaces — real database', () => {
  let db: Db;
  const marker = randomUUID().slice(0, 8);
  let userId: string;
  let accountId: string;
  let purchaseOrderId: string;
  const incidentIds: string[] = [];

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
        email: `ops-${marker}@wariba-test.invalid`,
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

    // An account incident and a failed reconciliation put this account on
    // the risk case list for real reasons.
    incidentIds.push(
      (
        await db
          .insertInto('app.operations_incidents')
          .values({
            incident_code: 'ACCOUNT_RECONCILIATION_FAILURE',
            severity: 'critical',
            account_id: accountId,
            payout_request_id: null,
            evidence: JSON.stringify({ marker }),
          })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id,
    );
    await db
      .insertInto('app.account_reconciliation_runs')
      .values({
        account_id: accountId,
        status: 'mismatched',
        stored_account_balance: '10000.00000000',
        reconstructed_account_balance: '9999.00000000',
        stored_program_eligible_balance: '10000.00000000',
        reconstructed_program_eligible_balance: '9999.00000000',
        breakdown: JSON.stringify({ marker }),
        // account_reconciliation_incident_matches_status: a mismatch must
        // point at the incident it opened. The constraint is the reason a
        // failed reconciliation can never exist without something tracking
        // it, so the fixture honours it rather than working around it.
        incident_id: incidentIds[0] as string,
        executed_by: null,
      })
      .execute();
    await db
      .updateTable('app.trading_accounts')
      .set({
        integrity_hold: true,
        integrity_hold_reason: 'ACCOUNT_RECONCILIATION_FAILURE',
        integrity_hold_set_at: new Date(),
        integrity_hold_incident_id: incidentIds[0] as string,
      })
      .where('id', '=', accountId)
      .execute();
  }, 90000);

  afterAll(async () => {
    await db
      .updateTable('app.trading_accounts')
      .set({
        integrity_hold: false,
        integrity_hold_reason: null,
        integrity_hold_set_at: null,
        integrity_hold_incident_id: null,
      })
      .where('id', '=', accountId)
      .execute();
    await db
      .deleteFrom('app.account_reconciliation_runs')
      .where('account_id', '=', accountId)
      .execute();
    await db.deleteFrom('app.operations_incidents').where('account_id', '=', accountId).execute();
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

  it('lists incidents with open ones first and reports open/critical counts', async () => {
    const result = await searchControlIncidents(db, { pageSize: 100 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.openCount).toBeGreaterThan(0);
    expect(result.criticalOpenCount).toBeGreaterThan(0);
    const statuses = result.incidents.map((incident) => incident.status);
    const firstResolved = statuses.indexOf('resolved');
    if (firstResolved >= 0) {
      // Nothing open may appear after the first resolved row.
      expect(statuses.slice(firstResolved)).not.toContain('open');
    }
  });

  it('filters incidents by status, severity and scope', async () => {
    const critical = await searchControlIncidents(db, {
      filters: { severity: 'critical', status: 'open', scope: 'account' },
      pageSize: 100,
    });
    expect(critical.incidents.length).toBeGreaterThan(0);
    for (const incident of critical.incidents) {
      expect(incident.severity).toBe('critical');
      expect(incident.status).toBe('open');
      expect(incident.scope).toBe('account');
      expect(incident.accountId).not.toBeNull();
    }

    const platform = await searchControlIncidents(db, {
      filters: { scope: 'platform' },
      pageSize: 100,
    });
    for (const incident of platform.incidents) expect(incident.accountId).toBeNull();
  });

  it('resolves the account public id for an account-scoped incident', async () => {
    const result = await searchControlIncidents(db, {
      filters: { scope: 'account', status: 'open' },
      pageSize: 100,
    });
    const mine = result.incidents.find((incident) => incident.accountId === accountId);
    expect(mine?.accountPublicId).toMatch(/^EVAL-/);
  });

  it('offers incident codes drawn from recorded data', async () => {
    expect(await loadIncidentCodes(db)).toContain('ACCOUNT_RECONCILIATION_FAILURE');
  });

  it('reads market operations state from the durable lease row', async () => {
    const state = await loadMarketOperationsState(db);
    expect(state.leadership.serviceName).toBe('market-trigger-writer');
    expect(typeof state.leadership.fencingEpoch).toBe('string');
    expect(state.leadership.leaseExpiresAt).toBeInstanceOf(Date);
    expect(typeof state.leadership.leaseIsCurrent).toBe('boolean');
    // Platform alerts only — an account incident is not a platform alert.
    for (const alert of state.openAlerts) {
      expect(alert.incidentCode).not.toBe('ACCOUNT_RECONCILIATION_FAILURE');
    }
  });

  it('puts an account under integrity hold on the risk case list', async () => {
    const cases = await loadRiskCases(db);
    const mine = cases.find((riskCase) => riskCase.accountId === accountId);
    expect(mine).toBeDefined();
    expect(mine?.integrityHold).toBe(true);
    expect(mine?.criticalIncidents).toBeGreaterThan(0);
    expect(mine?.lastMismatchAt).not.toBeNull();
  });

  it('exposes only minimum-necessary identity — never trader PII', async () => {
    const cases = await loadRiskCases(db);
    const mine = cases.find((riskCase) => riskCase.accountId === accountId);
    // The case row is deliberately account-shaped, not person-shaped.
    expect(Object.keys(mine ?? {}).sort()).toEqual(
      [
        'accountId',
        'accountPublicId',
        'criticalIncidents',
        'integrityHold',
        'integrityHoldReason',
        'integrityHoldSetAt',
        'lastMismatchAt',
        'openIncidents',
        'programType',
        'status',
        'violations',
      ].sort(),
    );
    expect(JSON.stringify(mine)).not.toContain(`ops-${marker}@`);
  });

  it('returns every investigation section to a fully authorized caller', async () => {
    const detail = await loadRiskInvestigation(db, {
      accountId,
      sections: new Set(['risk', 'reconciliation_evidence', 'incident_evidence'] as const),
    });
    expect(detail?.identity.accountPublicId).toMatch(/^EVAL-/);
    expect(detail?.risk?.integrityHold).toBe(true);
    expect(detail?.reconciliationEvidence?.runs[0]?.status).toBe('mismatched');
    expect(detail?.incidentEvidence?.incidents.length).toBeGreaterThan(0);
  });

  it('withholds each evidence domain unless its own authority was granted', async () => {
    const riskOnly = await loadRiskInvestigation(db, {
      accountId,
      sections: new Set(['risk'] as const),
    });
    expect(riskOnly?.risk).toBeDefined();
    // Never queried — not fetched and blanked.
    expect(riskOnly?.reconciliationEvidence).toBeUndefined();
    expect(riskOnly?.incidentEvidence).toBeUndefined();

    const reconciliationOnly = await loadRiskInvestigation(db, {
      accountId,
      sections: new Set(['reconciliation_evidence'] as const),
    });
    expect(reconciliationOnly?.reconciliationEvidence?.runs.length).toBeGreaterThan(0);
    expect(reconciliationOnly?.risk).toBeUndefined();
    expect(reconciliationOnly?.incidentEvidence).toBeUndefined();
  });

  it('never returns payout or audit evidence from the risk surface', async () => {
    const detail = await loadRiskInvestigation(db, {
      accountId,
      sections: new Set(['risk', 'reconciliation_evidence', 'incident_evidence'] as const),
    });
    // Those domains belong to payout.view and audit_evidence.view; this
    // surface has no shape for them at all.
    expect(detail).not.toHaveProperty('payout');
    expect(detail).not.toHaveProperty('auditEvidence');
    expect(detail).not.toHaveProperty('trading');
  });

  it('still identifies the case when no evidence section is authorized', async () => {
    const detail = await loadRiskInvestigation(db, { accountId, sections: new Set() });
    expect(detail?.identity.accountId).toBe(accountId);
    expect(detail?.risk).toBeUndefined();
    expect(detail?.reconciliationEvidence).toBeUndefined();
    expect(detail?.incidentEvidence).toBeUndefined();
  });

  it('returns null for an unknown account rather than throwing', async () => {
    expect(
      await loadRiskInvestigation(db, { accountId: randomUUID(), sections: new Set(['risk']) }),
    ).toBeNull();
  });
});
