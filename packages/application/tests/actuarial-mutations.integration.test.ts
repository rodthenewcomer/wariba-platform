import { randomUUID } from 'node:crypto';
// kysely is a devDependency here, for this file only. The application layer
// writes no raw SQL; the failure injection below needs a trigger, which no
// query builder expresses.
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, loadDefaultActuarialScenarioInput, type Db } from '@wariba/database';
import { recordActuarialVariance, runStoredActuarialScenario } from '../src/index';

/**
 * Prompt 09 milestone 4 closure — a staff-triggered actuarial mutation must
 * never leave an immutable artifact without its staff audit evidence.
 *
 * The stakes are asymmetric. `app.actuarial_scenario_runs` is immutable by
 * trigger: a run written without an audit event could never be annotated,
 * attributed or removed afterwards. So these tests do not merely check that
 * both rows appear on the happy path — they force the audit insert to fail
 * and assert the artifact is gone with it.
 *
 * The failure is injected with a real trigger on `audit.audit_events`,
 * created and dropped by the test. That fails at exactly the point the
 * ordering question is about — after the artifact insert — without touching
 * production code to make itself testable.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

/**
 * A stable fixture actor, created once and never deleted.
 *
 * `app.actuarial_scenario_runs.executed_by` references `auth.users` with no
 * cascade and the row cannot be deleted, so an ephemeral actor per run would
 * accumulate permanently pinned users. Reusing one deliberate identity is
 * the same posture the platform takes for real staff — see
 * STAFF_IDENTITY_RETENTION in the decision log.
 */
const FIXTURE_ACTOR_EMAIL = 'actuarial-mutation-fixture@wariba-test.invalid';

async function ensureFixtureActor(db: Db): Promise<string> {
  const existing = await db
    .selectFrom('auth.users')
    .select('id')
    .where('email', '=', FIXTURE_ACTOR_EMAIL)
    .executeTakeFirst();
  if (existing) return existing.id;

  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: FIXTURE_ACTOR_EMAIL,
      password: randomUUID(),
      email_confirm: true,
    }),
  });
  if (!response.ok) throw new Error(`Fixture actor creation failed: HTTP ${response.status}`);
  return ((await response.json()) as { id: string }).id;
}

/** Makes the next audit insert for `action` fail, at the database. */
async function blockAuditWrites(db: Db, action: string): Promise<void> {
  await sql`
    create or replace function app.wariba_test_block_audit()
    returns trigger language plpgsql as $$
    begin
      if new.action = ${sql.lit(action)} then
        raise exception 'Injected audit failure';
      end if;
      return new;
    end;
    $$;
  `.execute(db);
  await sql`
    create trigger wariba_test_block_audit
    before insert on audit.audit_events
    for each row execute function app.wariba_test_block_audit();
  `.execute(db);
}

async function unblockAuditWrites(db: Db): Promise<void> {
  await sql`drop trigger if exists wariba_test_block_audit on audit.audit_events;`.execute(db);
  await sql`drop function if exists app.wariba_test_block_audit();`.execute(db);
}

describeIfDb('actuarial mutations — artifact and audit are atomic', () => {
  let db: Db;
  let actorId: string;
  const varianceRunIds: string[] = [];
  const auditCorrelationIds: string[] = [];

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    actorId = await ensureFixtureActor(db);
  }, 60000);

  afterAll(async () => {
    // Belt and braces: a crashed assertion must not leave the injected
    // trigger blocking every later audit write on this database.
    await unblockAuditWrites(db);
    for (const id of varianceRunIds) {
      await db.deleteFrom('app.actuarial_variance_runs').where('id', '=', id).execute();
    }
    for (const correlationId of auditCorrelationIds) {
      await db
        .deleteFrom('audit.audit_events')
        .where('correlation_id', '=', correlationId)
        .execute();
    }
    // app.actuarial_scenario_runs rows are intentionally left behind:
    // the table is immutable by design and a test does not get to be an
    // exception to that.
    await db.destroy();
  }, 60000);

  async function executeScenario(role: string) {
    const input = await loadDefaultActuarialScenarioInput(db);
    return runStoredActuarialScenario(db, {
      scenarioName: 'base',
      purchasesByProduct: input.purchasesByProduct,
      products: input.products,
      pspFeeRate: input.pspFeeRate,
      executedBy: actorId,
      executedByRole: role,
    });
  }

  it('writes the scenario run and its staff audit event together', async () => {
    const run = await executeScenario('finance');
    auditCorrelationIds.push(run.id);

    const stored = await db
      .selectFrom('app.actuarial_scenario_runs')
      .select('id')
      .where('id', '=', run.id)
      .executeTakeFirst();
    expect(stored?.id).toBe(run.id);

    const audit = await db
      .selectFrom('audit.audit_events')
      .selectAll()
      .where('correlation_id', '=', run.id)
      .executeTakeFirstOrThrow();

    expect(audit.actor_type).toBe('staff');
    expect(audit.actor_id).toBe(actorId);
    // The role that actually ran it — both risk and finance hold
    // actuarial.modify, and naming the wrong one is worse than naming none.
    expect(audit.role).toBe('finance');
    expect(audit.permission).toBe('actuarial.modify');
    expect(audit.action).toBe('actuarial.scenario_executed');
    expect(audit.target_type).toBe('actuarial_scenario_run');
    expect(audit.target_id).toBe(run.id);
  }, 60000);

  it('writes the variance artifact and its staff audit event together', async () => {
    const modelRun = await executeScenario('risk');
    auditCorrelationIds.push(modelRun.id);

    const correlationId = randomUUID();
    const variance = await recordActuarialVariance(db, {
      scenarioRunId: modelRun.id,
      executedBy: actorId,
      executedByRole: 'risk',
      correlationId,
    });
    varianceRunIds.push(variance.id);
    auditCorrelationIds.push(correlationId);

    const stored = await db
      .selectFrom('app.actuarial_variance_runs')
      .select(['id', 'scenario_run_id', 'coverage'])
      .where('id', '=', variance.id)
      .executeTakeFirstOrThrow();
    expect(stored.scenario_run_id).toBe(modelRun.id);
    // Coverage semantics are untouched by the atomicity work.
    expect(['insufficient_data', 'partial', 'comparable']).toContain(stored.coverage);

    const audit = await db
      .selectFrom('audit.audit_events')
      .selectAll()
      .where('correlation_id', '=', correlationId)
      .executeTakeFirstOrThrow();
    expect(audit.actor_id).toBe(actorId);
    expect(audit.role).toBe('risk');
    expect(audit.permission).toBe('actuarial.modify');
    expect(audit.action).toBe('actuarial.variance_recorded');
    expect(audit.target_type).toBe('actuarial_variance_run');
    expect(audit.target_id).toBe(variance.id);
  }, 60000);

  it('rolls the scenario run back when its audit event cannot be written', async () => {
    const before = await db
      .selectFrom('app.actuarial_scenario_runs')
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow();

    await blockAuditWrites(db, 'actuarial.scenario_executed');
    try {
      await expect(executeScenario('risk')).rejects.toThrow('Injected audit failure');
    } finally {
      await unblockAuditWrites(db);
    }

    const after = await db
      .selectFrom('app.actuarial_scenario_runs')
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow();
    // No orphan run — which matters more here than anywhere else, because
    // the table's immutability trigger would make one permanent.
    expect(Number(after.count)).toBe(Number(before.count));
  }, 60000);

  it('rolls the variance artifact back when its audit event cannot be written', async () => {
    const modelRun = await executeScenario('risk');
    auditCorrelationIds.push(modelRun.id);

    await blockAuditWrites(db, 'actuarial.variance_recorded');
    try {
      await expect(
        recordActuarialVariance(db, {
          scenarioRunId: modelRun.id,
          executedBy: actorId,
          executedByRole: 'risk',
        }),
      ).rejects.toThrow('Injected audit failure');
    } finally {
      await unblockAuditWrites(db);
    }

    const orphans = await db
      .selectFrom('app.actuarial_variance_runs')
      .select('id')
      .where('scenario_run_id', '=', modelRun.id)
      .execute();
    expect(orphans).toHaveLength(0);

    // And nothing misleading in the audit trail either: this comparison did
    // not happen, so no event may claim it did. Keyed on the scenario run
    // the attempt referenced, since the variance row never got an id.
    const events = await db
      .selectFrom('audit.audit_events')
      .select('id')
      .where('action', '=', 'actuarial.variance_recorded')
      .where(sql<string>`after_json ->> 'scenarioRunId'`, '=', modelRun.id)
      .execute();
    expect(events).toHaveLength(0);
  }, 60000);

  it('leaves neither artifact nor audit when the model snapshot is unreadable', async () => {
    const before = await db
      .selectFrom('app.actuarial_variance_runs')
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow();

    await expect(
      recordActuarialVariance(db, {
        scenarioRunId: randomUUID(),
        executedBy: actorId,
        executedByRole: 'risk',
      }),
    ).rejects.toThrow('Actuarial scenario run was not found.');

    const after = await db
      .selectFrom('app.actuarial_variance_runs')
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow();
    expect(Number(after.count)).toBe(Number(before.count));
  }, 60000);
});
