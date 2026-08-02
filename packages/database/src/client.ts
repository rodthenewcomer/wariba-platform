import { Kysely, PostgresDialect } from 'kysely';
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

export function createDbClient(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString }),
    }),
  });
}

export type Db = Kysely<Database>;
export type { Database } from './schema';
