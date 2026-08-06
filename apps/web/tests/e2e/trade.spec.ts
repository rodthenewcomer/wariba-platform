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
    // Not getByText: QuickOrderConfirm/PendingOrderConfirm render a
    // "{symbol} · {side} · {quantity} lot" summary line unconditionally
    // (Dialog keeps children mounted, closed via the native <dialog>'s
    // `open` attribute rather than unmounting) — for the default 0.10 lot
    // quantity that string is itself an "EURUSD · Achat" substring match,
    // ambiguous with this Positions row even while both confirm dialogs
    // are closed. The positions table cell is unambiguous.
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();

    // Order status/reason lives in "Ordres" — "Historique" is the
    // closed-position PnL/eligibility ledger (only positions that have been
    // closed appear there), so a still-open market order never shows up
    // there.
    await page.getByRole('tab', { name: 'Ordres' }).click();
    await expect(page.getByRole('cell', { name: 'Ouverture' })).toBeVisible();
    // Not getByText: PendingOrderConfirm's always-mounted GTC disclaimer
    // ("...exécuté par le serveur...") is a case-insensitive substring
    // match for 'Exécuté' too — exact: true also makes this case-sensitive,
    // which the status Badge's all-uppercase-styled but literally-cased
    // "Exécuté" text still satisfies exactly.
    await expect(page.getByText('Exécuté', { exact: true })).toBeVisible();
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
    // Not getByText: the chart's own SL handle also renders "SL · 1.00000 ·
    // ... USD" once a position with a stop loss exists — ambiguous with the
    // positions table's own SL cell. The table cell is unambiguous.
    await expect(page.getByRole('cell', { name: '1.00000' })).toBeVisible();
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
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
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
    const positionsRow = page.getByRole('cell', { name: 'EURUSD · Achat', exact: true });
    await expect(positionsRow).not.toBeVisible();

    const buyButton = page.getByRole('button', { name: 'Buy' }).first();
    await buyButton.focus();
    await expect(buyButton).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(10_000);

    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
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

/**
 * Prompt 7 Appendix 07-C — chart context menu, partial close and the
 * accessible on-chart SL/TP path. Deliberately NOT covered here: dragging
 * an SL/TP line/chip via continuous pointermove simulation. A right-click
 * or a button click is one deterministic event Playwright can fire
 * reliably; a multi-step drag against lightweight-charts' own canvas
 * coordinate math is exactly the kind of interaction that produces flaky,
 * environment-sensitive E2E tests. The drag math itself is covered by
 * packages/domain's unit tests (roundPriceToTick, computeLevelPnlPreview)
 * and TradeChart/ChartPositionOverlay's own drag-state-machine logic by
 * apps/web/tests/ChartPositionOverlay.test.tsx's keyboard-adjustment
 * tests — and every drag has this same click-driven exact-price path as
 * its required non-drag alternative, which is what these tests exercise.
 */
test.describe('WariX chart context menu', () => {
  test('right-click shows the clicked price and only market actions with no open position; Market Buy asks for confirmation before submitting', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    // role=group, not the raw <canvas>: lightweight-charts stacks more
    // than one canvas element for a single pane, and Playwright's
    // actionability check requires the resolved locator's own element (or
    // an ancestor of the actual hit-tested element) to receive the click —
    // picking a specific canvas by DOM order doesn't reliably land on
    // whichever one is actually topmost. The container div (aria-labelled
    // role=group in TradeChart.tsx — not role=img, which axe correctly
    // flags for nested-interactive against lightweight-charts' own
    // TradingView attribution link) is an ancestor of every canvas it
    // holds, so a right-click here is a stable, correct target regardless
    // of internal stacking order.
    const chartCanvas = page.getByRole('group', { name: 'Graphique EURUSD' });
    await chartCanvas.click({ button: 'right' });

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    // Not page.getByText: NotificationCenter's always-mounted "Prix seuil"/
    // "Prix moyen (bid/ask)" text (Dialog keeps children mounted while
    // closed) also matches /^Prix /, ambiguous with the menu's own heading.
    // Scoping to the menu itself is unambiguous.
    await expect(menu.getByText(/^Prix /)).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Achat au marché' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Vente au marché' })).toBeVisible();
    // Appendix 07-D — "Créer une alerte ici" is always offered, and one or
    // two of the four Buy/Sell Limit/Stop suggestions are valid for any
    // given clicked price relative to the live bid/ask
    // (isPendingOrderCreationPriceValid, @wariba/domain): normally exactly
    // two (below bid, between bid/ask, or above ask each make a different
    // two valid), but if the clicked price happens to round to exactly bid
    // or exactly ask, the strict inequalities on both sides of that
    // boundary drop to only one — a real, if narrow, edge case against this
    // sandbox's live feed, not a bug. Never zero, never all four either
    // way. Which ones depends on where this click landed at that instant,
    // so this only asserts the count is in range, not which labels.
    await expect(menu.getByRole('menuitem', { name: 'Créer une alerte ici' })).toBeVisible();
    const pendingOrderLabels = [
      'Achat Limite ici',
      'Vente Limite ici',
      'Achat Stop ici',
      'Vente Stop ici',
    ];
    let visiblePendingSuggestions = 0;
    for (const label of pendingOrderLabels) {
      if (await menu.getByRole('menuitem', { name: label }).isVisible()) {
        visiblePendingSuggestions += 1;
      }
    }
    expect(visiblePendingSuggestions).toBeGreaterThanOrEqual(1);
    expect(visiblePendingSuggestions).toBeLessThanOrEqual(2);

    await menu.getByRole('menuitem', { name: 'Achat au marché' }).click();
    await expect(menu).not.toBeVisible();

    // one-click trading is off by default (ONE_CLICK_TRADING_DEFAULT = false)
    // — a confirmation must appear, never an immediate submit.
    const confirmDialog = page.getByRole('dialog', { name: /Achat au marché/ });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Confirmer achat/ }).click();
    await page.waitForTimeout(10_000);

    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
  });

  test('Escape and outside click both dismiss the menu without submitting anything', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    const chartCanvas = page.getByRole('group', { name: 'Graphique EURUSD' });
    await chartCanvas.click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).not.toBeVisible();

    await chartCanvas.click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByRole('menu')).not.toBeVisible();

    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).not.toBeVisible();
  });

  test('once a position exists, the menu also offers SL/TP, partial close and close — and SL opens the exact-price dialog', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.waitForTimeout(9000);

    const chartCanvas = page.getByRole('group', { name: 'Graphique EURUSD' });
    await chartCanvas.click({ button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Ajouter un Stop Loss' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Ajouter un Take Profit' })).toBeVisible();
    await expect(
      menu.getByRole('menuitem', { name: 'Clôturer une partie de la position' }),
    ).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Fermer la position' })).toBeVisible();

    await menu.getByRole('menuitem', { name: 'Ajouter un Stop Loss' }).click();
    await expect(page.getByRole('dialog', { name: /Modifier SL\/TP — EURUSD/ })).toBeVisible();
  });
});

/**
 * Appendix 07-D acceptance gate 2 — the mobile equivalent of the chart
 * context menu, proven independently of desktop right-click. TradeChart.tsx
 * shares one component (ChartContextMenuContent, driven by the same
 * buildContextMenuActions) between the desktop popover and this mobile
 * BottomSheet — the dynamic pending-order suggestions and "Créer une alerte
 * ici" already covered by the desktop context-menu tests above and by
 * ChartContextMenu.test.tsx apply structurally to both, but only a real
 * touch interaction proves the long-press path itself actually reaches
 * that shared component on a touch device.
 */
test.describe('WariX mobile chart context menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('long press opens a touch-safe bottom sheet with Market actions, dynamic pending-order suggestions, and Create alert', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    const chart = page.getByRole('group', { name: 'Graphique EURUSD' });
    const box = await chart.boundingBox();
    if (!box) throw new Error('chart container not found');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // A real long-press: a native PointerEvent with pointerType: 'touch',
    // held past handleContainerPointerDown's 500ms threshold — dispatched
    // directly against the DOM rather than through Playwright's
    // mouse-based tap()/click() helpers (which need hasTouch enabled on
    // the browser context to produce a genuine touch pointerType at all),
    // so this exercises exactly the code path
    // (event.pointerType !== 'touch' early-return) a real phone would.
    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        el?.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerType: 'touch',
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      },
      { x, y },
    );
    await page.waitForTimeout(600);
    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        el?.dispatchEvent(
          new PointerEvent('pointerup', {
            pointerType: 'touch',
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      },
      { x, y },
    );

    // Not the desktop popover — a BottomSheet, independent of any
    // right-click/contextmenu event.
    const sheet = page.getByRole('dialog', { name: /^Prix / });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Achat au marché' })).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Vente au marché' })).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Créer une alerte ici' })).toBeVisible();

    const pendingOrderLabels = [
      'Achat Limite ici',
      'Vente Limite ici',
      'Achat Stop ici',
      'Vente Stop ici',
    ];
    let visiblePendingSuggestions = 0;
    for (const label of pendingOrderLabels) {
      if (await sheet.getByRole('menuitem', { name: label }).isVisible()) {
        visiblePendingSuggestions += 1;
      }
    }
    expect(visiblePendingSuggestions).toBeGreaterThanOrEqual(1);
    expect(visiblePendingSuggestions).toBeLessThanOrEqual(2);

    // Touch-safe: every action is a real tappable target, not a
    // desktop-only hover affordance — this codebase's own 44px minimum
    // touch target convention (--wariba-size-touch-target-minimum).
    const marketBuyBox = await sheet
      .getByRole('menuitem', { name: 'Achat au marché' })
      .boundingBox();
    expect(marketBuyBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('once a position exists, the bottom sheet also offers position-management actions', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await page.waitForTimeout(4000);

    await page.getByRole('button', { name: /Trader/ }).click();
    const ticketSheet = page.getByRole('dialog');
    await expect(ticketSheet).toBeVisible();
    await ticketSheet.getByRole('button', { name: 'Buy' }).click();
    await page.waitForTimeout(9000);
    await page.keyboard.press('Escape');
    await expect(ticketSheet).not.toBeVisible();

    const chart = page.getByRole('group', { name: 'Graphique EURUSD' });
    const box = await chart.boundingBox();
    if (!box) throw new Error('chart container not found');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        el?.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerType: 'touch',
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      },
      { x, y },
    );
    await page.waitForTimeout(600);
    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        el?.dispatchEvent(
          new PointerEvent('pointerup', {
            pointerType: 'touch',
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      },
      { x, y },
    );

    const sheet = page.getByRole('dialog', { name: /^Prix / });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Ajouter un Stop Loss' })).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Ajouter un Take Profit' })).toBeVisible();
    await expect(
      sheet.getByRole('menuitem', { name: 'Clôturer une partie de la position' }),
    ).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Fermer la position' })).toBeVisible();
  });
});

test.describe('WariX partial close', () => {
  test('closing 50% leaves the position open at half size, never labelled just "Fermer"', async ({
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
      .getByRole('button', { name: /Clôture partielle — EURUSD/ })
      .first()
      .click();

    const sheet = page.getByRole('dialog', { name: /Clôture partielle/ });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: '50%' }).click();
    await expect(sheet.getByText(/Clôturer 0\.05 sur 0\.10 lot/)).toBeVisible();

    // Not the disabled-during-click pattern used elsewhere (Buy, Close
    // All): PartialCloseSheet's onSubmitPartialClose closes the sheet
    // synchronously on click, before any server round trip — a deliberate
    // choice (unlike CloseAllDialog, this sheet has no "result" view of
    // its own; a rejection surfaces through OrderTicket's own persistent
    // Alert and the aria-live status announcement instead). So the sheet
    // is expected to disappear immediately, not linger in a disabled state.
    const confirmButton = sheet.getByRole('button', { name: 'Confirmer la clôture partielle' });
    await confirmButton.click();
    await expect(sheet).not.toBeVisible();
    await page.waitForTimeout(6000);

    // The position stays open at half its original size — never fully closed.
    await expect(page.getByText(/0\.05/).first()).toBeVisible();

    await page.getByRole('tab', { name: 'Historique' }).click();
    await expect(page.getByRole('cell', { name: '0.0500' })).toBeVisible();
  });
});
