import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createFixtureAccount, createFixtureDb, E2E_TEST_PASSWORD } from './fixtures';

const STATE_DIR = new URL('./.auth', import.meta.url).pathname;
export const FIXTURE_FILE = `${STATE_DIR}/fixture.json`;
export const STORAGE_STATE_FILE = `${STATE_DIR}/storage-state.json`;

/**
 * Creates one real activated WARIBA ONE account (same direct-activation
 * pattern as the integration tests) and signs in through the actual
 * /login form — not a synthesized cookie — so the saved session reflects
 * exactly what a real visitor gets.
 */
export default async function globalSetup(): Promise<void> {
  mkdirSync(STATE_DIR, { recursive: true });

  const db = createFixtureDb();
  const fixture = await createFixtureAccount(db, 'primary');
  await db.destroy();
  writeFileSync(FIXTURE_FILE, JSON.stringify(fixture));

  const baseURL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(fixture.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(E2E_TEST_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    // A cold Next.js development server may compile the full Hub route after
    // authentication. Keep this above the default 30 s so the setup measures
    // the signed-in product state rather than cold compiler latency.
    await page.waitForURL('**/hub', { timeout: 60_000 });
    /*
     * A test id, not a label. "Ouvrir WariX" is the account's next action and
     * legitimately appears in more than one place on the dashboard — the
     * sticky header carries it as a convenience while scrolling — so matching
     * by accessible name is a strict-mode violation waiting to happen.
     */
    await page.getByTestId('hub-next-action').waitFor({ state: 'visible' });
    await page.context().storageState({ path: STORAGE_STATE_FILE });
  } finally {
    await browser.close();
  }
}
