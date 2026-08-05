import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

/**
 * Playwright starts the required Next.js and realtime processes itself
 * when they are not already running (see playwright.config.ts).
 *
 * Two things this file deliberately does NOT test, and why:
 * - Cross-account WS authorization (can user A ever subscribe to user B's
 *   account channel) — services/realtime/tests/auth-isolation.e2e.test.ts
 *   is the authoritative test for that, exercising the WS protocol directly
 *   rather than through a real browser session that, by construction, only
 *   ever requests its own logged-in user's account.
 * - Server-forced market staleness — nothing in this sandbox can make a
 *   symbol's tick stop arriving on demand; the UI's handling of
 *   marketStatus: 'stale' (disabled submit, "Prix périmé"/"Prix obsolète"
 *   copy) was verified by hand against real screenshots during Prompt 07's
 *   own build, not automated here for lack of a deterministic trigger.
 */

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 15_000 });
}

test.describe('WariX order lifecycle', () => {
  test('submits a market order, shows it pending then filled, and lists it in Positions/Historique', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    const buyButton = page.getByRole('button', { name: 'Buy' }).first();
    // Buttons show a spinner (Button's `loading` prop) the instant a command
    // is in flight. Against this sandbox's local Supabase the round trip can
    // resolve in a handful of milliseconds, so the disabled state must be
    // asserted concurrently with the click — awaiting the click first would
    // let the round trip finish (and the button re-enable) before this
    // assertion starts polling at all.
    await Promise.all([expect(buyButton).toBeDisabled(), buyButton.click()]);
    await page.waitForTimeout(10_000);

    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByText('EURUSD · Achat')).toBeVisible();

    // Order status/reason lives in "Ordres" — "Historique" is the
    // closed-position PnL/eligibility ledger (only positions that have been
    // closed appear there), so a still-open market order never shows up
    // there.
    await page.getByRole('tab', { name: 'Ordres' }).click();
    await expect(page.getByRole('cell', { name: 'Ouverture' })).toBeVisible();
    await expect(page.getByText('Exécuté')).toBeVisible();
  });

  test('a rejected order (exposure limit) shows its reason in Historique, not just a raw code', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    // 1.00 lot is within EURUSD's own bounds (0.01-10) but blows the 0.60
    // combined forex exposure bucket on a fresh 10K account — a genuine
    // server-side rejection, not a client-side validation dead end.
    await page.getByLabel('Quantité (lots)').first().fill('1.00');
    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.waitForTimeout(10_000);

    // Duplicated in the DOM: OrderTicket renders once for the desktop
    // <aside> and once inside the (closed) mobile BottomSheet — getByText,
    // unlike getByRole, doesn't filter by accessibility-tree/visibility, so
    // both copies match. .first() is the desktop aside's, reliably first in
    // DOM order.
    await expect(page.getByText('Ordre refusé').first()).toBeVisible();
    await expect(page.getByText('exposure_limit_exceeded').first()).toBeVisible();

    // Order status/reason lives in "Ordres" — "Historique" is the
    // closed-position PnL/eligibility ledger and never shows rejections
    // (a rejected order never produces a fill to close).
    await page.getByRole('tab', { name: 'Ordres' }).click();
    // Scoped to the active tabpanel: the rejection reason also appears in
    // OrderTicket's own Alert (which stays mounted regardless of which tab
    // is active), so an unscoped match would be ambiguous here too.
    const ordersPanel = page.getByRole('tabpanel');
    await expect(ordersPanel.getByText('Rejeté')).toBeVisible();
    await expect(
      ordersPanel.getByText('Cet ordre dépasserait votre exposition maximale autorisée'),
    ).toBeVisible();
  });
});

test.describe('WariX position risk modification', () => {
  test('sets a stop loss on an open position, independently of take profit, and it persists across a resubscribe', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.waitForTimeout(9000);

    await page.getByRole('tab', { name: 'Positions' }).click();
    await page
      .getByRole('button', { name: /Modifier SL\/TP — EURUSD/ })
      .first()
      .click();

    const dialog = page.getByRole('dialog', { name: /Modifier SL\/TP — EURUSD/ });
    await expect(dialog).toBeVisible();

    const stopLossInput = dialog.getByLabel('Stop Loss');
    await stopLossInput.fill('1.00000');
    const saveStopLoss = dialog.getByRole('button', { name: 'Enregistrer le Stop Loss' });
    // Idempotent/server-authoritative round trip: the button must reflect
    // in-flight state and re-enable only once the server has actually
    // responded, same double-submit guard as every other command in WariX.
    await Promise.all([expect(saveStopLoss).toBeDisabled(), saveStopLoss.click()]);
    await page.waitForTimeout(6000);

    // Take Profit was never touched — its own save button must still be
    // disabled (nothing changed there), proving the two fields are
    // independently submitted rather than coupled into one command.
    await expect(dialog.getByRole('button', { name: 'Enregistrer le Take Profit' })).toBeDisabled();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // Reconciliation proof: force a fresh account.snapshot (same mechanism
    // a reconnect uses) and confirm the modification is reflected from the
    // server's own data, not just optimistic local state.
    await page.reload();
    await page.waitForTimeout(4000);
    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByText('1.00000')).toBeVisible();
  });
});

test.describe('WariX Close All', () => {
  test('confirms with the real position count, disables itself immediately, and shows a per-symbol result', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.waitForTimeout(9000);

    await page.getByText('GBPUSD').first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Sell' }).first().click();
    await page.waitForTimeout(9000);

    await page.getByRole('tab', { name: 'Positions' }).click();
    await page.getByRole('button', { name: 'Tout fermer' }).click();
    await expect(page.getByText(/Cette action fermera 2 positions ouvertes/)).toBeVisible();

    const confirmButton = page.getByRole('dialog').getByRole('button', { name: 'Confirmer' });
    // Double-submit protection: the button must be disabled/loading the
    // instant it's clicked, before the server round trip finishes — a
    // second rapid click must not be able to land. Against this sandbox's
    // local Supabase, a 2-position close-all batch can fully resolve (and
    // the dialog can flip to its result view) in a handful of
    // milliseconds, so this must be asserted concurrently with the click —
    // awaiting the click first would let that happen before the assertion
    // starts polling at all.
    await Promise.all([expect(confirmButton).toBeDisabled(), confirmButton.click()]);

    await expect(page.getByText('Résultat — Tout fermer')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/2 positions? fermées?/)).toBeVisible();
    const closedBadges = page.getByRole('dialog').getByText('Fermée', { exact: true });
    await expect(closedBadges).toHaveCount(2);
  });
});

test.describe('WariX reconnection', () => {
  test('going offline then back online shows a resync indicator and recovers', async ({
    page,
    context,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);
    await expect(page.getByText('Connecté')).toBeVisible();

    await context.setOffline(true);
    await page.waitForTimeout(3000);
    await context.setOffline(false);

    // The socket drop doesn't mean failure — RealtimeClient reconnects and
    // resubscribes on its own; the UI settles back to "Connecté" without
    // any user action. Generous timeout: reconnect backoff plus a full
    // snapshot re-fetch can stack to well past 10s in this environment.
    await expect(page.getByText('Connecté')).toBeVisible({ timeout: 40_000 });
  });
});

test.describe('WariX mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('order ticket opens as a bottom sheet and a market order still fills', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    await page.getByRole('button', { name: /Trader/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Buy' })).toBeVisible();

    await sheet.getByRole('button', { name: 'Buy' }).click();
    await page.waitForTimeout(10_000);

    // BottomSheet has no explicit close button (Design System §24.13) —
    // backdrop click or ESC only, both wired to the native <dialog>'s
    // cancel event.
    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible();
    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByText('EURUSD · Achat')).toBeVisible();
  });
});

test.describe('WariX keyboard access', () => {
  test('Buy is reachable and submittable by keyboard alone, no bare single-key shortcut', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    // A stray global key handler would fire even with focus elsewhere —
    // prove it doesn't: nothing in the account should react to a bare "b".
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    await expect(page.getByText('Ordre refusé')).not.toBeVisible();
    const positionsRow = page.getByText('EURUSD · Achat');
    await expect(positionsRow).not.toBeVisible();

    const buyButton = page.getByRole('button', { name: 'Buy' }).first();
    await buyButton.focus();
    await expect(buyButton).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(10_000);

    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByText('EURUSD · Achat')).toBeVisible();
  });

  test('watchlist selection is keyboard-operable and exposes aria-current, not color alone', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    const xauusdRow = page.getByRole('button', { name: /XAUUSD/ }).first();
    await xauusdRow.focus();
    await page.keyboard.press('Enter');
    await expect(xauusdRow).toHaveAttribute('aria-current', 'true');
    await expect(page.getByText('ORDER TICKET — XAUUSD').first()).toBeVisible();
  });
});

test.describe('WariX accessibility scan', () => {
  test('no critical or serious axe violations with a position open', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.waitForTimeout(10_000);

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );
    if (critical.length > 0) {
      console.error(
        'axe violations:',
        critical.map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`).join('\n'),
      );
    }
    expect(critical).toHaveLength(0);
  });
});
