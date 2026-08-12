import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W2 acceptance: Market Navigator, trading dock,
 * layout persistence and the mobile presentation.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function openWorkstation(page: Page) {
  await page.goto('/trade');
  await expect(page.getByTestId('workstation-status-bar')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
    'data-connection',
    'open',
    { timeout: 30_000 },
  );
}

test.describe('WariX Market Navigator', { tag: ['@trade'] }, () => {
  test('renders the account’s real catalogue, categorised and searchable', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    const navigator = page.getByTestId('market-navigator').first();
    await expect(navigator).toBeVisible();

    // Categories come from app.symbol_specs.asset_class, reaching the browser
    // through the symbol-spec payload.
    for (const heading of ['Forex', 'Métaux', 'Indices']) {
      await expect(navigator.getByRole('heading', { name: heading })).toBeVisible();
    }
    // No empty future category, and no unimplemented instrument (W2 §6).
    await expect(navigator.getByRole('heading', { name: /Énergies/i })).toHaveCount(0);
    await expect(navigator.getByText('SPX500')).toHaveCount(0);
    await expect(navigator.getByText('WTIUSD')).toHaveCount(0);

    // No fabricated performance column until history exists (W2 §7).
    await expect(navigator.getByText('%')).toHaveCount(0);

    const search = page.getByTestId('market-search').first();
    await search.fill('xau');
    await expect(navigator.getByRole('button', { name: /^XAUUSD/ })).toBeVisible();
    await expect(navigator.getByRole('button', { name: /^EURUSD/ })).toHaveCount(0);
    await search.fill('zzz');
    await expect(navigator.getByText(/Aucun instrument ne correspond/)).toBeVisible();
    await search.fill('');
  });

  test('selecting a symbol moves the chart and the execution context', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    await page
      .getByTestId('market-navigator')
      .first()
      .getByRole('button', { name: /^XAUUSD/ })
      .click();
    await expect(page.getByRole('group', { name: 'Graphique XAUUSD' })).toBeVisible();
    await expect(page.getByTestId('execution-market-header')).toContainText('XAUUSD');
  });

  test('a favorite persists across a reload and survives corrupt storage', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    await page.getByRole('button', { name: 'Ajouter NAS100 aux favoris' }).first().click();
    await expect(page.getByRole('heading', { name: 'Favoris' })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('workstation-status-bar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Favoris' })).toBeVisible();

    // Corrupt the stored preferences: the workstation must fall back to
    // defaults rather than render a broken layout (W2 §10/§14).
    await page.evaluate(() =>
      window.localStorage.setItem('wariba.workstation.layout', '{ not json at all'),
    );
    await page.reload();
    await expect(page.getByTestId('workstation-status-bar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('market-navigator').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Favoris' })).toHaveCount(0);
  });
});

test.describe('WariX trading dock', { tag: ['@trade'] }, () => {
  test('has exactly the final membership, with no Payout and no Journal', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    const tabs = page.getByTestId('workstation-dock').getByRole('tab');
    await expect(tabs).toHaveCount(5);
    for (const name of ['Positions', 'Orders', 'Trades', 'Alerts', 'Account']) {
      await expect(page.getByRole('tab', { name: new RegExp(`^${name}`) })).toBeVisible();
    }
    await expect(page.getByRole('tab', { name: 'Payout' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Journal' })).toHaveCount(0);
  });

  test('Orders keeps both server states and Trades keeps fill truth', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    // Give the intelligent dock real row-level content before inspecting its
    // panel body. WX1 intentionally keeps an empty active panel at 48px and
    // hides that empty body; a filled-and-closed market order supplies both
    // recent order truth and the close-fill truth used by Trades.
    await page.getByTestId('execution-submit-buy').click();
    await page.getByRole('tab', { name: /^Positions/ }).click();
    const position = page.getByRole('cell', { name: 'EURUSD · Achat', exact: true });
    await expect(position).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Fermer EURUSD · Achat' }).click();
    await expect(position).toHaveCount(0);

    await page.getByRole('tab', { name: /^Orders/ }).click();
    await expect(page.getByRole('button', { name: 'En attente' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Récents' })).toBeVisible();
    const ordersTable = page.getByRole('tabpanel').locator('tbody');
    await expect(ordersTable.getByRole('cell', { name: 'Aucun ordre en attente.' })).toBeVisible();
    await page.getByRole('button', { name: 'Récents' }).click();
    await expect(ordersTable.getByRole('cell', { name: 'EURUSD' }).first()).toBeVisible();

    await page.getByRole('tab', { name: /^Trades/ }).click();
    // Fill-driven evidence, not order truth (W2 §19).
    for (const column of ['PnL net', 'PnL éligible', 'Durée']) {
      await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
    }

    await page.getByRole('tab', { name: /^Alerts/ }).click();
    const dock = page.getByTestId('workstation-dock');
    await expect(dock).toHaveAttribute('data-empty', 'true');
    await expect(dock.getByText('Aucune activité')).toBeVisible();
    await expect.poll(async () => Math.round((await dock.boundingBox())?.height ?? 0)).toBe(48);

    await page.getByRole('tab', { name: /^Account/ }).click();
    // Scoped to the dock: the public id also appears in the status bar's
    // account switcher, which is not what this asserts.
    const account = dock;
    await expect(account.getByText(tradeAccount.accountPublicId)).toBeVisible();
    await expect(account.getByText(/WARIBA ONE/)).toBeVisible();
  });

  test('collapse returns vertical space to the chart, and resize persists', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    // A single live row expands the intelligent dock once and makes the
    // populated-track resize separator available. Empty dock state is fixed
    // at 48px by WX1 and is deliberately not resizable.
    await page.getByTestId('execution-submit-buy').click();
    await page.getByRole('tab', { name: /^Positions/ }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('dock-resize')).toBeVisible();

    const canvas = page
      .getByRole('group', { name: /Graphique/ })
      .locator('canvas')
      .first();
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    const before = (await canvas.boundingBox())?.height ?? 0;

    await page.getByTestId('workstation-dock-collapse').click();
    await expect
      .poll(async () => (await canvas.boundingBox())?.height ?? 0, { timeout: 10_000 })
      .toBeGreaterThan(before);
    // The active surface and its counts stay legible while collapsed.
    await expect(page.getByRole('tab', { name: /^Positions/ })).toBeVisible();

    await page.getByTestId('workstation-dock-collapse').click();
    await expect
      .poll(async () => (await canvas.boundingBox())?.height ?? 0, { timeout: 10_000 })
      .toBeCloseTo(before, -1);

    // Keyboard resize on the separator, then prove the value persisted.
    const separator = page.getByTestId('dock-resize');
    await separator.focus();
    const initial = Number(await separator.getAttribute('aria-valuenow'));
    await separator.press('ArrowUp');
    await expect
      .poll(async () => Number(await separator.getAttribute('aria-valuenow')))
      .toBeGreaterThan(initial);
    const resized = Number(await separator.getAttribute('aria-valuenow'));

    await page.reload();
    await expect(page.getByTestId('workstation-status-bar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('dock-resize')).toHaveAttribute('aria-valuenow', String(resized));
  });

  test('the navigator collapses, restores, and resizes by keyboard', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    const canvas = page
      .getByRole('group', { name: /Graphique/ })
      .locator('canvas')
      .first();
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    const before = (await canvas.boundingBox())?.width ?? 0;

    await page.getByTestId('navigator-collapse').click();
    // Collapsing genuinely returns the track's width to the chart (W2 §12).
    await expect
      .poll(async () => (await canvas.boundingBox())?.width ?? 0, { timeout: 10_000 })
      .toBeGreaterThan(before);
    await expect(page.getByTestId('market-navigator')).toHaveCount(0);

    const restore = page.getByTestId('navigator-restore');
    await expect(restore).toBeVisible();
    await restore.click();
    await expect(page.getByTestId('market-navigator').first()).toBeVisible();

    const separator = page.getByTestId('navigator-resize');
    await separator.focus();
    const initial = Number(await separator.getAttribute('aria-valuenow'));
    await separator.press('ArrowRight');
    await expect
      .poll(async () => Number(await separator.getAttribute('aria-valuenow')))
      .toBeGreaterThan(initial);
    // Clamped at the published maximum, never beyond.
    await separator.press('End');
    expect(Number(await separator.getAttribute('aria-valuenow'))).toBe(
      Number(await separator.getAttribute('aria-valuemax')),
    );
  });

  test('no new critical or serious accessibility violations', async ({ page, tradeAccount }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);
    await page.getByRole('tab', { name: /^Alerts/ }).click();

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
  });
});

const MOBILE_WIDTHS = [320, 360, 390, 412, 430];

test.describe('WariX W2 mobile', { tag: ['@trade', '@mobile'] }, () => {
  test('neither the document nor the status bar scrolls horizontally', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    const failures: string[] = [];

    for (const width of MOBILE_WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      await openWorkstation(page);
      // Measure the bar *loaded*. Before the first account snapshot every
      // figure is an em dash and the risk trigger is not mounted — a bar
      // ~80px narrower than the one a trader actually sees, and narrow
      // enough to fit 320px while the real one overflowed it. Waiting for a
      // real figure and the risk trigger is what makes this gate measure the
      // widest state the bar ever reaches rather than its emptiest.
      await expect(page.getByTestId('workstation-metrics')).toContainText(/\d/, {
        timeout: 30_000,
      });
      await expect(
        page
          .getByTestId('workstation-status-bar')
          .getByRole('button', { name: 'Détail des règles de risque' }),
      ).toBeVisible({ timeout: 30_000 });

      const measured = await page.evaluate(() => {
        const bar = document.querySelector('[data-testid="workstation-status-bar"]');
        const limit = document.documentElement.clientWidth;
        // Name the widest offenders so a regression says *what* overflowed
        // rather than only that something did.
        const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
          .filter((el) => Math.round(el.getBoundingClientRect().right) > limit + 1)
          .slice(0, 5)
          .map((el) => {
            const rect = el.getBoundingClientRect();
            const id = el.dataset.testid ? `[${el.dataset.testid}]` : '';
            return `${el.tagName.toLowerCase()}${id} right=${Math.round(rect.right)} w=${Math.round(rect.width)}`;
          });
        // Per-child widths of the bar: when it overflows, this says which
        // part is responsible rather than only by how much.
        const barChildren = [...(bar?.children ?? [])].map((child) => {
          const el = child as HTMLElement;
          const rect = el.getBoundingClientRect();
          const id = el.dataset.testid ?? el.tagName.toLowerCase();
          return `${id}=${Math.round(rect.width)}`;
        });
        return {
          documentScrollWidth: document.documentElement.scrollWidth,
          documentClientWidth: limit,
          barScrollWidth: bar?.scrollWidth ?? 0,
          barClientWidth: bar?.clientWidth ?? 0,
          offenders,
          barChildren,
        };
      });

      if (measured.documentScrollWidth !== measured.documentClientWidth) {
        failures.push(
          `document ${width}px: scroll ${measured.documentScrollWidth} > client ${measured.documentClientWidth} — ${measured.offenders.join(' | ') || 'no element past the edge'}`,
        );
      }
      // W2 §25 — the W1 limitation: reaching Notifications must not require
      // scrolling the bar sideways.
      if (measured.barScrollWidth > measured.barClientWidth) {
        failures.push(
          `status bar ${width}px: scroll ${measured.barScrollWidth} > client ${measured.barClientWidth} — ${measured.barChildren.join(' ')}`,
        );
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('the dock is a sheet, and only one dock presentation is mounted', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation(page);

    // Chart-first: after viewport resolution no dock consumes the viewport
    // behind the chart, and the desktop presentation is gone rather than
    // hidden (W2 §27).
    await expect(page.getByTestId('workstation-dock')).toHaveCount(0);

    const canvas = page
      .getByRole('group', { name: /Graphique/ })
      .locator('canvas')
      .first();
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    expect((await canvas.boundingBox())?.y ?? Infinity).toBeLessThan(200);

    await page.getByTestId('mobile-dock-trigger').click();
    await expect(page.getByTestId('workstation-dock')).toHaveCount(1);
    await expect(page.getByRole('tab', { name: /^Positions/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('workstation-dock')).toHaveCount(0);
  });

  test('the Markets sheet is the same navigator, with search and favorites', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation(page);

    await page.getByTestId('mobile-market-trigger').click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByTestId('market-search')).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Forex' })).toBeVisible();

    await sheet.getByTestId('market-search').fill('nas');
    await sheet.getByRole('button', { name: /^NAS100/ }).click();

    // Selecting closes the sheet and moves the workspace.
    await expect(page.getByTestId('mobile-market-trigger')).toContainText('NAS100');
    await expect(page.getByRole('group', { name: 'Graphique NAS100' })).toBeVisible();
  });
});
