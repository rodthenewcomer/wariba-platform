import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W4 human-review visual evidence.
 *
 * Captures the states a reviewer asked to see, and nothing else: no product
 * behaviour, no pixel assertions, and **not** part of any gate. Run explicitly:
 *
 *   pnpm --filter @wariba/web exec playwright test \
 *     tests/e2e/warix-w4-evidence.spec.ts --project=desktop
 *
 * W3 §86's integrity rule applies unchanged: a connected socket is not a
 * hydrated workstation, so every shot below waits for connection → symbol specs
 * → a real quote before it fires. A screenshot of an Execution Center whose
 * bid still reads "—" would misrepresent the milestone.
 *
 * The blocked-entry and rejection states are **produced, not caught**. Waiting
 * for a risk breach to happen naturally is not a test, it is a hope; the risk
 * snapshot is rewritten on the wire instead, exactly as W3's evidence spec
 * withholds a history frame. The exposure rejection is the one exception — it
 * is genuinely provoked by asking for 1.00 lot, because a real server refusal
 * with a real code is better evidence than a synthesised one.
 *
 * The manifest is part of the evidence. Two numbers in it answer the questions
 * a screenshot cannot:
 *
 * - **`actionsWithinFirstScreen`** — the specific pre-W4 defect. Three stacked
 *   `Alert` cards over an `OrderTicket` card over a `Guardian` card pushed the
 *   Buy/Sell buttons off the bottom of a 320px column whenever a single notice
 *   was showing, so a trader had to scroll a trading panel to reach the trade.
 *   This records where the actions actually sit, with a notice on screen.
 * - **`sideActionContrast`** — measured from the live DOM, not asserted from
 *   the token file. The first build of this panel shipped 3.1:1 text on the
 *   Sell action (see the B5 commit); a number a reviewer can read beats a claim
 *   that it was fixed.
 */
const OUT_DIR = 'test-results/warix-w4-review';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/** WCAG 2 relative luminance, from an `rgb(...)` computed style. */
const CONTRAST_IN_PAGE = (selector: string): number | null => {
  const element = document.querySelector(selector);
  if (!element) return null;
  const parse = (value: string): [number, number, number] | null => {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  };
  const luminance = (rgb: [number, number, number]): number => {
    const channel = (raw: number): number => {
      const c = raw / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  };
  const style = getComputedStyle(element);
  const foreground = parse(style.color);
  const background = parse(style.backgroundColor);
  if (!foreground || !background) return null;
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
};

test.describe('WariX W4 review evidence', { tag: ['@warix-w4-evidence'] }, () => {
  test('captures the Execution Center in its default, pending, blocked and refused states', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const openWorkstation = async (): Promise<void> => {
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(page.getByText('Pas 0.0100 · Min 0.0100 · Max 10.0000')).toBeVisible({
        timeout: 30_000,
      });
      // A real quote, not a dash: the panel's whole point is the two prices.
      await expect(page.getByTestId('execution-bid')).not.toHaveText('—', { timeout: 30_000 });
    };

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
    };

    const shotPanel = async (name: string): Promise<void> => {
      await page.getByTestId('execution-center').screenshot({ path: `${OUT_DIR}/${name}.png` });
    };

    /** Where the side actions sit, as a fraction of the viewport height. */
    const actionsPosition = async (): Promise<{ bottom: number; viewport: number }> => {
      const box = await page.getByTestId('execution-actions').boundingBox();
      const viewport = page.viewportSize()?.height ?? 0;
      return { bottom: Math.round(box ? box.y + box.height : 0), viewport };
    };

    // ---- 1920×1080, the whole workstation with the panel in place ---------
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openWorkstation();
    await shot('1920x1080-workstation-execution-center');
    await shotPanel('panel-1920-default-market');

    // ---- 1440×900, the compact 320px column, which is the real constraint --
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation();
    await shot('1440x900-workstation-execution-center');
    const defaultActions = await actionsPosition();

    // ---- Measured contrast on the two saturated actions --------------------
    // Taken here, while they are *enabled*. Measuring after the blocked-entry
    // capture below reads the disabled palette instead — which WCAG exempts
    // from the contrast minimum, so the number would look alarming and mean
    // nothing. (The first run of this spec made exactly that mistake.)
    const sideActionContrast = {
      buy: await page.evaluate(CONTRAST_IN_PAGE, '[data-testid="execution-submit-buy"]'),
      sell: await page.evaluate(CONTRAST_IN_PAGE, '[data-testid="execution-submit-sell"]'),
    };

    // ---- Pending order: trigger price + the per-side protection preview ----
    await page.getByRole('radio', { name: 'Limit' }).click();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('trigger-price-input').fill((bid - 0.005).toFixed(5));
    await page.getByTestId('stop-loss-input').fill((bid - 0.008).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.005).toFixed(5));
    await expect(page.getByTestId('protection-preview')).toBeVisible();
    await shotPanel('panel-1440-limit-with-protection-preview');
    const pendingActions = await actionsPosition();

    // ---- A real server rejection, with a notice on screen ------------------
    await page.getByRole('radio', { name: 'Market' }).click();
    // 1.00 lot is inside EURUSD's own bounds but blows the 0.60 combined forex
    // exposure bucket on a fresh 10K account — the server's own refusal.
    await page.getByLabel('Quantité (lots)').fill('1.00');
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('execution-rejection')).toBeVisible({ timeout: 30_000 });
    await shotPanel('panel-1440-server-rejection');
    // The measurement that matters: the actions are still on the first screen
    // *while a notice is showing*, which is the state the pre-W4 stack failed.
    const rejectedActions = await actionsPosition();
    const rejectionCode = await page.getByTestId('execution-rejection').textContent();

    // ---- Blocked entry, produced on the wire -------------------------------
    // The account snapshot's own risk verdict is rewritten to `breached`; the
    // panel reads that verdict rather than deriving one, so this is the exact
    // state a genuinely breached account would show.
    await page.routeWebSocket(/\/ws/, (ws) => {
      const server = ws.connectToServer();
      // Only the server→client direction is filtered, for the same reason
      // warix-w3-evidence.spec.ts states: installing an `onMessage` handler on
      // the client→server direction makes this proxy responsible for
      // forwarding the `subscribe` frame the client sends the instant its
      // socket opens, which can precede the upstream connection.
      server.onMessage((message) => {
        const text = typeof message === 'string' ? message : message.toString();
        if (text.includes('"account.snapshot"')) {
          const envelope = JSON.parse(text) as { payload: { risk: { status: string } | null } };
          if (envelope.payload.risk) {
            envelope.payload.risk.status = 'breached';
            ws.send(JSON.stringify(envelope));
            return;
          }
        }
        ws.send(message);
      });
    });
    await openWorkstation();
    await expect(page.getByTestId('execution-gate')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('execution-submit-buy')).toBeDisabled();
    await shotPanel('panel-1440-entry-blocked-hard-breach');
    const blockedMessage = await page.getByTestId('execution-gate').textContent();

    // ---- 390×844, the mobile sheet -----------------------------------------
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
      timeout: 30_000,
    });
    await shot('390x844-chart-first-before-execution-sheet');
    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await expect(page.getByTestId('execution-bid')).not.toHaveText('—', { timeout: 30_000 });
    await shot('390x844-execution-sheet');
    const mobileCopies = await page.getByTestId('execution-center').count();

    writeFileSync(
      `${OUT_DIR}/evidence-manifest.json`,
      `${JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          note: 'Screenshots are of the shipped Execution Center against a live realtime process. The blocked state is produced by rewriting the account snapshot risk verdict on the wire; the rejection is a genuine server refusal.',
          /**
           * The pre-W4 defect, measured. `bottom` is the y coordinate of the
           * bottom of the side actions; anything at or under `viewport` means
           * the trade is reachable without scrolling the trading panel.
           */
          actionsWithinFirstScreen: {
            default: defaultActions,
            limitWithProtectionPreview: pendingActions,
            withServerRejectionNotice: rejectedActions,
          },
          /** Measured from the live DOM. WCAG AA text minimum is 4.5:1. */
          sideActionContrast,
          serverRejection: rejectionCode?.replace(/\s+/g, ' ').trim(),
          blockedEntryMessage: blockedMessage?.replace(/\s+/g, ' ').trim(),
          /** W4 §69 — one mount point per presentation, never both. */
          executionCentersMountedOnMobile: mobileCopies,
        },
        null,
        2,
      )}\n`,
    );

    // Evidence only — this merely proves the run reached the end.
    expect(true).toBe(true);
  });
});
