import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import {
  loadControlPayoutDetail,
  searchControlPayouts,
  type PayoutDetailSection,
} from '../src/control-payout-review';
import { loadTreasuryCockpit } from '../src/control-treasury-cockpit';
import {
  loadActuarialScenarioRunModel,
  runPersistedActuarialScenario,
} from '../src/actuarial-scenarios';
import { evaluateReserveStatus, recordTreasuryReserveEntry } from '../src/treasury';

/**
 * Prompt 09 milestone 4 — the financial review surfaces against the real
 * database.
 *
 * These assert that Control *reads back* what the engines persisted rather
 * than recomputing it. A payout figure that Control derived itself could
 * disagree with the authoritative one, and an operator reviewing a payout
 * would have no way to know which was binding.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const ALL_SECTIONS: readonly PayoutDetailSection[] = [
  'payout',
  'audit_evidence',
  'reconciliation_evidence',
];

describeIfDb('Control financial surfaces — real database', () => {
  let db: Db;
  const marker = randomUUID().slice(0, 8);
  const treasuryEntryIds: string[] = [];
  let actorId: string;

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    // treasury_reserve_entries.created_by is NOT NULL by design: a reserve
    // movement always has an actor of record, so the fixture supplies a real
    // one rather than working around the constraint.
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `treasury-${marker}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    actorId = ((await response.json()) as { id: string }).id;
  }, 60000);

  afterAll(async () => {
    for (const id of treasuryEntryIds) {
      await db.deleteFrom('app.treasury_reserve_entries').where('id', '=', id).execute();
    }
    if (actorId) {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${actorId}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
    await db.destroy();
  }, 60000);

  it('pages the payout queue in the database and caps an oversized page size', async () => {
    const page = await searchControlPayouts(db, { pageSize: 10_000 });
    expect(page.pageSize).toBeLessThanOrEqual(100);
    expect(page.payouts.length).toBeLessThanOrEqual(page.pageSize);
    // The total describes the whole matching set, not just this page.
    expect(page.total).toBeGreaterThanOrEqual(page.payouts.length);
  });

  it('narrows by status in the database, not in the browser', async () => {
    const all = await searchControlPayouts(db, { pageSize: 100 });
    const paid = await searchControlPayouts(db, { filters: { status: 'paid' }, pageSize: 100 });
    for (const payout of paid.payouts) expect(payout.status).toBe('paid');
    expect(paid.total).toBeLessThanOrEqual(all.total);
  });

  it('treats wildcard characters in the search as literal text', async () => {
    expect((await searchControlPayouts(db, { filters: { query: '%' } })).total).toBe(0);
  });

  it('combines filters as AND', async () => {
    const contradictory = await searchControlPayouts(db, {
      filters: { status: 'paid', cycleNumber: 99 },
      pageSize: 100,
    });
    // Cycle 99 cannot exist — the DB caps cycles at 5.
    expect(contradictory.total).toBe(0);
  });

  it('never surfaces a payout cycle above five', async () => {
    const page = await searchControlPayouts(db, { pageSize: 100 });
    for (const payout of page.payouts) {
      expect(payout.cycleNumber).toBeGreaterThanOrEqual(1);
      // P1–P5 only; cycle 6 is impossible at the database level.
      expect(payout.cycleNumber).toBeLessThanOrEqual(5);
    }
  });

  it('reports splits only at the canonical 0.85 / 0.90 rates', async () => {
    const page = await searchControlPayouts(db, { pageSize: 100 });
    for (const payout of page.payouts) {
      expect(['0.85', '0.90']).toContain(new Decimal(payout.traderSplitRate).toFixed(2));
    }
  });

  it('reads payout money back from the engine, never recomputed', async () => {
    const paid = await searchControlPayouts(db, { filters: { status: 'paid' }, pageSize: 100 });
    const candidate = paid.payouts[0];
    if (!candidate) return;

    const detail = await loadControlPayoutDetail(db, {
      payoutRequestId: candidate.id,
      sections: new Set(ALL_SECTIONS),
    });
    const stored = await db
      .selectFrom('app.payout_requests')
      .select(['approved_gross_base', 'trader_net_cash', 'wariba_share'])
      .where('id', '=', candidate.id)
      .executeTakeFirstOrThrow();

    // Byte-identical to the persisted values — no re-derivation, no
    // re-rounding.
    expect(detail?.approval.approvedGrossBase).toBe(stored.approved_gross_base);
    expect(detail?.approval.traderNetCash).toBe(stored.trader_net_cash);
    expect(detail?.approval.waribaShare).toBe(stored.wariba_share);

    // The engine's own invariant, verified as displayed: trader + WARIBA
    // equals the approved gross base, and there is no 50% haircut.
    if (stored.approved_gross_base && stored.trader_net_cash && stored.wariba_share) {
      const sum = new Decimal(stored.trader_net_cash).plus(stored.wariba_share);
      expect(sum.toFixed(2)).toBe(new Decimal(stored.approved_gross_base).toFixed(2));
      const ratio = new Decimal(stored.trader_net_cash).dividedBy(stored.approved_gross_base);
      expect(ratio.greaterThan('0.5')).toBe(true);
    }
  });

  it('shows the immutable eligibility snapshot rather than a fresh calculation', async () => {
    const page = await searchControlPayouts(db, { pageSize: 100 });
    const candidate = page.payouts[0];
    if (!candidate) return;
    const detail = await loadControlPayoutDetail(db, {
      payoutRequestId: candidate.id,
      sections: new Set(ALL_SECTIONS),
    });
    expect(detail?.eligibilitySnapshot).toBeDefined();
    const stored = await db
      .selectFrom('app.payout_requests')
      .select('eligibility_snapshot')
      .where('id', '=', candidate.id)
      .executeTakeFirstOrThrow();
    expect(detail?.eligibilitySnapshot).toEqual(stored.eligibility_snapshot);
  });

  it('never presents an accepted provider submission as paid', async () => {
    const processing = await searchControlPayouts(db, {
      filters: { status: 'processing' },
      pageSize: 100,
    });
    for (const payout of processing.payouts) {
      // Submitted/accepted is not settled: the status stays `processing`
      // until the provider reconciliation says paid.
      expect(payout.status).not.toBe('paid');
    }
  });

  it('exposes at most one reversal entry per payout, as a compensating entry', async () => {
    const reversed = await searchControlPayouts(db, {
      filters: { status: 'reversed' },
      pageSize: 100,
    });
    for (const payout of reversed.payouts) {
      const detail = await loadControlPayoutDetail(db, {
        payoutRequestId: payout.id,
        sections: new Set<PayoutDetailSection>(['payout']),
      });
      const reversals = (detail?.ledgerEntries ?? []).filter(
        (entry) => entry.entryType === 'reversal',
      );
      expect(reversals.length).toBeLessThanOrEqual(1);
      // A reversal compensates the original debit; it never edits it.
      for (const reversal of reversals) expect(reversal.reversalOf).not.toBeNull();
      expect(detail?.reversal.reversedAt).not.toBeNull();
    }
  });

  it('withholds cross-domain evidence unless its own section is authorized', async () => {
    const page = await searchControlPayouts(db, { pageSize: 1 });
    const candidate = page.payouts[0];
    if (!candidate) return;

    const payoutOnly = await loadControlPayoutDetail(db, {
      payoutRequestId: candidate.id,
      sections: new Set<PayoutDetailSection>(['payout']),
    });
    // A link from a payout is not a bridge into audit or reconciliation.
    expect(payoutOnly?.auditEvidence).toBeUndefined();
    expect(payoutOnly?.reconciliationEvidence).toBeUndefined();

    const withAudit = await loadControlPayoutDetail(db, {
      payoutRequestId: candidate.id,
      sections: new Set<PayoutDetailSection>(['payout', 'audit_evidence']),
    });
    expect(withAudit?.auditEvidence).toBeDefined();
    expect(withAudit?.reconciliationEvidence).toBeUndefined();
  });

  it('returns nothing at all without the core payout section', async () => {
    const page = await searchControlPayouts(db, { pageSize: 1 });
    const candidate = page.payouts[0];
    if (!candidate) return;
    expect(
      await loadControlPayoutDetail(db, {
        payoutRequestId: candidate.id,
        sections: new Set<PayoutDetailSection>(['audit_evidence']),
      }),
    ).toBeNull();
  });

  it('takes the coverage ratio and zone from the canonical engine, not a second calculator', async () => {
    const [cockpit, canonical] = await Promise.all([
      loadTreasuryCockpit(db),
      evaluateReserveStatus(db),
    ]);
    expect(cockpit.status.coverageRatio).toBe(canonical.coverageRatio);
    expect(cockpit.status.zone).toBe(canonical.zone);
    expect(cockpit.status.availableReserve).toBe(canonical.availableReserve);
  });

  it('keeps reserve, projected liability and simulated balances as separate figures', async () => {
    const cockpit = await loadTreasuryCockpit(db);
    // Simulated trader nominal is not WARIBA cash and must never be folded
    // into the reserve.
    expect(cockpit.nonReserve.simulatedTraderNominal).toBeDefined();
    expect(cockpit.composition[0]?.amount).toBe(cockpit.status.availableReserve);
    if (new Decimal(cockpit.nonReserve.simulatedTraderNominal).greaterThan(0)) {
      expect(
        new Decimal(cockpit.status.availableReserve).equals(
          cockpit.nonReserve.simulatedTraderNominal,
        ),
      ).toBe(false);
    }
    // A projection is not cash: it is reported beside the reserve, never
    // added to or subtracted from it.
    expect(cockpit.liabilities.projectedPayoutsNext30Days).toBe(
      cockpit.status.projectedPayoutsNext30Days,
    );
  });

  it('names the buckets the data model does not represent instead of faking them', async () => {
    const cockpit = await loadTreasuryCockpit(db);
    // Only the payout reserve exists in app.treasury_reserve_entries.
    expect(cockpit.composition.map((bucket) => bucket.bucket)).toEqual(['payout_reserve']);
    expect(cockpit.unrepresentedBuckets.length).toBeGreaterThan(0);
  });

  it('shows treasury history additively and reflects a new authorized entry', async () => {
    const before = await loadTreasuryCockpit(db);
    // recordTreasuryReserveEntry returns void — the entry is looked up by
    // its reason so the fixture can clean up exactly what it created.
    await recordTreasuryReserveEntry(db, {
      entryType: 'deposit',
      amount: '1000.00',
      reason: `Milestone 4 fixture ${marker}`,
      createdBy: actorId,
    });
    const created = await db
      .selectFrom('app.treasury_reserve_entries')
      .select('id')
      .where('reason', '=', `Milestone 4 fixture ${marker}`)
      .executeTakeFirstOrThrow();
    treasuryEntryIds.push(created.id);

    const after = await loadTreasuryCockpit(db);
    // History grows; nothing already recorded changes.
    expect(after.history.length).toBe(before.history.length + 1);
    expect(after.history[0]?.reason).toContain(marker);
    expect(
      new Decimal(after.status.availableReserve).minus(before.status.availableReserve).toFixed(2),
    ).toBe('1000.00');
  });

  /**
   * app.actuarial_scenario_runs is immutable by trigger, so these run inside
   * a transaction that is rolled back rather than deleting history.
   */
  const ROLLBACK = 'Rollback actuarial console integration test.';
  const PRODUCTS = [
    {
      productCode: '10K' as const,
      collectedPrice: '39900',
      capsByRank: ['500', '750', '1000', '1500', '2000'] as const,
      splitByRank: ['0.85', '0.85', '0.85', '0.85', '0.90'] as const,
    },
  ];

  it('reads the MODEL side back from the run that produced it', async () => {
    await expect(
      db.transaction().execute(async (trx) => {
        const run = await runPersistedActuarialScenario(trx, {
          scenarioName: 'base',
          purchasesByProduct: { '10K': 1000 },
          products: PRODUCTS,
          pspFeeRate: '0.03',
        });

        const model = await loadActuarialScenarioRunModel(trx, run.id);
        // Identical to what the engine executed — a comparison whose model
        // half came from anywhere else would be comparing reality against a
        // number nobody ran.
        expect(model.totalPurchases).toBe(run.result.totalPurchases);
        expect(model.totalSuccessfulEvaluations).toBe(run.result.totalSuccessfulEvaluations);
        expect(model.totalPerformanceActivations).toBe(run.result.totalPerformanceActivations);
        expect(model.totalCompletedBuffers).toBe(run.result.totalCompletedBuffers);
        expect(model.totalPayoutRecipientsByRank).toEqual(run.result.totalPayoutRecipientsByRank);
        expect(model.expectedPayoutCost).toBe(run.result.expectedPayoutCost);

        throw new Error(ROLLBACK);
      }),
    ).rejects.toThrow(ROLLBACK);
  }, 30000);

  it('refuses a run id that does not exist rather than returning an empty model', async () => {
    await expect(loadActuarialScenarioRunModel(db, randomUUID())).rejects.toThrow(
      'Actuarial scenario run was not found.',
    );
  });

  it('cannot have the model it was compared against rewritten afterwards', async () => {
    await expect(
      db.transaction().execute(async (trx) => {
        const run = await runPersistedActuarialScenario(trx, {
          scenarioName: 'base',
          purchasesByProduct: { '10K': 10 },
          products: PRODUCTS,
          pspFeeRate: '0.03',
        });
        // The MODEL half of a comparison is anchored in the database, not
        // merely by convention: even a direct UPDATE cannot move it.
        await expect(
          sql`update app.actuarial_scenario_runs
              set result_snapshot = jsonb_set(result_snapshot, '{expectedPayoutCost}', '"0"')
              where id = ${run.id}`.execute(trx),
        ).rejects.toThrow('immutable');

        throw new Error(ROLLBACK);
      }),
    ).rejects.toThrow(ROLLBACK);
  }, 30000);

  it('refuses a malformed stored snapshot instead of comparing against it', async () => {
    await expect(
      db.transaction().execute(async (trx) => {
        const assumption = await trx
          .selectFrom('app.actuarial_scenario_assumptions')
          .select(['id', 'scenario_name', 'version', 'assumptions_json'])
          .where('is_active', '=', true)
          .executeTakeFirstOrThrow();
        // result_snapshot is JSON, so a reader that cast instead of
        // validating would turn a corrupted row into a plausible-looking
        // variance. Inserted deliberately malformed to prove it does not.
        const inserted = await trx
          .insertInto('app.actuarial_scenario_runs')
          .values({
            scenario_assumption_id: assumption.id,
            scenario_name: assumption.scenario_name,
            scenario_version: assumption.version,
            assumptions_snapshot: JSON.stringify(assumption.assumptions_json),
            input_snapshot: JSON.stringify({}),
            result_snapshot: JSON.stringify({ totalPurchases: 'not a number' }),
            executed_by: null,
          })
          .returning('id')
          .executeTakeFirstOrThrow();

        await expect(loadActuarialScenarioRunModel(trx, inserted.id)).rejects.toThrow(
          'totalPurchases',
        );

        throw new Error(ROLLBACK);
      }),
    ).rejects.toThrow(ROLLBACK);
  }, 30000);
});
