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
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/**
 * The workstation shows the order ticket in the execution column on desktop
 * and behind a `lg:hidden` "Trader {symbol}" button on mobile, so waiting on
 * the ticket's own helper text is a desktop-only readiness signal.
 *
 * Each viewport waits for the control a real user of that viewport actually
 * operates — the assertions are equally strict on both, just anchored to the
 * correct entry point.
 *
 * Both branches must also wait for the session to be genuinely *usable*, not
 * merely painted. The desktop branch already does that implicitly: its helper
 * element (`quantity-bounds`) is rendered from the `symbol_specs` payload, so
 * it cannot appear before the specs land. The mobile branch had no
 * equivalent, and the chart context-menu tests depend on one — a long press
 * resolves its price through `series.coordinateToPrice`, which returns null
 * until the first tick has produced a candle and given the series a price
 * range. Waiting for the market trigger to show a real quote instead of
 * "— / —" is that missing precondition, and it is the condition the test
 * actually depends on rather than a delay.
 */
const DESKTOP_TICKET_BREAKPOINT = 1024;

/**
 * Opens the dock and selects a tab.
 *
 * W2 §27 made the dock a BottomSheet on mobile so the chart keeps the
 * viewport — and, more importantly, so the mobile and desktop dock
 * presentations are never concurrently active (see use-viewport.ts for the
 * SSR/hydration caveat).
 * Its tabs therefore do not exist until the sheet is opened. Desktop keeps
 * the dock inline, where the tab is already present.
 */
async function openDockTab(page: import('@playwright/test').Page, name: RegExp) {
  const width = page.viewportSize()?.width ?? DESKTOP_TICKET_BREAKPOINT;
  if (width < DESKTOP_TICKET_BREAKPOINT) {
    await page.getByTestId('mobile-dock-trigger').click();
  }
  await page.getByRole('tab', { name }).click();
}

async function openTrade(page: import('@playwright/test').Page) {
  await page.goto('/trade');
  // W2 §25 compressed the phone status bar, so the word "Connecté" is visible
  // only from `sm` upward. The chip exposes its state as data, which is a
  // better anchor anyway: it does not depend on French copy or breakpoint.
  await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
    'data-connection',
    'open',
    { timeout: 30_000 },
  );

  const width = page.viewportSize()?.width ?? DESKTOP_TICKET_BREAKPOINT;
  if (width >= DESKTOP_TICKET_BREAKPOINT) {
    await expect(page.getByTestId('quantity-bounds')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Buy' }).first()).toBeEnabled();
    return;
  }

  const ticketTrigger = page.getByRole('button', { name: /^Trader EURUSD$/ });
  await expect(ticketTrigger).toBeVisible({ timeout: 30_000 });
  await expect(ticketTrigger).toBeEnabled();
  await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
    timeout: 30_000,
  });
}

/**
 * Holds `order_result` frames back so an in-flight command has an
 * observable window.
 *
 * The double-submit assertions below check that a button disables itself
 * while its command is in flight. Against a warm local stack that round
 * trip can finish in single-digit milliseconds, so racing the assertion
 * against the click (Promise.all) only passed when the server happened to
 * be slow — it failed as soon as the stack got faster, which is the wrong
 * way round for a test that is supposed to be about the UI's behaviour.
 *
 * Delaying only the command's own reply makes the window deterministic
 * without touching the product: market ticks, snapshots and every other
 * frame still flow at full speed, and the assertion now measures what it
 * claims to measure.
 */
async function delayOrderResults(
  page: import('@playwright/test').Page,
  delayMs: number,
): Promise<void> {
  await page.routeWebSocket(/\/ws(\?|$)/, (ws) => {
    const server = ws.connectToServer();
    ws.onMessage((message) => server.send(message));
    server.onMessage(async (message) => {
      const text = typeof message === 'string' ? message : '';
      if (text.includes('"order_result"')) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      ws.send(message);
    });
  });
}

async function openTouchChartMenu(page: import('@playwright/test').Page) {
  const chart = page.getByRole('group', { name: 'Graphique EURUSD' });
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toBeVisible();
  await expect(chart.locator('canvas').first()).toBeVisible();

  const box = await chart.boundingBox();
  if (!box) throw new Error('chart container not found');
  const clientX = box.x + box.width / 2;
  const clientY = box.y + box.height / 2;
  const pointerEvent = {
    x: clientX,
    y: clientY,
    id: 1,
    radiusX: 1,
    radiusY: 1,
    force: 1,
  };

  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [pointerEvent],
  });
  const sheet = page.getByRole('dialog', { name: /^Prix / });
  try {
    await expect(sheet).toBeVisible();
    return sheet;
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
}

test.describe('WariX order lifecycle', { tag: ['@trade'] }, () => {
  test(
    'submits a market order, shows it pending then filled, closes it, and reconciles history',
    { tag: ['@smoke', '@critical'] },
    async ({ page, tradeAccount }) => {
      await delayOrderResults(page, 2_000);
      await login(page, tradeAccount.email, tradeAccount.password);
      await openTrade(page);

      const buyButton = page.getByRole('button', { name: 'Buy' }).first();
      // Buttons show a spinner (Button's `loading` prop) the instant a
      // command is in flight. delayOrderResults holds the reply back, so the
      // disabled state is observable rather than a race against the server.
      await buyButton.click();
      await expect(buyButton).toBeDisabled();

      await page.getByRole('tab', { name: 'Positions' }).click();
      // Not getByText: QuickOrderConfirm/PendingOrderConfirm render a
      // "{symbol} · {side} · {quantity} lot" summary line unconditionally
      // (Dialog keeps children mounted, closed via the native <dialog>'s
      // `open` attribute rather than unmounting) — for the default 0.10 lot
      // quantity that string is itself an "EURUSD · Achat" substring match,
      // ambiguous with this Positions row even while both confirm dialogs
      // are closed. The positions table cell is unambiguous.
      await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();

      // Order status/reason lives under Orders → Récents; Trades is the
      // closed-position PnL/eligibility ledger (only positions that have been
      // closed appear there), so a still-open market order never shows up
      // there. W2 §18 folded the two order tabs into one destination with two
      // views over the same two distinct server collections.
      await page.getByRole('tab', { name: /^Orders/ }).click();
      await page.getByRole('button', { name: 'Récents' }).click();
      await expect(page.getByRole('cell', { name: 'Ouverture' })).toBeVisible();
      // Not getByText: PendingOrderConfirm's always-mounted GTC disclaimer
      // ("...exécuté par le serveur...") is a case-insensitive substring
      // match for 'Exécuté' too — exact: true also makes this case-sensitive,
      // which the status Badge's all-uppercase-styled but literally-cased
      // "Exécuté" text still satisfies exactly.
      await expect(page.getByText('Exécuté', { exact: true })).toBeVisible();

      await page.getByRole('tab', { name: /^Positions/ }).click();
      await page.getByRole('button', { name: 'Fermer EURUSD · Achat' }).click();
      await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toHaveCount(0);
      await page.getByRole('tab', { name: /^Trades/ }).click();
      const history = page.getByRole('tabpanel');
      await expect(history.getByRole('cell', { name: 'EURUSD' })).toBeVisible();
      await expect(history.getByRole('cell', { name: '0.1000' })).toBeVisible();
    },
  );

  test(
    'a rejected order (exposure limit) shows its reason in Historique, not just a raw code',
    { tag: ['@smoke', '@critical', '@risk'] },
    async ({ page, tradeAccount }) => {
      await login(page, tradeAccount.email, tradeAccount.password);
      await openTrade(page);

      // 1.00 lot is within EURUSD's own bounds (0.01-10) but blows the 0.60
      // combined forex exposure bucket on a fresh 10K account — a genuine
      // server-side rejection, not a client-side validation dead end.
      await page.getByLabel('Quantité (lots)').first().fill('1.00');
      await page.getByRole('button', { name: 'Buy' }).first().click();

      // Since W4 the Execution Center exists exactly once in the document —
      // it used to render for the desktop column *and* inside the closed
      // mobile sheet, which is why these matches needed `.first()` to
      // disambiguate two live copies of the same panel.
      await expect(page.getByTestId('execution-rejection')).toBeVisible();
      await expect(page.getByTestId('execution-rejection')).toContainText(
        'exposure_limit_exceeded',
      );

      // Order status/reason lives under Orders → Récents; Trades is the
      // closed-position PnL/eligibility ledger and never shows rejections
      // (a rejected order never produces a fill to close).
      await page.getByRole('tab', { name: /^Orders/ }).click();
      await page.getByRole('button', { name: 'Récents' }).click();
      // Scoped to the active tabpanel: the rejection reason also appears in
      // the Execution Center's own status notice (which stays put regardless
      // of which dock tab is active), so an unscoped match would be ambiguous.
      const ordersPanel = page.getByRole('tabpanel');
      await expect(ordersPanel.getByText('Rejeté')).toBeVisible();
      await expect(
        ordersPanel.getByText('Cet ordre dépasserait votre exposition maximale autorisée'),
      ).toBeVisible();
    },
  );
});

test.describe('WariX position risk modification', { tag: ['@trade', '@risk'] }, () => {
  test(
    'sets a stop loss on an open position, independently of take profit, and it persists across a resubscribe',
    { tag: ['@smoke', '@critical'] },
    async ({ page, tradeAccount }) => {
      await login(page, tradeAccount.email, tradeAccount.password);
      await openTrade(page);

      await page.getByRole('button', { name: 'Buy' }).first().click();

      await page.getByRole('tab', { name: 'Positions' }).click();
      await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
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
      // in-flight state. Once the server responds, the committed position
      // re-seeds the input and the button correctly stays disabled because
      // there is no longer an unsaved change.
      await Promise.all([expect(saveStopLoss).toBeDisabled(), saveStopLoss.click()]);
      await expect(page.getByText('Modif. SL confirmé.')).toBeVisible();
      await expect(stopLossInput).toHaveValue('1.00000');
      await expect(saveStopLoss).toBeDisabled();

      // Take Profit was never touched — its own save button must still be
      // disabled (nothing changed there), proving the two fields are
      // independently submitted rather than coupled into one command.
      await expect(
        dialog.getByRole('button', { name: 'Enregistrer le Take Profit' }),
      ).toBeDisabled();

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();

      // Reconciliation proof: force a fresh account.snapshot (same mechanism
      // a reconnect uses) and confirm the modification is reflected from the
      // server's own data, not just optimistic local state.
      await page.reload();
      await expect(page.getByText('Connecté')).toBeVisible({ timeout: 30_000 });
      await page.getByRole('tab', { name: 'Positions' }).click();
      // Not getByText: the chart's own SL handle also renders "SL · 1.00000 ·
      // ... USD" once a position with a stop loss exists — ambiguous with the
      // positions table's own SL cell. The table cell is unambiguous.
      await expect(page.getByRole('cell', { name: '1.00000' })).toBeVisible();
    },
  );
});

test.describe('WariX Close All', { tag: ['@trade'] }, () => {
  test('confirms with the real position count, disables itself immediately, and shows a per-symbol result', async ({
    page,
    tradeAccount,
  }) => {
    await delayOrderResults(page, 2_000);
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();

    await page.getByText('GBPUSD').first().click();
    await expect(page.getByTestId('execution-market-header')).toContainText('GBPUSD');
    await page.getByRole('button', { name: 'Sell' }).first().click();

    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'GBPUSD · Vente', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tout fermer' }).click();
    await expect(page.getByText(/Cette action fermera 2 positions ouvertes/)).toBeVisible();

    const confirmButton = page.getByRole('dialog').getByRole('button', { name: 'Confirmer' });
    // Double-submit protection: the button must be disabled/loading the
    // instant it's clicked, before the server round trip finishes, so a
    // second rapid click cannot land. delayOrderResults holds the batch's
    // replies back so that window is deterministic instead of depending on
    // how fast the local stack happens to be.
    await confirmButton.click();
    await expect(confirmButton).toBeDisabled();

    await expect(page.getByText('Résultat — Tout fermer')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/2 positions? fermées?/)).toBeVisible();
    const closedBadges = page.getByRole('dialog').getByText('Fermée', { exact: true });
    await expect(closedBadges).toHaveCount(2);
  });
});

test.describe('WariX reconnection', { tag: ['@trade', '@recovery'] }, () => {
  test('going offline then back online shows a resync indicator and recovers', async ({
    page,
    tradeAccount,
  }) => {
    const routedSockets: import('@playwright/test').WebSocketRoute[] = [];
    await page.routeWebSocket(
      (url) => url.pathname === '/ws',
      (socket) => {
        socket.connectToServer();
        routedSockets.push(socket);
      },
    );
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

    await expect.poll(() => routedSockets.length).toBe(1);
    await routedSockets[0]!.close({ code: 1012, reason: 'recovery test' });
    await expect(page.getByText('Reconnexion…').first()).toBeVisible({ timeout: 15_000 });

    // The socket drop doesn't mean failure — RealtimeClient reconnects and
    // resubscribes on its own; the UI settles back to "Connecté" without
    // any user action. Generous timeout: reconnect backoff plus a full
    // snapshot re-fetch can stack to well past 10s in this environment.
    await expect(page.getByText('Connecté')).toBeVisible({ timeout: 40_000 });
  });
});

test.describe('WariX mobile', { tag: ['@trade', '@mobile'] }, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('order ticket opens as a bottom sheet and a market order still fills', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

    await page.getByRole('button', { name: /Trader/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Buy' })).toBeVisible();

    await sheet.getByRole('button', { name: 'Buy' }).click();

    // BottomSheet has no explicit close button (Design System §24.13) —
    // backdrop click or ESC only, both wired to the native <dialog>'s
    // cancel event.
    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible();
    await openDockTab(page, /^Positions/);
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
  });
});

test.describe('WariX keyboard access', { tag: ['@trade', '@accessibility'] }, () => {
  test('Buy is reachable and submittable by keyboard alone, no bare single-key shortcut', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

    // A stray global key handler would fire even with focus elsewhere —
    // prove it doesn't: nothing in the account should react to a bare "b".
    await page.keyboard.press('b');
    await expect(page.getByText('Ordre refusé')).not.toBeVisible();
    const positionsRow = page.getByRole('cell', { name: 'EURUSD · Achat', exact: true });
    await expect(positionsRow).not.toBeVisible();

    const buyButton = page.getByRole('button', { name: 'Buy' }).first();
    await buyButton.focus();
    await expect(buyButton).toBeFocused();
    await page.keyboard.press('Enter');

    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
  });

  test('watchlist selection is keyboard-operable and exposes aria-current, not color alone', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

    const xauusdRow = page.getByRole('button', { name: /XAUUSD/ }).first();
    await xauusdRow.focus();
    await page.keyboard.press('Enter');
    await expect(xauusdRow).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('execution-market-header')).toContainText('XAUUSD');
  });
});

test.describe('WariX accessibility scan', { tag: ['@trade', '@accessibility'] }, () => {
  test('no critical or serious axe violations with a position open', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();

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
test.describe('WariX chart context menu', { tag: ['@trade'] }, () => {
  test('right-click shows the clicked price and only market actions with no open position; Market Buy asks for confirmation before submitting', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

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

    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
  });

  test('Escape and outside click both dismiss the menu without submitting anything', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);

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
    await openTrade(page);

    await page.getByRole('button', { name: 'Buy' }).first().click();
    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();

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
test.describe('WariX mobile chart context menu', { tag: ['@trade', '@mobile'] }, () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('long press opens a touch-safe bottom sheet with Market actions, dynamic pending-order suggestions, and Create alert', async ({
    page,
    tradeAccount,
  }) => {
    await login(page, tradeAccount.email, tradeAccount.password);
    await openTrade(page);
    const sheet = await openTouchChartMenu(page);
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
    await openTrade(page);

    await page.getByRole('button', { name: /Trader/ }).click();
    const ticketSheet = page.getByRole('dialog');
    await expect(ticketSheet).toBeVisible();
    await ticketSheet.getByRole('button', { name: 'Buy' }).click();
    await page.keyboard.press('Escape');
    await expect(ticketSheet).not.toBeVisible();
    await openDockTab(page, /^Positions/);
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
    // Close the dock sheet again so the chart is reachable for the long press.
    await page.keyboard.press('Escape');

    const sheet = await openTouchChartMenu(page);
    await expect(sheet.getByRole('menuitem', { name: 'Ajouter un Stop Loss' })).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Ajouter un Take Profit' })).toBeVisible();
    await expect(
      sheet.getByRole('menuitem', { name: 'Clôturer une partie de la position' }),
    ).toBeVisible();
    await expect(sheet.getByRole('menuitem', { name: 'Fermer la position' })).toBeVisible();
  });
});

test.describe('WariX partial close', { tag: ['@trade'] }, () => {
  test(
    'closing 50% leaves the position open at half size, never labelled just "Fermer"',
    { tag: ['@smoke', '@critical'] },
    async ({ page, tradeAccount }) => {
      await login(page, tradeAccount.email, tradeAccount.password);
      await openTrade(page);

      await page.getByRole('button', { name: 'Buy' }).first().click();

      await page.getByRole('tab', { name: 'Positions' }).click();
      await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
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
      // its own; a rejection surfaces through the Execution Center's own
      // persistent status notice and the aria-live announcement instead). So the sheet
      // is expected to disappear immediately, not linger in a disabled state.
      const confirmButton = sheet.getByRole('button', { name: 'Confirmer la clôture partielle' });
      await confirmButton.click();
      await expect(sheet).not.toBeVisible();

      // The position stays open at half its original size — never fully closed.
      await expect(page.getByText(/0\.05/).first()).toBeVisible();

      await page.getByRole('tab', { name: /^Trades/ }).click();
      await expect(page.getByRole('cell', { name: '0.0500' })).toBeVisible();
    },
  );
});
