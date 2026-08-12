import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W4 Execution Center.
 *
 * These assert what only a real browser against a real realtime process can
 * settle: that the panel exists once, that a quantity produced by the stepper
 * or a preset is one the *server* accepts, that a pending order created from
 * the panel reaches the order book, that a rejection survives the tick stream
 * that arrives immediately after it, and that the whole surface is operable
 * from the keyboard.
 *
 * Two things are deliberately **not** tested here, for the same reason
 * `trade.spec.ts` states: this sandbox cannot force a symbol's feed stale on
 * demand, and cross-account authorization belongs to the realtime service's own
 * suite. The gating logic those states drive is unit-tested exhaustively in
 * `tests/execution-gating.test.ts` instead.
 */

const DESKTOP_BREAKPOINT = 1024;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/**
 * A connected socket is not a usable Execution Center (the W3 §86 rule).
 * The quantity bounds line is rendered from the `symbol_specs` payload, so it
 * cannot appear before the specs land; the bid is rendered from a tick, so it
 * cannot show a real number before the feed does.
 */
async function openExecutionCenter(page: Page): Promise<void> {
  await page.goto('/trade');
  await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
    'data-connection',
    'open',
    { timeout: 30_000 },
  );

  const width = page.viewportSize()?.width ?? DESKTOP_BREAKPOINT;
  if (width < DESKTOP_BREAKPOINT) {
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
      timeout: 30_000,
    });
    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }

  await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 30_000 });
  // Rendered from the `symbol_specs` payload, so it cannot appear before the
  // specs land. Anchored on the test id rather than the copy: visual closure §7
  // compacted the wording, and a readiness gate should not break every time a
  // sentence is shortened.
  await expect(page.getByTestId('quantity-bounds')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('execution-bid')).not.toHaveText('—', { timeout: 30_000 });
}

test.describe('WariX Execution Center', { tag: ['@trade', '@warix-w4'] }, () => {
  test(
    'exists exactly once in the document',
    { tag: ['@smoke'] },
    async ({ page, tradeAccount }) => {
      // W4 §69 — it used to render in the desktop column *and* inside the
      // closed mobile sheet, the hidden copy still holding a tick subscription
      // and still deriving impact on every tick. Two live copies of a panel
      // that spends money is also why several assertions in trade.spec.ts
      // needed `.first()` to disambiguate.
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await openExecutionCenter(page);

      await expect(page.getByTestId('execution-center')).toHaveCount(1);
      await expect(page.getByLabel('Quantité (lots)')).toHaveCount(1);
      await expect(page.getByTestId('execution-submit-buy')).toHaveCount(1);
      await expect(page.getByTestId('execution-submit-sell')).toHaveCount(1);
    },
  );

  test('shows each side under the quote it will execute against', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    const bid = await page.getByTestId('execution-bid').textContent();
    const ask = await page.getByTestId('execution-ask').textContent();
    expect(bid).toBeTruthy();
    expect(ask).toBeTruthy();
    // A sell opens at the bid and a buy at the ask — `quotedPrice`, the
    // server's own rule. The button repeats the number so the verb and the
    // price are read together (W4 §20).
    await expect(page.getByTestId('execution-submit-sell')).toContainText(bid as string);
    await expect(page.getByTestId('execution-submit-buy')).toContainText(ask as string);
    expect(Number(ask)).toBeGreaterThan(Number(bid));
  });

  test('a stepped quantity is one the server accepts', async ({ page, tradeAccount }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    const quantity = page.getByLabel('Quantité (lots)');
    await quantity.fill('0.10');
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: 'Augmenter la quantité' }).click();
    }
    // Decimal-exact: a float accumulator lands on 0.13000000000000003 here,
    // which the server rejects outright as INVALID_QUANTITY.
    await expect(quantity).toHaveValue('0.13');

    await page.getByTestId('execution-submit-buy').click();
    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
    // The quantity that reached the server is the one the stepper produced.
    await expect(page.getByRole('cell', { name: '0.1300' })).toBeVisible();
  });

  test('a quick preset submits without a client-side validation dead end', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    const presets = page.getByRole('group', { name: 'Quantités rapides' }).getByRole('button');
    await expect(presets.first()).toBeVisible();
    const chosen = (await presets.first().textContent()) ?? '';
    await presets.first().click();
    await expect(page.getByLabel('Quantité (lots)')).toHaveValue(chosen);

    // A preset the panel offers must never be a quantity the server refuses:
    // each is snapped onto the instrument's own lattice and re-validated
    // against isQuantityWithinBounds before it is rendered (W4 §22).
    await page.getByTestId('execution-submit-buy').click();
    await page.getByRole('tab', { name: 'Positions' }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
    await expect(page.getByTestId('execution-rejection')).toHaveCount(0);
  });

  test('a Limit order created from the panel reaches the order book', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    await page.getByRole('radio', { name: 'Limit' }).click();
    const trigger = page.getByTestId('trigger-price-input');
    await expect(trigger).toBeVisible();

    // Well below the market: creatable as a Buy Limit (must sit under the ask)
    // — the canonical `isPendingOrderCreationPriceValid` rule the server
    // re-runs under lock.
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await trigger.fill((bid - 0.005).toFixed(5));
    await expect(page.getByTestId('execution-side-unavailable-buy')).toHaveCount(0);

    await expect(page.getByTestId('execution-submit-buy')).toContainText('Buy Limit');
    await page.getByTestId('execution-submit-buy').click();

    // The dock names the order in French from PENDING_ORDER_TYPE_LABEL; the
    // button carries the English kind the ticket is expressed in. Both refer
    // to the same `buy_limit`, and asserting the dock's own label is what
    // proves the command reached the server rather than the panel.
    await page.getByRole('tab', { name: /^Orders/ }).click();
    await page.getByRole('button', { name: /^En attente/ }).click();
    await expect(page.getByRole('cell', { name: 'Achat Limite' }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('names a side the current market cannot create, without blocking it', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    await page.getByRole('radio', { name: 'Stop' }).click();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    const ask = Number(await page.getByTestId('execution-ask').textContent());
    // Inside the spread: a Buy Stop must sit above the ask and a Sell Stop
    // below the bid, so neither side is creatable at this threshold.
    await page.getByTestId('trigger-price-input').fill(((bid + ask) / 2).toFixed(5));

    // Visual closure §11 — the guidance names its own side and sits under it,
    // instead of one footer sentence a trader has to map onto two buttons.
    await expect(page.getByTestId('execution-side-unavailable-buy')).toBeVisible();
    await expect(page.getByTestId('execution-side-unavailable-sell')).toBeVisible();
    // Advisory, not a gate: the browser's quote is older than the one the
    // server will hold at command time, so the note explains rather than
    // blocks and the server stays the authority (W4 §20).
    await expect(page.getByTestId('execution-submit-buy')).toBeEnabled();
  });

  test('clears the price levels — and only those — when the instrument changes', async ({
    page,
    tradeAccount,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? DESKTOP_BREAKPOINT) < DESKTOP_BREAKPOINT,
      'the navigator is a sheet on mobile; the clearing rule itself is viewport-independent',
    );
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    await page.getByLabel('Quantité (lots)').fill('0.25');
    await page.getByTestId('stop-loss-input').fill('1.08000');
    await page.getByTestId('take-profit-input').fill('1.09000');

    await page
      .getByTestId('market-navigator')
      .getByRole('button', { name: /^XAUUSD/ })
      .click();
    await expect(page.getByTestId('execution-market-header')).toContainText('XAUUSD');

    // W4 §54 — an EURUSD stop of 1.08000 against XAUUSD is unvalidated
    // client-side and entirely plausible-looking on screen. The quantity
    // survives because it *is* re-validated against the new symbol's bounds.
    await expect(page.getByTestId('stop-loss-input')).toHaveValue('');
    await expect(page.getByTestId('take-profit-input')).toHaveValue('');
    await expect(page.getByLabel('Quantité (lots)')).toHaveValue('0.25');
  });

  test('keeps the two actions on screen even in the panel’s tallest state', async ({
    page,
    tradeAccount,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? DESKTOP_BREAKPOINT) < DESKTOP_BREAKPOINT,
      'the mobile sheet has its own scroll container and its own height budget',
    );
    // W4 §36 — the defect this milestone exists to fix. The pre-W4 panel was
    // three full-width Alert cards over an OrderTicket card over a Guardian
    // card, and on a 320px column a single notice pushed Buy/Sell off the
    // bottom: the trader had to scroll a trading panel to reach the trade.
    // Only the fields between the header and the actions scroll, so this holds
    // however tall those sections grow.
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    // The tallest state the panel has: a trigger price, both protection
    // fields with their two-column per-side preview, the impact section
    // populated, and a server rejection notice pinned above all of it.
    await page.getByRole('radio', { name: 'Limit' }).click();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('trigger-price-input').fill((bid - 0.005).toFixed(5));
    await page.getByTestId('stop-loss-input').fill((bid - 0.008).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.005).toFixed(5));
    await expect(page.getByTestId('protection-preview')).toBeVisible();

    await page.getByRole('radio', { name: 'Market' }).click();
    await page.getByLabel('Quantité (lots)').fill('1.00');
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('execution-rejection')).toBeVisible();

    const viewportHeight = page.viewportSize()?.height ?? 0;
    for (const testId of ['execution-submit-buy', 'execution-submit-sell']) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box, testId).not.toBeNull();
      expect((box?.y ?? 0) + (box?.height ?? 0), `${testId} bottom edge`).toBeLessThanOrEqual(
        viewportHeight,
      );
      await expect(page.getByTestId(testId)).toBeInViewport({ ratio: 1 });
    }

    // Visual closure §9 — margin and both loss budgets stay with the actions,
    // whatever the Impact section above is scrolled to.
    await expect(page.getByTestId('execution-impact-summary')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('execution-impact-summary-margin')).not.toBeEmpty();
    await expect(page.getByTestId('execution-impact-summary-dll')).not.toBeEmpty();
    await expect(page.getByTestId('execution-impact-summary-mll')).not.toBeEmpty();
  });

  test('renders chart price labels at the instrument’s own precision', async ({
    page,
    tradeAccount,
  }) => {
    // Visual closure §6. lightweight-charts draws its axis labels into a
    // canvas, so no selector can read "1.08504" back off the price scale; what
    // is asserted here is the one input that decides it, and
    // `tests/chart-price-format.test.ts` proves that input produces the right
    // label for all five shipped instruments.
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    const chart = page.getByRole('group', { name: 'Graphique EURUSD' });
    await expect(chart).toHaveAttribute('data-price-precision', '5');

    // And it follows the instrument rather than sticking at whichever spec
    // happened to load first.
    await page
      .getByTestId('market-navigator')
      .getByRole('button', { name: /^NAS100/ })
      .click();
    await expect(page.getByRole('group', { name: 'Graphique NAS100' })).toHaveAttribute(
      'data-price-precision',
      '1',
    );
  });

  test('a rejection keeps its reason, action and code, and survives the ticks that follow', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    // 1.00 lot is inside EURUSD's own bounds (0.01–10) but blows the 0.60
    // combined forex exposure bucket on a fresh 10K account — a genuine
    // server rejection, not a client-side dead end.
    await page.getByLabel('Quantité (lots)').fill('1.00');
    await page.getByTestId('execution-submit-buy').click();

    const rejection = page.getByTestId('execution-rejection');
    await expect(rejection).toBeVisible();
    await expect(rejection).toContainText('Ordre refusé');
    await expect(rejection).toContainText('exposition maximale autorisée');
    await expect(rejection).toContainText('exposure_limit_exceeded');

    // W4 §38 — the answer the server gave must not be wiped off the screen a
    // few hundred milliseconds later by unrelated market data. Wait for the
    // quote to actually move, then assert the notice is still there.
    const bidBefore = await page.getByTestId('execution-bid').textContent();
    await expect
      .poll(async () => page.getByTestId('execution-bid').textContent(), { timeout: 30_000 })
      .not.toBe(bidBefore);
    await expect(rejection).toBeVisible();
    await expect(rejection).toContainText('exposure_limit_exceeded');
  });

  test('prices both sides of a stop loss, labelled, before anything is submitted', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openExecutionCenter(page);

    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('stop-loss-input').fill((bid - 0.002).toFixed(5));

    const preview = page.getByTestId('protection-preview');
    await expect(preview).toBeVisible();
    // One ticket, two possible sides, two different entry references — a
    // single unlabelled figure would be ambiguous exactly where money is
    // involved (W4 §29).
    await expect(page.getByTestId('protection-sl-buy')).toBeVisible();
    await expect(page.getByTestId('protection-sl-sell')).toBeVisible();
    // Stated as an estimate, because the fill includes slippage this does not
    // model.
    await expect(preview).toContainText('hors slippage');
  });
});

test.describe(
  'WariX Execution Center keyboard access',
  { tag: ['@trade', '@accessibility'] },
  () => {
    test('the order type group is one tab stop operated by the arrow keys', async ({
      page,
      tradeAccount,
    }) => {
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await openExecutionCenter(page);

      await page.getByRole('radio', { name: 'Market' }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'Limit' })).toBeChecked();
      await expect(page.getByTestId('trigger-price-input')).toBeVisible();

      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'Stop' })).toBeChecked();
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByRole('radio', { name: 'Limit' })).toBeChecked();
    });

    test('both side actions are reachable and submittable by keyboard alone', async ({
      page,
      tradeAccount,
    }) => {
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await openExecutionCenter(page);

      const sell = page.getByTestId('execution-submit-sell');
      await sell.focus();
      await expect(sell).toBeFocused();
      // No bare single-key shortcut anywhere near an order (trade.spec.ts
      // asserts the negative); Enter on a focused button is the whole contract.
      await page.keyboard.press('Enter');

      await page.getByRole('tab', { name: 'Positions' }).click();
      await expect(page.getByRole('cell', { name: 'EURUSD · Vente', exact: true })).toBeVisible();
    });

    test('states the market state as text, not colour alone, and names both quotes', async ({
      page,
      tradeAccount,
    }) => {
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await openExecutionCenter(page);

      const header = page.getByTestId('execution-market-header');
      await expect(page.getByTestId('execution-market-status')).toHaveAttribute(
        'data-market-status',
        'open',
      );
      await expect(page.getByTestId('execution-market-status')).toContainText('Ouvert');
      // The dot is decoration; the side each price belongs to is written out.
      await expect(header).toContainText('Vente · Bid');
      await expect(header).toContainText('Achat · Ask');
    });

    test('no critical or serious axe violations, including with a pending order in progress', async ({
      page,
      tradeAccount,
    }) => {
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await openExecutionCenter(page);

      // The richest state of the surface: trigger price shown, both protection
      // fields filled, the per-side preview rendered, and the impact section
      // populated from a real risk snapshot.
      await page.getByRole('radio', { name: 'Limit' }).click();
      const bid = Number(await page.getByTestId('execution-bid').textContent());
      await page.getByTestId('trigger-price-input').fill((bid - 0.005).toFixed(5));
      await page.getByTestId('stop-loss-input').fill((bid - 0.008).toFixed(5));
      await page.getByTestId('take-profit-input').fill((bid + 0.005).toFixed(5));
      await expect(page.getByTestId('protection-preview')).toBeVisible();

      // Whole page, like every other axe gate in this suite. A scan scoped to
      // the panel is the tempting thing to write and the wrong thing to trust:
      // it reports a smaller surface than the one a trader operates, and the
      // first run of this spec proved the point — a scoped scan passed while
      // the repo's own full-page gate caught 3.1:1 text on the Sell action.
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      expect(
        blocking,
        blocking.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
      ).toEqual([]);
    });
  },
);

test.describe(
  'WariX Execution Center on mobile',
  { tag: ['@trade', '@mobile', '@warix-w4'] },
  () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the sheet holds the only copy, and the draft survives closing it', async ({
      page,
      tradeAccount,
    }) => {
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await openExecutionCenter(page);

      // W4 §69/§70 — below `lg` the sheet is the only mount point, so there is
      // no hidden desktop copy holding a second tick subscription.
      await expect(page.getByTestId('execution-center')).toHaveCount(1);
      await expect(page.getByLabel('Quantité (lots)')).toHaveCount(1);

      await page.getByLabel('Quantité (lots)').fill('0.25');
      await page.getByTestId('stop-loss-input').fill('1.08000');

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      // Nothing is mounted while the sheet is closed — the panel is genuinely
      // gone rather than hidden.
      await expect(page.getByTestId('execution-center')).toHaveCount(0);

      await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
      // The draft lives outside React in `ticket-draft.ts`, so re-opening the
      // sheet comes back to the in-progress ticket rather than to defaults.
      await expect(page.getByLabel('Quantité (lots)')).toHaveValue('0.25');
      await expect(page.getByTestId('stop-loss-input')).toHaveValue('1.08000');
    });

    test('every action clears the 44px touch target minimum', async ({ page, tradeAccount }) => {
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await openExecutionCenter(page);

      for (const testId of ['execution-submit-buy', 'execution-submit-sell']) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box?.height ?? 0, testId).toBeGreaterThanOrEqual(44);
      }
    });
  },
);
