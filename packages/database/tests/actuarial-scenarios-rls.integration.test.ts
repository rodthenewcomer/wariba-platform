import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';

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
    return fn(trx);
  });
}

describeIfDb('actuarial scenario assumptions — row level security (real database)', () => {
  let db: Db;

  beforeAll(() => {
    db = createDbClient(DATABASE_URL as string);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('denies authenticated direct reads because assumptions are server-authoritative', async () => {
    await expect(
      asRole(db, 'authenticated', randomUUID(), (trx) =>
        trx
          .selectFrom('app.actuarial_scenario_assumptions')
          .select('id')
          .where('is_active', '=', true)
          .execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('denies anonymous direct reads', async () => {
    await expect(
      asRole(db, 'anon', null, (trx) =>
        trx
          .selectFrom('app.actuarial_scenario_assumptions')
          .select('id')
          .where('is_active', '=', true)
          .execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('allows the server connection to read the active versioned records', async () => {
    const active = await db
      .selectFrom('app.actuarial_scenario_assumptions')
      .select(['scenario_name', 'version'])
      .where('is_active', '=', true)
      .orderBy('scenario_name')
      .execute();
    expect(active).toHaveLength(5);
    expect(active.map((row) => row.scenario_name)).toEqual([
      'aggressive',
      'base',
      'conservative',
      'custom',
      'stress',
    ]);
  });

  it.each([
    'actuarial_scenario_runs',
    'account_reconciliation_runs',
    'operations_incidents',
    'realtime_leadership',
    'staff_action_rate_limits',
  ] as const)('denies authenticated direct reads of server-only %s evidence', async (table) => {
    await expect(
      asRole(db, 'authenticated', randomUUID(), (trx) =>
        trx.selectFrom(`app.${table}`).selectAll().execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
