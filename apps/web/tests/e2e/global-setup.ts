import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';
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
    // A cold development server can compile the public auth route before it
    // can even emit the first document. Bound that real startup budget here;
    // the login assertions below remain unchanged.
    page.setDefaultNavigationTimeout(90_000);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(fixture.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(E2E_TEST_PASSWORD);
    const submit = page.locator('form button[type="submit"]');
    await submit.click();
    try {
      await expect(submit).toHaveText('Connexion…', { timeout: 5_000 });
    } catch {
      // On a cold App Router hydration, the first native click can land before
      // the server-action listener is attached. Retry only when the URL and
      // pending label prove that no submission started.
      if (new URL(page.url()).pathname === '/login') await submit.click();
    }
    // A cold Next.js development server may compile the full Hub route after
    // authentication. The module graph has measured just over two minutes on
    // the constrained local runner, so keep a bounded three-minute budget.
    await page.waitForURL('**/hub', { timeout: 180_000 });
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
