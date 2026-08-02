import 'server-only';
import { createDbClient, type Db } from '@wariba/application';
import { loadWebConfig } from './config';

let cached: Db | undefined;

export function getDb(): Db {
  if (!cached) {
    cached = createDbClient(loadWebConfig().DATABASE_URL);
  }
  return cached;
}
