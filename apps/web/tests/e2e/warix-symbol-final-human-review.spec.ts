import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Browser, Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-symbol-final-human-review');
const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function settleTrade(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
    'data-connection',
    'open',
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('chart-history-status')).toHaveAttribute(
    'data-history-status',
    'ready',
    { timeout: 60_000 },
  );
  await page.waitForTimeout(500);
}

async function collapseDock(page: Page): Promise<void> {
  const toggle = page.getByTestId('workstation-dock-collapse');
  if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
}

async function recordMotion(
  browser: Browser,
  account: { email: string; password: string },
): Promise<void> {
  const rawVideoDir = mkdtempSync(join(tmpdir(), 'warix-symbol-motion-'));
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: rawVideoDir, size: { width: 1440, height: 900 } },
  });
  try {
    const page = await context.newPage();
    const video = page.video();
    if (!video) throw new Error('motion evidence recorder unavailable');

    await signIn(page, account.email, account.password);
    await page.goto('/trade');
    await settleTrade(page);
    await collapseDock(page);

    for (const destination of ['markets', 'trade', 'activity', 'alerts'] as const) {
      const key = page.getByTestId(`utility-${destination}`);
      await key.hover();
      await page.waitForTimeout(420);
      await key.click();
      await page.waitForTimeout(620);
      if (destination === 'markets' || destination === 'trade') {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(260);
      }
    }

    await page.close();
    await video.saveAs(resolve(OUT_DIR, 'RIGHT_RAIL_SYMBOL_MICRO_MOTION.webm'));
  } finally {
    await context.close();
    rmSync(rawVideoDir, { recursive: true, force: true });
  }
}

async function quote(page: Page): Promise<{ bid: number; ask: number }> {
  const bid = Number((await page.getByTestId('execution-bid').textContent())?.match(/[\d.]+/)?.[0]);
  const ask = Number((await page.getByTestId('execution-ask').textContent())?.match(/[\d.]+/)?.[0]);
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) throw new Error('no live quote');
  return { bid, ask };
}

async function openProtectedLong(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Trader/ }).click();
  await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
  const { ask } = await quote(page);
  await page.getByTestId('stop-loss-input').fill((ask - 0.004).toFixed(5));
  await page.getByTestId('take-profit-input').fill((ask + 0.004).toFixed(5));
  await page.getByTestId('execution-submit-buy').click();
  await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1_200);
}

async function centreY(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('expected a rendered trade object');
  return box.y + box.height / 2;
}

async function compressPriceScale(page: Page): Promise<void> {
  const plot = await page.getByTestId('chart-track').boundingBox();
  if (!plot) throw new Error('expected chart plot');
  await page.mouse.move(plot.x + plot.width - 24, plot.y + plot.height / 2);
  for (let step = 0; step < 7; step += 1) {
    await page.mouse.wheel(0, -140);
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(800);
}

/** Returns the viewport Y occupied by the authoritative preview line/label. */
async function dragLongStopInvalid(page: Page): Promise<number> {
  const chip = page.getByTestId('chart-level-chip-stop_loss');
  const entryY = await centreY(page.getByTestId('chart-position-chip'));
  const box = await chip.boundingBox();
  if (!box) throw new Error('expected stop-loss chip');
  const x = box.x + box.width / 2;
  const from = box.y + box.height / 2;
  const previewY = Math.max(entryY - 80, 100);
  await page.mouse.move(x, from);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(x, from + ((previewY - from) * step) / 20);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(500);
  return previewY;
}

test.describe('WariX symbol system — final human review corrections', () => {
  test.beforeAll(() => mkdirSync(OUT_DIR, { recursive: true }));

  test('A–C — desktop rail idle, one active, and native specimen', async ({
    browser,
    page,
    tradeAccount,
  }) => {
    test.setTimeout(300_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settleTrade(page);
    await collapseDock(page);

    const rail = page.getByTestId('right-utility-rail');
    await expect(rail.locator('[data-warix-symbol]')).toHaveCount(7);
    expect(
      await rail
        .locator('button')
        .evaluateAll((buttons) =>
          buttons.every((button) => button.getAttribute('aria-pressed') === 'false'),
        ),
      'idle evidence must contain no active destination',
    ).toBe(true);
    await page.mouse.move(24, 500);
    await page.screenshot({ path: resolve(OUT_DIR, 'A-1440-right-rail-idle.png') });

    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-markets')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await page.mouse.move(24, 500);
    await page.waitForTimeout(260);
    await page.screenshot({ path: resolve(OUT_DIR, 'B-1440-markets-active-material.png') });

    const contained = await rail.locator('button').evaluateAll((buttons) =>
      buttons.every((button) => {
        const canvas = button.querySelector<SVGGElement>('.warix-symbol__canvas');
        if (!canvas) return false;
        const keyBox = button.getBoundingClientRect();
        const canvasBox = canvas.getBoundingClientRect();
        return (
          canvasBox.left >= keyBox.left &&
          canvasBox.right <= keyBox.right &&
          canvasBox.top >= keyBox.top &&
          canvasBox.bottom <= keyBox.bottom
        );
      }),
    );
    expect(contained).toBe(true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const durations = await page.getByTestId('utility-markets').evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.transitionDuration, style.animationDuration];
    });
    expect(durations.every((duration) => Number.parseFloat(duration) <= 0.001)).toBe(true);

    await page.goto('/catalog');
    const nativeFamily = page.getByTestId('warix-symbol-family-native');
    await expect(nativeFamily).toBeVisible();
    await nativeFamily.screenshot({ path: resolve(OUT_DIR, 'C-native-seven-symbol-specimen.png') });

    await recordMotion(browser, tradeAccount);
  });

  test('D–E — compact header Search action and mobile destination reuse @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(180_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settleTrade(page);

    const search = page.getByTestId('chart-symbol-search-trigger');
    await expect(search).toContainText('EURUSD');
    await expect(search.locator('[data-warix-action="search"]')).toHaveCount(1);
    await expect(search.locator('[data-warix-symbol="markets"]')).toHaveCount(0);
    await page.getByTestId('chart-toolbar').screenshot({
      path: resolve(OUT_DIR, 'D-390-chart-header-eurusd-search.png'),
    });

    const mobileRail = page.getByTestId('mobile-action-rail');
    for (const destination of ['trade', 'activity', 'calendar', 'help']) {
      await expect(mobileRail.locator(`[data-warix-symbol="${destination}"]`)).toHaveCount(1);
    }
    await mobileRail.screenshot({
      path: resolve(OUT_DIR, 'E-390-mobile-destination-reuse.png'),
    });
  });

  test('F — invalid long SL card clears its own active preview label @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(300_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settleTrade(page);
    await openProtectedLong(page);
    await compressPriceScale(page);
    const previewY = await dragLongStopInvalid(page);

    const card = page.getByTestId('chart-drag-preview');
    await expect(card).toHaveAttribute('data-invalid', 'true');
    const cardBox = await card.boundingBox();
    if (!cardBox) throw new Error('expected invalid-protection card');
    const previewBand = { top: previewY - 14, bottom: previewY + 14 };
    expect(
      cardBox.y + cardBox.height <= previewBand.top || cardBox.y >= previewBand.bottom,
      'validation card overlaps active SL preview line/label band',
    ).toBe(true);

    await page.screenshot({
      path: resolve(OUT_DIR, 'F-390-invalid-sl-preview-collision-free.png'),
    });
    await page.mouse.up();
  });
});
