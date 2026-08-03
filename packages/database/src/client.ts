import { Kysely, PostgresDialect, type Transaction } from 'kysely';
import pg from 'pg';
import type { Database } from './schema';

/**
 * Engineering Constitution §13.5: decimals serialize as strings, never
 * floats. pg's default `numeric` parser returns a JS string already —
 * this override exists so that stays true even if a dependency upgrade
 * ever changes that default, rather than relying on it silently.
 */
const NUMERIC_OID = 1700;
pg.types.setTypeParser(NUMERIC_OID, (value: string) => value);

/**
 * `app.account_daily_snapshots.trading_day` is a UTC calendar day (Prompt 05
 * — DLL/Maximum Loss reset and finalization are pinned to UTC 00:00). pg's
 * default `date` parser returns a JS Date, which risks a local-timezone
 * off-by-one when formatted back out. Keeping the raw 'YYYY-MM-DD' string
 * makes the UTC-day identity explicit end to end instead of relying on Date
 * round-tripping correctly.
 */
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value: string) => value);

export function createDbClient(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString }),
    }),
  });
}

export type Db = Kysely<Database>;
export type DbExecutor = Db | Transaction<Database>;
export type { Database } from './schema';
