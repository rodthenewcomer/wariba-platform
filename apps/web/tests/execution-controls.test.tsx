import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { isQuantityWithinBounds } from '@wariba/domain';
import type { MarketTick, SymbolSpec } from '@wariba/contracts';
import { ExecutionActions } from '../app/(trade)/trade/execution/ExecutionActions';
import { ExecutionImpactSummary } from '../app/(trade)/trade/execution/ExecutionImpactSummary';
import { ExecutionStatus } from '../app/(trade)/trade/execution/ExecutionStatus';
import { OrderTypeSelector } from '../app/(trade)/trade/execution/OrderTypeSelector';
import { QuantityControl } from '../app/(trade)/trade/execution/QuantityControl';
import { TriggerPriceControl } from '../app/(trade)/trade/execution/TriggerPriceControl';
import { deriveExecutionGate } from '../app/(trade)/trade/execution/execution-gating';
import type { TicketOrderKind } from '../app/(trade)/trade/execution/execution-contract';

/**
 * W4 §16/§20/§21/§22/§24/§38/§63/§66 — the Execution Center's controls, driven
 * the way a trader drives them.
 *
 * These are behaviour tests, not snapshots: what is asserted is what the
 * control *does* to the value it owns and what a keyboard or screen-reader user
 * can reach. The arithmetic itself is proven in
 * `packages/domain/tests/execution-quantity.test.ts`; here the question is
 * whether pressing the button applies it.
 */

const SPEC: SymbolSpec = {
  symbol: 'EURUSD',
  assetClass: 'forex_major',
  pricePrecision: 5,
  contractSize: '100000',
  leverage: 30,
  minimumQuantity: '0.0100',
  maximumQuantity: '10.0000',
  quantityStep: '0.0100',
  commissionPerLot: '0.00',
} as SymbolSpec;

const TICK: MarketTick = {
  symbol: 'EURUSD',
  bid: '1.08500',
  ask: '1.08510',
  timestamp: '2026-01-01T00:00:00.000Z',
  marketStatus: 'open',
} as MarketTick;

/** A controlled host, so a press is asserted through the same round trip the panel uses. */
function QuantityHost({ initial = '0.10' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <QuantityControl spec={SPEC} value={value} onChange={setValue} error={null} />;
}

describe('QuantityControl', () => {
  it('steps up and down by exactly one lot step', async () => {
    const user = userEvent.setup();
    render(<QuantityHost />);
    const field = screen.getByLabelText('Quantité (lots)');

    await user.click(screen.getByRole('button', { name: 'Augmenter la quantité' }));
    expect(field).toHaveValue('0.11');
    await user.click(screen.getByRole('button', { name: 'Diminuer la quantité' }));
    expect(field).toHaveValue('0.10');
  });

  it('produces no floating-point artefact over a long run of presses', async () => {
    const user = userEvent.setup();
    render(<QuantityHost initial="0.01" />);
    const increment = screen.getByRole('button', { name: 'Augmenter la quantité' });
    const field = screen.getByLabelText('Quantité (lots)');

    for (let i = 0; i < 30; i += 1) await user.click(increment);

    // A float accumulator lands on 0.31000000000000005 here.
    expect(field).toHaveValue('0.31');
  });

  it('recovers to the minimum from a value the field cannot parse', async () => {
    const user = userEvent.setup();
    render(<QuantityHost initial="abc" />);

    await user.click(screen.getByRole('button', { name: 'Augmenter la quantité' }));

    expect(screen.getByLabelText('Quantité (lots)')).toHaveValue('0.01');
  });

  it('never rewrites what the trader is typing', async () => {
    const user = userEvent.setup();
    render(<QuantityHost initial="" />);
    const field = screen.getByLabelText('Quantité (lots)');

    // "0.0" is off-lattice and mid-entry. Snapping it — or reformatting it to
    // "0.00" — would move the caret out from under the next keystroke (§66).
    await user.type(field, '0.0');
    expect(field).toHaveValue('0.0');
    await user.type(field, '5');
    expect(field).toHaveValue('0.05');
  });

  it('offers presets that are real quantities, and each one passes canonical validation', async () => {
    const user = userEvent.setup();
    render(<QuantityHost />);
    const presets = within(screen.getByRole('group', { name: 'Quantités rapides' })).getAllByRole(
      'button',
    );
    expect(presets.length).toBeGreaterThan(0);

    for (const preset of presets) {
      const quantity = preset.textContent ?? '';
      // Labelled with the quantity it submits, never with a multiplier.
      expect(quantity).not.toMatch(/[×x]/);
      expect(
        isQuantityWithinBounds({
          quantity,
          minimumQuantity: SPEC.minimumQuantity,
          maximumQuantity: SPEC.maximumQuantity,
          quantityStep: SPEC.quantityStep,
        }),
      ).toBe(true);
    }

    const target = presets[presets.length - 1] as HTMLElement;
    await user.click(target);
    expect(screen.getByLabelText('Quantité (lots)')).toHaveValue(target.textContent);
    expect(target).toHaveAttribute('aria-pressed', 'true');
  });

  it('states step, minimum and maximum compactly, at the value’s own scale', () => {
    // Visual closure §7 — the same three facts, without the numeric(14,4)
    // column padding leaking into the interface as "0.0100". Nothing is
    // hidden: the accessible title still spells all three out.
    render(<QuantityHost />);
    const bounds = screen.getByTestId('quantity-bounds');
    expect(bounds).toHaveTextContent('Pas 0.01 · 0.01–10.00');
    expect(bounds.getAttribute('title')).toBe('Pas de 0.01, minimum 0.01, maximum 10.00 lots');
  });

  it('disables a stepper that cannot move rather than letting it leave the bounds', () => {
    render(<QuantityHost initial="0.01" />);
    expect(screen.getByRole('button', { name: 'Diminuer la quantité' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Augmenter la quantité' })).toBeEnabled();
  });
});

describe('OrderTypeSelector', () => {
  function TypeHost() {
    const [kind, setKind] = useState<TicketOrderKind>('market');
    return <OrderTypeSelector value={kind} onChange={setKind} />;
  }

  it('offers exactly Market, Limit and Stop — no Stop Limit, no OCO, no trailing entry', () => {
    render(<TypeHost />);
    const options = within(screen.getByRole('radiogroup', { name: 'Type d’ordre' })).getAllByRole(
      'radio',
    );
    expect(options.map((option) => option.textContent)).toEqual(['Market', 'Limit', 'Stop']);
  });

  it('is one tab stop whose options move with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<TypeHost />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Market' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Limit' })).toBeChecked();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Market' })).toBeChecked();
    // Wraps rather than dead-ending at the edge.
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Stop' })).toBeChecked();
  });
});

describe('TriggerPriceControl', () => {
  const baseProps = {
    orderKind: 'limit' as const,
    spec: SPEC,
    onChange: () => {},
    error: null,
  };

  it('states the creation-side rule for the selected kind', () => {
    const { rerender } = render(<TriggerPriceControl {...baseProps} value="" />);
    expect(screen.getByTestId('trigger-price-hint')).toHaveTextContent(/Buy Limit sous l’Ask/);

    rerender(<TriggerPriceControl {...baseProps} orderKind="stop" value="" />);
    const hint = screen.getByTestId('trigger-price-hint');
    // A stop is not a guaranteed price, and the copy has to say so — briefly
    // on screen, in full in the accessible title (visual closure §11).
    expect(hint).toHaveTextContent(/pas de garantie de prix/);
    expect(hint.getAttribute('title')).toMatch(
      /écart de marché peut exécuter l’ordre au-delà du seuil/,
    );
  });

  it('no longer carries an ambiguous both-sides footer', () => {
    // Visual closure §11 — the "valid on neither side" banner that used to sit
    // here made a trader map one sentence back onto two equally emphasised
    // buttons. The guidance now lives per side on the actions themselves
    // (asserted in the ExecutionActions suite below).
    render(<TriggerPriceControl {...baseProps} orderKind="stop" value="1.08505" />);
    expect(screen.queryByTestId('trigger-price-no-side')).not.toBeInTheDocument();
  });
});

describe('ExecutionActions', () => {
  const baseProps = {
    orderKind: 'market' as TicketOrderKind,
    referencePrice: { sell: TICK.bid, buy: TICK.ask },
    creatableSides: null,
    disabled: false,
    pending: false,
    onSubmit: () => {},
  };

  it('renders Sell before Buy, each showing the price it references', () => {
    render(<ExecutionActions {...baseProps} />);
    const buttons = within(screen.getByTestId('execution-actions')).getAllByRole('button');

    expect(buttons[0]).toHaveAttribute('data-testid', 'execution-submit-sell');
    expect(buttons[1]).toHaveAttribute('data-testid', 'execution-submit-buy');
    expect(buttons[0]).toHaveTextContent('Sell');
    expect(buttons[0]).toHaveTextContent(TICK.bid);
    expect(buttons[1]).toHaveTextContent('Buy');
    expect(buttons[1]).toHaveTextContent(TICK.ask);
  });

  it('is named exactly by its verb, and describes the side and price separately', () => {
    render(<ExecutionActions {...baseProps} />);

    // The accessible *name* is the verb alone — what voice control acts on,
    // and what every exact-name selector in the E2E suite depends on.
    expect(screen.getByRole('button', { name: 'Buy' })).toHaveAttribute(
      'data-testid',
      'execution-submit-buy',
    );
    expect(screen.getByRole('button', { name: 'Sell' })).toHaveAttribute(
      'data-testid',
      'execution-submit-sell',
    );

    // The side in French and the price it references ride on the description,
    // announced right after the name.
    const buy = screen.getByTestId('execution-submit-buy');
    const describedBy = buy.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const description = document.getElementById(describedBy as string);
    expect(description?.textContent).toContain('Acheter');
    expect(description?.textContent).toContain(TICK.ask);
  });

  it('qualifies the verb for a pending order', () => {
    render(<ExecutionActions {...baseProps} orderKind="stop" />);
    expect(screen.getByTestId('execution-submit-buy')).toHaveTextContent('Buy Stop');
    expect(screen.getByTestId('execution-submit-sell')).toHaveTextContent('Sell Stop');
  });

  it('submits the side that was pressed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ExecutionActions {...baseProps} onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('execution-submit-sell'));
    expect(onSubmit).toHaveBeenCalledWith('sell');
    await user.click(screen.getByTestId('execution-submit-buy'));
    expect(onSubmit).toHaveBeenCalledWith('buy');
  });

  it('cannot be pressed while entry is blocked or a command is in flight', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(<ExecutionActions {...baseProps} disabled onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('execution-submit-buy'));
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(<ExecutionActions {...baseProps} pending onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('execution-submit-buy'));
    expect(onSubmit).not.toHaveBeenCalled();
    // The verb stays legible while the command settles.
    expect(screen.getByTestId('execution-submit-buy')).toHaveTextContent('Buy');
  });

  it('de-emphasises and labels the side the current quote cannot create', async () => {
    // Visual closure §11 — the two actions must stop being equally emphasised
    // when only one of them is creatable at the current threshold, and the
    // guidance must sit under the side it applies to rather than as one
    // ambiguous footer sentence.
    render(
      <ExecutionActions
        {...baseProps}
        orderKind="limit"
        creatableSides={{ buy: false, sell: true }}
      />,
    );

    const buy = screen.getByTestId('execution-submit-buy');
    const sell = screen.getByTestId('execution-submit-sell');
    // Outlined wash instead of the saturated fill — and deliberately not
    // `opacity`, which would composite the label with its own background and
    // fail contrast on a control that is still live. The side stays
    // identifiable through its own ring and its own 16% wash, and it loses the
    // physical key treatment so it no longer reads as the primary action.
    expect(buy.className).not.toContain(
      'bg-[color:var(--wariba-component-workstation-trading-buy)]',
    );
    expect(buy.className).toContain('wash-buy');
    expect(buy.className).toContain('ring-[color:var(--wariba-component-workstation-trading-buy)]');
    expect(buy.className).not.toContain('opacity-');
    expect(sell.className).toContain('bg-[color:var(--wariba-component-workstation-trading-sell)]');

    expect(screen.getByTestId('execution-side-unavailable-buy')).toHaveTextContent(
      'Non valide au cours actuel',
    );
    expect(screen.queryByTestId('execution-side-unavailable-sell')).not.toBeInTheDocument();

    // The description keeps the full explanation, including that the server
    // is still the authority.
    const description = document.getElementById(buy.getAttribute('aria-describedby') as string);
    expect(description?.textContent).toContain('le serveur reste juge');
  });

  it('notes a side the current market cannot create, without blocking it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ExecutionActions
        {...baseProps}
        orderKind="limit"
        creatableSides={{ buy: false, sell: true }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByTestId('execution-side-unavailable-buy')).toBeInTheDocument();
    expect(screen.queryByTestId('execution-side-unavailable-sell')).not.toBeInTheDocument();

    // The browser's quote is older than the server's; the server still answers.
    await user.click(screen.getByTestId('execution-submit-buy'));
    expect(onSubmit).toHaveBeenCalledWith('buy');
  });

  it('states that no client price is authoritative, and GTC only for pending orders', () => {
    // Visual closure §4 — the disclosure is compacted, not dropped: the short
    // form stays on screen and the full sentence is the accessible title.
    const { rerender } = render(<ExecutionActions {...baseProps} />);
    expect(screen.getByText(/exécution serveur/)).toBeInTheDocument();
    expect(screen.getByText(/exécution serveur/).getAttribute('title')).toMatch(
      /aucun prix affiché dans le navigateur n’est jamais autoritaire/,
    );
    expect(screen.queryByText(/GTC/)).not.toBeInTheDocument();

    rerender(<ExecutionActions {...baseProps} orderKind="limit" />);
    expect(screen.getByText(/GTC/)).toBeInTheDocument();
  });
});

describe('ExecutionStatus', () => {
  const openGate = deriveExecutionGate({
    connectionOk: true,
    isResyncing: false,
    tick: TICK,
    risk: null,
    quantityError: null,
    triggerPriceError: null,
    protectionError: null,
  });

  const REJECTION = {
    code: 'exposure_limit_exceeded',
    reason: 'Cet ordre dépasserait votre exposition maximale autorisée.',
    action: 'Réduisez la quantité ou fermez une position.',
  };

  it('renders nothing at all when there is nothing to say', () => {
    const { container } = render(<ExecutionStatus gate={openGate} rejection={null} risk={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the server’s reason, suggested action and code — never a generic failure', () => {
    render(<ExecutionStatus gate={openGate} rejection={REJECTION} risk={null} />);
    const notice = screen.getByTestId('execution-rejection');

    expect(notice).toHaveTextContent(REJECTION.reason);
    expect(notice).toHaveTextContent(REJECTION.action);
    expect(notice).toHaveTextContent(REJECTION.code);
    // Announced assertively: the trader asked for something and was refused.
    expect(notice).toHaveAttribute('role', 'alert');
  });

  it('explains a blocked entry, but not a field error the field already shows', () => {
    const disconnected = deriveExecutionGate({
      connectionOk: false,
      isResyncing: false,
      tick: TICK,
      risk: null,
      quantityError: null,
      triggerPriceError: null,
      protectionError: null,
    });
    const { rerender } = render(
      <ExecutionStatus gate={disconnected} rejection={null} risk={null} />,
    );
    expect(screen.getByTestId('execution-gate')).toBeInTheDocument();

    const badQuantity = deriveExecutionGate({
      connectionOk: true,
      isResyncing: false,
      tick: TICK,
      risk: null,
      quantityError: 'Doit être entre 0.01 et 10.',
      triggerPriceError: null,
      protectionError: null,
    });
    rerender(<ExecutionStatus gate={badQuantity} rejection={null} risk={null} />);
    // Repeating the field's own error as a banner adds height, not information.
    expect(screen.queryByTestId('execution-gate')).not.toBeInTheDocument();
  });

  it('says plainly that reducing and closing stay available under an entry lock', () => {
    const risk = {
      shortDurationMonitoring: { status: 'entry_locked' as const, count24h: 6 },
    } as never;
    const locked = deriveExecutionGate({
      connectionOk: true,
      isResyncing: false,
      tick: TICK,
      risk,
      quantityError: null,
      triggerPriceError: null,
      protectionError: null,
    });
    render(<ExecutionStatus gate={locked} rejection={null} risk={risk} />);

    const notice = screen.getByTestId('execution-entry-lock');
    expect(notice).toHaveTextContent(/réduire ou fermer vos positions/);
    expect(notice).toHaveTextContent(/aucune violation permanente/);
    // The fuller notice replaces the generic gate banner rather than doubling it.
    expect(screen.queryByTestId('execution-gate')).not.toBeInTheDocument();
  });

  it('shows a rejection and a monitoring warning at the same time, rejection first', () => {
    const risk = { shortDurationMonitoring: { status: 'warning' as const, count24h: 3 } } as never;
    render(<ExecutionStatus gate={openGate} rejection={REJECTION} risk={risk} />);

    const notices = Array.from(screen.getByTestId('execution-status').children);
    expect(notices.length).toBe(2);
    expect(notices[0]).toHaveAttribute('data-testid', 'execution-rejection');
    // Assertive for the refusal, polite for the standing monitoring notice.
    expect(notices[0]).toHaveAttribute('role', 'alert');
    expect(notices[1]).toHaveAttribute('role', 'status');
  });
});

describe('ExecutionImpactSummary', () => {
  const IMPACT = {
    quantityFormatted: '0.10',
    marginEstimatedFormatted: '216.92 USD',
    dailyLossRemainingFormatted: '300.00 USD',
    maximumLossRemainingFormatted: '1000.00 USD',
    compact: {
      marginEstimated: '216.92',
      dailyLossRemaining: '300.00',
      maximumLossRemaining: '1000.00',
    },
    concentration: [],
    isPriceStale: false,
  };

  it('shows the three decision figures, from the same derivation as the section', () => {
    // Visual closure §9 — identical values, one derivation. The only difference
    // from the detailed rows is that the shared unit is hoisted into the header
    // rather than repeated on every value.
    render(<ExecutionImpactSummary impact={IMPACT} />);

    expect(screen.getByTestId('execution-impact-summary-margin')).toHaveTextContent('216.92');
    expect(screen.getByTestId('execution-impact-summary-dll')).toHaveTextContent('300.00');
    expect(screen.getByTestId('execution-impact-summary-mll')).toHaveTextContent('1000.00');

    // Each value here is the detailed row's value minus its unit suffix —
    // proof the summary is a presentation of the same figure, not a second one.
    expect(IMPACT.marginEstimatedFormatted).toBe(`${IMPACT.compact.marginEstimated} USD`);
    expect(IMPACT.dailyLossRemainingFormatted).toBe(`${IMPACT.compact.dailyLossRemaining} USD`);
    expect(IMPACT.maximumLossRemainingFormatted).toBe(`${IMPACT.compact.maximumLossRemaining} USD`);
  });

  it('expands its abbreviations for assistive tech and on hover', () => {
    render(<ExecutionImpactSummary impact={IMPACT} />);
    const dll = screen.getByText('DLL', { exact: false });
    expect(dll).toHaveAttribute('title', 'Perte journalière restante');
    expect(dll.textContent).toContain('en dollars');
  });

  it('renders nothing rather than placeholders before the data exists', () => {
    const { container } = render(<ExecutionImpactSummary impact={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
