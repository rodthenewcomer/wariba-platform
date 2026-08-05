import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createFixtureDb, deleteFixtureAccount, type E2eFixtureAccount } from './fixtures';
import { FIXTURE_FILE } from './global-setup';

const STATE_DIR = new URL('./.auth', import.meta.url).pathname;

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(FIXTURE_FILE)) {
    rmSync(STATE_DIR, { recursive: true, force: true });
    return;
  }

  const fixture = JSON.parse(readFileSync(FIXTURE_FILE, 'utf-8')) as E2eFixtureAccount;
  const db = createFixtureDb();
  try {
    await deleteFixtureAccount(db, fixture);
  } finally {
    await db.destroy();
    rmSync(STATE_DIR, { recursive: true, force: true });
  }
}
