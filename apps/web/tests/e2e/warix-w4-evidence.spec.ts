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
      // Rendered from the `symbol_specs` payload, so it cannot appear before
      // the specs land. Anchored on the test id rather than the copy: visual
      // closure §7 compacted the wording, and a readiness gate should not
      // break every time a sentence is shortened.
      await expect(page.getByTestId('quantity-bounds')).toBeVisible({ timeout: 30_000 });
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

    // ---- 1366×768, the tightest supported desktop --------------------------
    await page.setViewportSize({ width: 1366, height: 768 });
    await openWorkstation();
    await shot('1366x768-workstation-execution-center');
    const narrowDesktopActions = await actionsPosition();

    // ---- 390×844 mobile ----------------------------------------------------
    const openMobileSheet = async (): Promise<void> => {
      await page.getByRole('button', { name: /^Trader/ }).click();
      await expect(page.getByTestId('execution-center')).toBeVisible();
      await expect(page.getByTestId('execution-bid')).not.toHaveText('—', { timeout: 30_000 });
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
      timeout: 30_000,
    });
    await shot('390x844-chart-first-sheet-closed');
    // §14 — how much of the phone the chart actually claims, recorded rather
    // than asserted: the review question is whether it still reads as empty.
    const chartBox = await page.getByRole('group', { name: /Graphique/ }).boundingBox();

    await openMobileSheet();
    await shot('390x844-execution-center-market');
    const mobileCopies = await page.getByTestId('execution-center').count();
    // §2/§3 — the sheet's own surface and how much of the viewport it takes.
    const sheetSurface = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      if (!dialog) return null;
      const style = getComputedStyle(dialog);
      const box = dialog.getBoundingClientRect();
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        heightRatio: Math.round((box.height / window.innerHeight) * 100) / 100,
      };
    });

    await page.getByRole('radio', { name: 'Limit' }).click();
    const mobileBid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('trigger-price-input').fill((mobileBid - 0.005).toFixed(5));
    await shot('390x844-execution-center-limit');

    await page.getByRole('radio', { name: 'Market' }).click();
    await page.getByLabel('Quantité (lots)').fill('1.00');
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('execution-rejection')).toBeVisible({ timeout: 30_000 });
    await shot('390x844-execution-center-server-rejection');

    // ---- 320-wide density smoke -------------------------------------------
    // The narrowest viewport the review asks about. Not a comfortable target,
    // and not claimed to be: the point is to prove the panel still fits and
    // the document still does not scroll sideways.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/trade');
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
      timeout: 30_000,
    });
    await openMobileSheet();
    await shot('320x844-execution-center-density-smoke');

    // ---- §19 — no document horizontal overflow at any required width -------
    const overflow: Record<string, { scrollWidth: number; clientWidth: number }> = {};
    for (const [width, height] of [
      [1366, 768],
      [1440, 900],
      [1920, 1080],
      [320, 844],
      [360, 844],
      [390, 844],
      [412, 915],
      [430, 932],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      overflow[`${width}x${height}`] = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
    }

    /*
     * ---- Blocked entry, produced on the wire, and deliberately LAST ---------
     *
     * The account snapshot's own risk verdict is rewritten to `breached`; the
     * panel reads that verdict rather than deriving one, so this is the exact
     * state a genuinely breached account would show.
     *
     * Installed once, after every other capture, because a `routeWebSocket`
     * handler is not undone by `page.unrouteAll()` — the first version of this
     * spec installed it mid-run and every later capture silently inherited a
     * breached account, which showed up as a five-minute timeout clicking a Buy
     * button that was correctly disabled. Ordering the run so the route never
     * has to be removed is simpler than trying to remove it.
     */
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

    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation();
    await expect(page.getByTestId('execution-gate')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('execution-submit-buy')).toBeDisabled();
    await shotPanel('panel-1440-entry-blocked-hard-breach');
    const blockedMessage = await page.getByTestId('execution-gate').textContent();
    // §10 — the disabled state has to be legible too. The generic disabled
    // token pair measured 2.25:1 here and the repo's axe gates caught it; this
    // records the replacement rather than trusting the arithmetic.
    const disabledActionContrast = {
      buy: await page.evaluate(CONTRAST_IN_PAGE, '[data-testid="execution-submit-buy"]'),
      sell: await page.evaluate(CONTRAST_IN_PAGE, '[data-testid="execution-submit-sell"]'),
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
      timeout: 30_000,
    });
    await openMobileSheet();
    await expect(page.getByTestId('execution-gate')).toBeVisible({ timeout: 30_000 });
    await shot('390x844-execution-center-entry-blocked');

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
            narrowDesktop1366: narrowDesktopActions,
          },
          /** Measured from the live DOM. WCAG AA text minimum is 4.5:1. */
          sideActionContrast,
          disabledActionContrast,
          serverRejection: rejectionCode?.replace(/\s+/g, ' ').trim(),
          blockedEntryMessage: blockedMessage?.replace(/\s+/g, ' ').trim(),
          /** W4 §69 — one mount point per presentation, never both. */
          executionCentersMountedOnMobile: mobileCopies,
          /**
           * §2/§16 — the sheet's own computed surface. A white shell was the
           * headline visual failure of the first review; this records the
           * colour the sheet actually paints rather than asserting the token.
           */
          mobileSheetSurface: sheetSurface,
          /** §14 — how much of a 390×844 phone the chart claims. */
          mobileChartBox: chartBox
            ? {
                height: Math.round(chartBox.height),
                viewportHeight: 844,
                share: Math.round((chartBox.height / 844) * 100) / 100,
              }
            : null,
          /** §19 — scrollWidth must never exceed clientWidth at any width. */
          documentOverflow: overflow,
        },
        null,
        2,
      )}\n`,
    );

    // Evidence only — this merely proves the run reached the end.
    expect(true).toBe(true);
  });
});
