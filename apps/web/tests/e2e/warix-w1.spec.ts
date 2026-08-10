import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  deletePayoutAccount,
  seedPayoutAccount,
  type PayoutAccountFixture,
  type PayoutFixtureEnvironment,
} from '@wariba/test-utils';
import {
  attachFixtureAccountToUser,
  createFixtureAccount,
  createFixtureDb,
  deleteFixtureAccount,
  expect,
  test,
  type E2eFixtureAccount,
} from './fixtures';

/**
 * WariX Workstation 2026 — W1 acceptance.
 *
 * Three things W0 recorded as broken and W1 had to close:
 *   §5/§26 account selection is server-authoritative and cannot be steered
 *          to another trader's account;
 *   §7     the terminal names the account's real program;
 *   §18/19 mobile puts the chart above the fold and the document never
 *          scrolls horizontally.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function openWorkstation(page: Page, url = '/trade') {
  await page.goto(url);
  await expect(page.getByTestId('workstation-status-bar')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Connecté')).toBeVisible({ timeout: 30_000 });
}

/** The switcher renders each account as a real anchor inside a <details>. */
async function openAccountSwitcher(page: Page) {
  const switcher = page.getByTestId('workstation-account-switcher');
  await expect(switcher).toBeVisible();
  await switcher.locator('summary').click();
  return page.getByRole('navigation', { name: 'Changer de compte' });
}

/**
 * The **active** account, i.e. the switcher's summary. The menu below it
 * lists every account the trader owns, so asserting on the whole switcher
 * would confuse "this account is loaded" with "this account is offered".
 */
function activeAccountLabel(page: Page) {
  return page.getByTestId('workstation-account-switcher').locator('summary');
}

async function publicIdOf(accountId: string): Promise<string> {
  const db = createFixtureDb();
  try {
    const row = await db
      .selectFrom('app.trading_accounts')
      .select('public_id')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    return row.public_id;
  } finally {
    await db.destroy();
  }
}

test.describe('WariX account selection', { tag: ['@trade'] }, () => {
  let second: E2eFixtureAccount;
  let foreign: E2eFixtureAccount;

  test.beforeEach(async ({ tradeAccount }) => {
    const db = createFixtureDb();
    try {
      // A second account for the SAME trader, and one belonging to a
      // different trader entirely. `second` keeps its own creating user in
      // the fixture record so teardown removes that now-account-less user
      // rather than the trade user still under test — same pattern as
      // hub.spec.ts's second-account describes.
      second = await createFixtureAccount(db, 'w1-second');
      await attachFixtureAccountToUser(db, second, tradeAccount.userId);
      foreign = await createFixtureAccount(db, 'w1-foreign');
    } finally {
      await db.destroy();
    }
  });

  test.afterEach(async () => {
    const db = createFixtureDb();
    try {
      await deleteFixtureAccount(db, second);
      await deleteFixtureAccount(db, foreign);
    } finally {
      await db.destroy();
    }
  });

  test(
    'switches A1 → A2 → A1 by document navigation, with no stale account context',
    { tag: ['@critical'] },
    async ({ page, tradeAccount }) => {
      await login(page, tradeAccount.email, tradeAccount.password);
      await openWorkstation(page, `/trade?account=${tradeAccount.accountId}`);
      await expect(page).toHaveURL(new RegExp(`account=${tradeAccount.accountId}`));
      await expect(activeAccountLabel(page)).toContainText(tradeAccount.accountPublicId);

      // A1 is the 10K fixture; A2 is a 5K account. Equity comes from the
      // websocket snapshot, not from the server-rendered switcher list, so
      // asserting it is how this test proves the *realtime session* follows
      // the account (W1 §27) rather than just the label changing.
      const equity = page.getByTestId('workstation-metrics');
      await expect(equity).toContainText('10000.00 USD');

      // Switching is an ordinary anchor (UX-NAV-001) — assert the element
      // itself, then that following it really replaced the document.
      const menu = await openAccountSwitcher(page);
      const target = menu.locator(`a[href="/trade?account=${second.accountId}"]`);
      await expect(target).toHaveCount(1);

      await Promise.all([page.waitForURL(`**/trade?account=${second.accountId}`), target.click()]);
      await expect(page.getByText('Connecté')).toBeVisible({ timeout: 30_000 });

      // The loaded account is A2 — A1 is only offered, never active.
      await expect(activeAccountLabel(page)).toContainText(await publicIdOf(second.accountId));
      await expect(activeAccountLabel(page)).not.toContainText(tradeAccount.accountPublicId);
      // The new websocket session is subscribed to A2: A2's own equity, and
      // no trace of A1's, is what the status bar reports.
      await expect(equity).toContainText('5000.00 USD');
      await expect(equity).not.toContainText('10000.00 USD');

      // …and back again.
      const backMenu = await openAccountSwitcher(page);
      const back = backMenu.locator(`a[href="/trade?account=${tradeAccount.accountId}"]`);
      await Promise.all([
        page.waitForURL(`**/trade?account=${tradeAccount.accountId}`),
        back.click(),
      ]);
      await expect(page.getByText('Connecté')).toBeVisible({ timeout: 30_000 });
      await expect(activeAccountLabel(page)).toContainText(tradeAccount.accountPublicId);
      await expect(equity).toContainText('10000.00 USD');
    },
  );

  test(
    'refuses a foreign account id and never discloses its state',
    { tag: ['@critical'] },
    async ({ page, tradeAccount }) => {
      const foreignPublicId = await publicIdOf(foreign.accountId);
      await login(page, tradeAccount.email, tradeAccount.password);
      await openWorkstation(page, `/trade?account=${foreign.accountId}`);

      // Safe fallback to one of the trader's OWN accounts. The requested id
      // is still echoed in the URL — the trader typed it — but nothing about
      // trader B's account is loaded, named or disclosed.
      await expect(activeAccountLabel(page)).not.toContainText(foreignPublicId);
      const ownPublicIds = await Promise.all([
        publicIdOf(tradeAccount.accountId),
        publicIdOf(second.accountId),
      ]);
      const activeLabel = (await activeAccountLabel(page).innerText()).trim();
      expect(ownPublicIds.some((id) => activeLabel.includes(id))).toBe(true);

      // Trader B's public identity, status, balance and risk appear nowhere.
      const body = await page.locator('body').innerText();
      expect(body).not.toContain(foreignPublicId);

      // The switcher offers only accounts this trader owns — no link, and so
      // no websocket session, can reach the foreign account.
      const menu = await openAccountSwitcher(page);
      await expect(menu.locator(`a[href*="${foreign.accountId}"]`)).toHaveCount(0);
      await expect(menu.getByText(foreignPublicId)).toHaveCount(0);
    },
  );
});

test.describe('WariX program identity', { tag: ['@trade'] }, () => {
  let environment: PayoutFixtureEnvironment;
  let performance: PayoutAccountFixture;

  test.beforeAll(async () => {
    environment = {
      databaseUrl: process.env.DATABASE_URL as string,
      supabaseUrl: process.env.SUPABASE_URL as string,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    };
    // Seeds a WARIBA_PERFORMANCE account plus the WARIBA_ONE evaluation
    // account it graduated from — one trader, both programs.
    performance = await seedPayoutAccount(environment);
  });

  test.afterAll(async () => {
    await deletePayoutAccount(environment, performance);
  });

  test(
    'names the real program for both an Evaluation and a Performance account',
    { tag: ['@critical'] },
    async ({ page }) => {
      await login(page, performance.email, performance.password);

      await openWorkstation(page, `/trade?account=${performance.accountId}`);
      // W0 §3A.4: this said "WARIBA ONE" for every account before W1.
      await expect(activeAccountLabel(page)).toContainText('WARIBA Performance');
      await expect(page.getByRole('tab', { name: 'Payout' })).toBeVisible();

      await openWorkstation(page, `/trade?account=${performance.evaluationAccountId}`);
      await expect(activeAccountLabel(page)).toContainText('WARIBA ONE');
      await expect(activeAccountLabel(page)).not.toContainText('WARIBA Performance');

      // The two are told apart explicitly in the switcher, not only by name.
      const menu = await openAccountSwitcher(page);
      await expect(menu.getByText('Évaluation')).toBeVisible();
      await expect(menu.getByText('Performance', { exact: true })).toBeVisible();
    },
  );
});

test.describe('WariX workstation shell', { tag: ['@trade'] }, () => {
  test('places the rail, status bar, chart and dock in the workstation grid', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    const rail = page.getByTestId('workstation-nav-rail');
    await expect(rail).toBeVisible();
    for (const label of ['Trade', 'Hub', 'Comptes', 'Payouts', 'Plus']) {
      await expect(rail.getByRole('link', { name: label })).toBeVisible();
    }
    await expect(rail.getByRole('link', { name: 'Trade' })).toHaveAttribute('aria-current', 'page');

    // The 214px header stack the W0 audit measured is gone.
    const statusHeight = await page
      .getByTestId('workstation-status-bar')
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(statusHeight).toBeLessThanOrEqual(56);

    await expect(page.getByTestId('workstation-dock')).toBeVisible();

    // No document scroll on a desktop workstation.
    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(doc.scrollWidth).toBe(doc.clientWidth);
    expect(doc.scrollHeight).toBe(doc.clientHeight);
  });

  test('grows the chart with the viewport instead of pinning it at 332px', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);

    const heights: number[] = [];
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
    ]) {
      await page.setViewportSize(viewport);
      await openWorkstation(page);
      const canvas = page
        .getByRole('group', { name: /Graphique/ })
        .locator('canvas')
        .first();
      await expect(canvas).toBeVisible({ timeout: 30_000 });
      const box = await canvas.boundingBox();
      heights.push(Math.round(box?.height ?? 0));
    }

    // W0: 332 · 332 · 332. The invariant is monotonic growth with viewport
    // height, not any one exact number.
    expect(heights[0]).toBeGreaterThan(332);
    expect(heights[1]).toBeGreaterThan(heights[0] as number);
    expect(heights[2]).toBeGreaterThan(heights[1] as number);
  });

  test('keeps the account switcher and rail keyboard-operable with visible focus', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    const railLink = page.getByTestId('workstation-nav-rail').getByRole('link', { name: 'Hub' });
    await railLink.focus();
    await expect(railLink).toBeFocused();
    const outline = await railLink.evaluate(
      (el) => getComputedStyle(el, ':focus-visible').outlineStyle,
    );
    expect(outline).not.toBe('none');

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
  });
});

const MOBILE_WIDTHS = [320, 360, 390, 412, 430];

test.describe('WariX mobile shell', { tag: ['@trade', '@mobile'] }, () => {
  test('never lets the workstation widen the document', async ({ page, tradeAccount }) => {
    await login(page, tradeAccount.email, tradeAccount.password);

    for (const width of MOBILE_WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      await openWorkstation(page);
      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      // W0 measured scrollWidth 425 against clientWidth 390 — the dock's
      // six-button tab strip. It now scrolls inside its own box.
      expect(doc.scrollWidth, `document overflows at ${width}px`).toBe(doc.clientWidth);
    }
  });

  test('puts the chart above the fold, not below a full watchlist', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation(page);

    const canvas = page
      .getByRole('group', { name: /Graphique/ })
      .locator('canvas')
      .first();
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    const box = await canvas.boundingBox();

    // W0: the chart started at y=751 on an 844px viewport, below a 395px
    // watchlist block and a 304px header.
    expect(box?.y ?? Infinity).toBeLessThan(200);
    expect(box?.height ?? 0).toBeGreaterThan(300);

    // Compact account context, the chart, and an execution entry action —
    // all reachable without scrolling past a market list.
    await expect(page.getByTestId('workstation-status-bar')).toBeInViewport();
    await expect(page.getByTestId('mobile-market-trigger')).toBeInViewport();
    await expect(page.getByRole('button', { name: /^Trader / })).toBeInViewport();
  });

  test('exposes the existing market list through the mobile sheet', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation(page);

    await page.getByTestId('mobile-market-trigger').click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Watchlist')).toBeVisible();
    await sheet.getByRole('button', { name: /GBPUSD/ }).click();

    // Selecting from the sheet changes the workspace and closes the sheet.
    await expect(page.getByTestId('mobile-market-trigger')).toContainText('GBPUSD');
    await expect(page.getByRole('group', { name: /Graphique GBPUSD/ })).toBeVisible();
  });
});
