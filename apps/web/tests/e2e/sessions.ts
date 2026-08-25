import { expect } from '@playwright/test';
import { E2E_TEST_PASSWORD, STAFF_E2E_TEST_PASSWORD } from '@wariba/test-utils';

type Browser = import('@playwright/test').Browser;
type Page = import('@playwright/test').Page;
type BrowserCookies = Awaited<ReturnType<import('@playwright/test').BrowserContext['cookies']>>;

/**
 * One real sign-in per fixture user, reused for every test that needs them.
 *
 * ## Why this is shared rather than written per suite
 *
 * Supabase caps sign-ins at `sign_in_sign_ups = 30` per five minutes per IP
 * (supabase/config.toml). A suite that signs in inside each test spends that
 * budget on authentication rather than on the thing it is testing, and once
 * GoTrue starts refusing, the symptom is a login that never reaches /hub —
 * indistinguishable, in a report, from an authorization failure, and it moves
 * from test to test as timing shifts. That is exactly the misdiagnosis the
 * Support suite produced.
 *
 * The limit is a real protection and is not raised here. The suites simply
 * stop asking for fifty sessions when they need six. `control.spec.ts` proved
 * the pattern; this module is that pattern, in one place, so a new suite
 * inherits it instead of reinventing it.
 *
 * Sessions are cookies, not `storageState` files: they never touch disk, so a
 * real access token for a throwaway fixture user cannot be left behind in the
 * working tree.
 */
export class SessionPool {
  readonly #sessions = new Map<string, BrowserCookies>();

  /**
   * Signs in through the real /login form — not a synthesized cookie — so the
   * captured session is exactly what a browser would hold.
   */
  async capture(browser: Browser, email: string, password: string): Promise<void> {
    if (this.#sessions.has(email)) return;
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto('/login');
      await page.getByLabel('Adresse e-mail').fill(email);
      await page.getByLabel('Mot de passe', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Se connecter' }).click();
      await page.waitForURL('**/hub', { timeout: 60_000 });

      /*
       * Landing on /hub is not proof the session is usable by the next
       * navigation: the redirect can complete before the auth cookie is
       * committed to the jar. Waiting for the cookie is a real state check —
       * it is the thing every later request will actually carry.
       */
      await expect
        .poll(async () => (await context.cookies()).some((c) => c.name.includes('auth-token')), {
          timeout: 15_000,
        })
        .toBe(true);
      this.#sessions.set(email, await context.cookies());
    } finally {
      await context.close();
    }
  }

  captureTrader(browser: Browser, email: string): Promise<void> {
    return this.capture(browser, email, E2E_TEST_PASSWORD);
  }

  captureStaff(browser: Browser, email: string): Promise<void> {
    return this.capture(browser, email, STAFF_E2E_TEST_PASSWORD);
  }

  /** Adopts a captured session. No network sign-in, so no rate-limit budget. */
  async actAs(page: Page, email: string): Promise<void> {
    const cookies = this.#sessions.get(email);
    if (!cookies) throw new Error(`No captured session for ${email}.`);
    await page.context().clearCookies();
    await page.context().addCookies(cookies);
  }

  /** Drops every cookie, so the next navigation is an anonymous visitor's. */
  async signOut(page: Page): Promise<void> {
    await page.context().clearCookies();
  }
}
