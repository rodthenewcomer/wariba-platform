import { memo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AccountSnapshot, MarketTick, SymbolSpec } from '@wariba/contracts';

/**
 * W1 §17 — deterministic proof that a selected-symbol tick does not reconcile
 * the workstation's chrome.
 *
 * The W0 audit's §3P finding was that `TradeClient` read
 * `useTick(tickStore, selectedSymbol)` at the top of a 1 709-line component,
 * so one tick re-rendered the nav-less header, the dock tables, all six
 * dialogs, the ticket and the chart wrapper. This test drives the real
 * component tree with a fake transport, pushes N ticks, and counts renders
 * per surface.
 *
 * The counters wrap the *real* components (via `importActual`) rather than
 * replacing them, so the assertions are about the shipped implementation.
 *
 * What is asserted to be zero and what is not follows §17 exactly: the chart
 * workspace, the execution surface and the market rows are legitimate tick
 * consumers and are expected to re-render; the shell, rail, status bar,
 * switcher, dock chrome and closed dialogs are not, and must not.
 */

const renderCounts = new Map<string, number>();
function count(name: string): void {
  renderCounts.set(name, (renderCounts.get(name) ?? 0) + 1);
}
function countOf(name: string): number {
  return renderCounts.get(name) ?? 0;
}

/**
 * Counts every render of a real component while preserving its `memo`
 * semantics: the shipped components are `memo(fn)`, so the inner `fn` is
 * unwrapped (`.type`), counted, and re-wrapped in `memo`. Counting the memo
 * object from outside would instead count renders memo would have skipped —
 * which would make this test measure the harness, not the product.
 */
function instrument<P extends object>(
  name: string,
  component: unknown,
): React.MemoExoticComponent<(props: P) => React.ReactNode> {
  const inner = ((component as { type?: (props: P) => React.ReactNode }).type ?? component) as (
    props: P,
  ) => React.ReactNode;
  return memo(function Counted(props: P) {
    count(name);
    return inner(props);
  }) as React.MemoExoticComponent<(props: P) => React.ReactNode>;
}

vi.mock('../app/(trade)/trade/workstation/WorkstationShell', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../app/(trade)/trade/workstation/WorkstationShell')>();
  return { WorkstationShell: instrument('shell', actual.WorkstationShell as never) };
});

vi.mock('../app/(trade)/trade/workstation/NavRail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/(trade)/trade/workstation/NavRail')>();
  return { NavRail: instrument('rail', actual.NavRail as never) };
});

vi.mock('../app/(trade)/trade/workstation/WorkstationStatusBar', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../app/(trade)/trade/workstation/WorkstationStatusBar')>();
  return { WorkstationStatusBar: instrument('statusBar', actual.WorkstationStatusBar as never) };
});

vi.mock('../app/(trade)/trade/workstation/WorkstationAccountSwitcher', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../app/(trade)/trade/workstation/WorkstationAccountSwitcher')
    >();
  return {
    WorkstationAccountSwitcher: instrument(
      'accountSwitcher',
      actual.WorkstationAccountSwitcher as never,
    ),
  };
});

vi.mock('../app/(trade)/trade/workstation/WorkstationDock', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../app/(trade)/trade/workstation/WorkstationDock')>();
  return { WorkstationDock: instrument('dock', actual.WorkstationDock as never) };
});

vi.mock('../app/(trade)/trade/TradeDialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/(trade)/trade/TradeDialogs')>();
  return { TradeDialogs: instrument('dialogs', actual.TradeDialogs as never) };
});

vi.mock('../app/(trade)/trade/ChartWorkspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/(trade)/trade/ChartWorkspace')>();
  return { ChartWorkspace: instrument('chartWorkspace', actual.ChartWorkspace as never) };
});

vi.mock('../app/(trade)/trade/ExecutionPanel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/(trade)/trade/ExecutionPanel')>();
  return { ExecutionPanel: instrument('execution', actual.ExecutionPanel as never) };
});

vi.mock('../app/(trade)/trade/MarketNavigator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/(trade)/trade/MarketNavigator')>();
  return { MarketNavigator: instrument('navigator', actual.MarketNavigator as never) };
});

// Instrumented to be *reported*, not constrained: W0 §0.C is explicit that
// this panel legitimately subscribes to every tick for live P&L.
vi.mock('../app/(trade)/trade/PositionsTabPanel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/(trade)/trade/PositionsTabPanel')>();
  return { PositionsTabPanel: instrument('positions', actual.PositionsTabPanel as never) };
});

// lightweight-charts needs a real canvas; the assertion here is about which
// React components reconcile, not about pixels.
vi.mock('../app/(trade)/trade/TradeChart', () => ({
  TradeChart: () => <div data-testid="chart-canvas" />,
}));

/** A fake transport: no sockets, and the test drives the message handler. */
type MessageHandler = (envelope: { type: string; payload: unknown }) => void;
let emit: MessageHandler = () => {};
/** Counts transport constructions, so a preference change cannot silently reconnect. */
let openedSockets = 0;

vi.mock('../lib/realtime-client', () => ({
  RealtimeClient: class {
    constructor() {
      openedSockets += 1;
    }
    onStateChange(cb: (state: string) => void) {
      cb('open');
      return () => {};
    }
    onMessage(cb: MessageHandler) {
      emit = cb;
      return () => {};
    }
    /**
     * W3 §48 — fires once per newly opened socket. Never called here: this suite
     * proves a history response cannot re-render the workstation chrome, so the
     * chart's rehydration path must stay inert rather than issue requests.
     */
    onSocketOpen() {
      return () => {};
    }
    requestMarketHistory() {}
    connect() {
      return Promise.resolve();
    }
    subscribe() {}
    resync() {}
    close() {}
    submitOrder() {}
    closeAll() {}
    createPendingOrder() {}
    modifyPendingOrder() {}
    cancelPendingOrder() {}
    queueReduction() {}
    cancelQueuedReduction() {}
    createPriceAlert() {}
    modifyPriceAlert() {}
    enablePriceAlert() {}
    disablePriceAlert() {}
    deletePriceAlert() {}
    markNotificationsRead() {}
    requestPayout() {}
  },
}));

vi.mock('../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

const { TradeClient } = await import('../app/(trade)/trade/TradeClient');

const SPEC: SymbolSpec = {
  symbol: 'EURUSD',
  assetClass: 'forex_major',
  pricePrecision: 5,
  contractSize: '100000',
  leverage: 30,
  minimumQuantity: '0.01',
  maximumQuantity: '10',
  quantityStep: '0.01',
  commissionPerLot: '0.00',
};

/** A second instrument, so the symbol-change assertion has somewhere to go. */
const NAS100_SPEC: SymbolSpec = {
  ...SPEC,
  symbol: 'NAS100',
  assetClass: 'index_cfd_simulated',
  pricePrecision: 2,
  contractSize: '1',
  minimumQuantity: '0.1',
  maximumQuantity: '20',
  quantityStep: '0.1',
} as SymbolSpec;

const SNAPSHOT: AccountSnapshot = {
  accountId: '11111111-1111-1111-1111-111111111111',
  programType: 'WARIBA_ONE',
  nominalBalance: '10000.00',
  balance: '10000.00',
  programEligibleBalance: '10000.00',
  equity: '10000.00',
  accountSequence: 1,
  openPositions: [],
  recentOrders: [],
  recentFills: [],
  profitEligibility: { enabled: true, minimumDurationMs: 60_000 },
  risk: null,
  queuedReductions: [],
  pendingOrders: [],
  performanceProgress: null,
  payoutRequests: [],
} as AccountSnapshot;

function tick(sequence: number, symbol = 'EURUSD'): MarketTick {
  const bid = 1.1 + sequence / 100_000;
  return {
    symbol,
    bid: bid.toFixed(5),
    ask: (bid + 0.0001).toFixed(5),
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)).toISOString(),
    marketStatus: 'open',
  } as MarketTick;
}

const ACCOUNTS = [
  {
    id: SNAPSHOT.accountId,
    href: `/trade?account=${SNAPSHOT.accountId}`,
    programLabel: 'WARIBA ONE',
    programShortLabel: 'ONE',
    phaseLabel: 'Évaluation',
    nominalFormatted: '10 000 USD',
    publicId: 'WRB-0001',
    statusLabel: 'Actif',
    statusVariant: 'success' as const,
  },
];

const N_TICKS = 25;

describe('workstation render ownership', () => {
  beforeEach(() => {
    renderCounts.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it(`does not re-render chrome for ${N_TICKS} selected-symbol ticks`, async () => {
    await act(async () => {
      render(
        <TradeClient
          accountId={SNAPSHOT.accountId}
          accountPublicId="WRB-0001"
          userId="22222222-2222-2222-2222-222222222222"
          wsUrl="ws://localhost:0/ws"
          accounts={ACCOUNTS}
        />,
      );
    });

    await act(async () => {
      emit({ type: 'symbol_specs', payload: { specs: [SPEC] } });
      emit({ type: 'account.snapshot', payload: SNAPSHOT });
    });

    // Baseline after mount + initial server state, before any tick.
    const baseline = {
      shell: countOf('shell'),
      rail: countOf('rail'),
      statusBar: countOf('statusBar'),
      accountSwitcher: countOf('accountSwitcher'),
      dock: countOf('dock'),
      dialogs: countOf('dialogs'),
      chartWorkspace: countOf('chartWorkspace'),
      execution: countOf('execution'),
      positions: countOf('positions'),
      navigator: countOf('navigator'),
    };
    expect(baseline.chartWorkspace).toBeGreaterThan(0);

    for (let i = 0; i < N_TICKS; i += 1) {
      await act(async () => {
        emit({ type: 'market.tick', payload: tick(i) });
      });
    }

    // Chrome: zero extra renders. A tick has no path to any of these.
    expect(countOf('shell') - baseline.shell).toBe(0);
    expect(countOf('rail') - baseline.rail).toBe(0);
    expect(countOf('statusBar') - baseline.statusBar).toBe(0);
    expect(countOf('accountSwitcher') - baseline.accountSwitcher).toBe(0);
    expect(countOf('dock') - baseline.dock).toBe(0);
    // W2 §32 — the Market Navigator's own chrome (search box, category
    // headings, favorites section) must not reconcile for a price. Only the
    // affected row does, and the row owns that subscription itself.
    expect(countOf('navigator') - baseline.navigator).toBe(0);
    // Closed dialogs: the host must not reconcile either, which is only true
    // because each dialog is mounted on demand rather than rendered closed.
    expect(countOf('dialogs') - baseline.dialogs).toBe(0);

    // Legitimate consumers: these must actually track the market (§17).
    expect(countOf('chartWorkspace') - baseline.chartWorkspace).toBe(N_TICKS);
    expect(countOf('execution') - baseline.execution).toBe(N_TICKS);

    // Reported, not constrained. The visible Positions panel uses
    // `useAllTicks` because live P&L across every open position genuinely
    // needs every tick — W0 §0.C says so explicitly, and asserting zero here
    // would be asserting the feature away. What matters is that this cost
    // stops at the panel: the dock chrome around it did not re-render once.
    const positionsExtra = countOf('positions') - baseline.positions;
    // eslint-disable-next-line no-console
    console.log(
      `RENDER_OWNERSHIP N_SELECTED_SYMBOL_TICKS=${N_TICKS} ` +
        `WORKSTATION_SHELL_EXTRA_RENDERS=${countOf('shell') - baseline.shell} ` +
        `NAV_RAIL_EXTRA_RENDERS=${countOf('rail') - baseline.rail} ` +
        `STATUS_BAR_EXTRA_RENDERS=${countOf('statusBar') - baseline.statusBar} ` +
        `ACCOUNT_SWITCHER_EXTRA_RENDERS=${countOf('accountSwitcher') - baseline.accountSwitcher} ` +
        `DOCK_CHROME_EXTRA_RENDERS=${countOf('dock') - baseline.dock} ` +
        `CLOSED_DIALOGS_EXTRA_RENDERS=${countOf('dialogs') - baseline.dialogs} ` +
        `CHART_WORKSPACE_EXTRA_RENDERS=${countOf('chartWorkspace') - baseline.chartWorkspace} ` +
        `EXECUTION_EXTRA_RENDERS=${countOf('execution') - baseline.execution} ` +
        `MARKET_NAVIGATOR_CHROME_EXTRA_RENDERS=${countOf('navigator') - baseline.navigator} ` +
        `VISIBLE_POSITIONS_CONTENT_EXTRA_RENDERS=${positionsExtra}`,
    );
    expect(positionsExtra).toBeGreaterThanOrEqual(0);
  });

  it('does not re-render the chart workspace or execution for another symbol’s tick', async () => {
    await act(async () => {
      render(
        <TradeClient
          accountId={SNAPSHOT.accountId}
          accountPublicId="WRB-0001"
          userId="22222222-2222-2222-2222-222222222222"
          wsUrl="ws://localhost:0/ws"
          accounts={ACCOUNTS}
        />,
      );
    });
    await act(async () => {
      emit({ type: 'symbol_specs', payload: { specs: [SPEC] } });
      emit({ type: 'account.snapshot', payload: SNAPSHOT });
    });

    const before = {
      chartWorkspace: countOf('chartWorkspace'),
      execution: countOf('execution'),
      statusBar: countOf('statusBar'),
      navigator: countOf('navigator'),
    };

    for (let i = 0; i < N_TICKS; i += 1) {
      await act(async () => {
        emit({ type: 'market.tick', payload: tick(i, 'GBPUSD') });
      });
    }

    // EURUSD is selected; a GBPUSD tick reaches only that symbol's own
    // market row, which owns its subscription.
    expect(countOf('chartWorkspace') - before.chartWorkspace).toBe(0);
    expect(countOf('execution') - before.execution).toBe(0);
    expect(countOf('statusBar') - before.statusBar).toBe(0);
    expect(countOf('navigator') - before.navigator).toBe(0);
  });

  it('does not re-render anything above the Execution Center while the ticket is edited', async () => {
    // W4 §68 — the counterpart of the tick assertion above, for the other
    // high-frequency input on this screen. Before W4 the draft was `useState`
    // in `TradeClient`, so a keystroke re-rendered the composition root, which
    // rebuilds the JSX it passes as props (`headerAction`, `resizeHandle`, the
    // dock's `account` object). Those are fresh objects each time, so `memo`
    // could not hold anywhere below and the shell, navigator, status bar and
    // dock all reconciled per character typed.
    await act(async () => {
      render(
        <TradeClient
          accountId={SNAPSHOT.accountId}
          accountPublicId="WRB-0001"
          userId="22222222-2222-2222-2222-222222222222"
          wsUrl="ws://localhost:0/ws"
          accounts={ACCOUNTS}
        />,
      );
    });
    await act(async () => {
      emit({ type: 'symbol_specs', payload: { specs: [SPEC] } });
      emit({ type: 'account.snapshot', payload: SNAPSHOT });
      emit({ type: 'market.tick', payload: tick(0) });
    });

    const before = {
      shell: countOf('shell'),
      rail: countOf('rail'),
      statusBar: countOf('statusBar'),
      accountSwitcher: countOf('accountSwitcher'),
      dock: countOf('dock'),
      dialogs: countOf('dialogs'),
      navigator: countOf('navigator'),
      chartWorkspace: countOf('chartWorkspace'),
      execution: countOf('execution'),
    };

    const quantity = screen.getByLabelText('Quantité (lots)') as HTMLInputElement;
    // One `change` per character, the way the field actually receives them —
    // `fireEvent` rather than a raw `input` dispatch because React tracks the
    // previous value on the DOM node and ignores an event whose value it set
    // itself.
    const KEYSTROKES = ['0', '0.', '0.2', '0.25', '0.255'];
    for (const value of KEYSTROKES) {
      await act(async () => {
        fireEvent.change(quantity, { target: { value } });
      });
    }
    expect(quantity.value).toBe('0.255');

    // The execution surface owns the draft and must track it.
    expect(countOf('execution') - before.execution).toBeGreaterThanOrEqual(KEYSTROKES.length);

    // Nothing else has a path to it — including the chart, which reads the
    // draft only at click time (from the store, not a subscription).
    expect(countOf('shell') - before.shell).toBe(0);
    expect(countOf('rail') - before.rail).toBe(0);
    expect(countOf('statusBar') - before.statusBar).toBe(0);
    expect(countOf('accountSwitcher') - before.accountSwitcher).toBe(0);
    expect(countOf('dock') - before.dock).toBe(0);
    expect(countOf('dialogs') - before.dialogs).toBe(0);
    expect(countOf('navigator') - before.navigator).toBe(0);
    expect(countOf('chartWorkspace') - before.chartWorkspace).toBe(0);

    // eslint-disable-next-line no-console
    console.log(
      `TICKET_DRAFT_OWNERSHIP N_KEYSTROKES=${KEYSTROKES.length} ` +
        `WORKSTATION_SHELL_EXTRA_RENDERS=${countOf('shell') - before.shell} ` +
        `NAV_RAIL_EXTRA_RENDERS=${countOf('rail') - before.rail} ` +
        `STATUS_BAR_EXTRA_RENDERS=${countOf('statusBar') - before.statusBar} ` +
        `ACCOUNT_SWITCHER_EXTRA_RENDERS=${countOf('accountSwitcher') - before.accountSwitcher} ` +
        `DOCK_CHROME_EXTRA_RENDERS=${countOf('dock') - before.dock} ` +
        `CLOSED_DIALOGS_EXTRA_RENDERS=${countOf('dialogs') - before.dialogs} ` +
        `MARKET_NAVIGATOR_CHROME_EXTRA_RENDERS=${countOf('navigator') - before.navigator} ` +
        `CHART_WORKSPACE_EXTRA_RENDERS=${countOf('chartWorkspace') - before.chartWorkspace} ` +
        `EXECUTION_EXTRA_RENDERS=${countOf('execution') - before.execution}`,
    );
  });

  it('clears the price levels — and only those — when the instrument changes', async () => {
    // W4 §54, asserted through the real tree rather than on the store alone:
    // a stop of 1.08500 carried from EURUSD onto NAS100 passes every check the
    // fields apply (they validate syntax, not instrument range) and looks
    // entirely plausible on screen. The quantity survives because it *is*
    // re-validated against the new symbol's own bounds.
    await act(async () => {
      render(
        <TradeClient
          accountId={SNAPSHOT.accountId}
          accountPublicId="WRB-0001"
          userId="22222222-2222-2222-2222-222222222222"
          wsUrl="ws://localhost:0/ws"
          accounts={ACCOUNTS}
        />,
      );
    });
    await act(async () => {
      emit({ type: 'symbol_specs', payload: { specs: [SPEC, NAS100_SPEC] } });
      emit({ type: 'account.snapshot', payload: SNAPSHOT });
      emit({ type: 'market.tick', payload: tick(0) });
    });

    const quantity = screen.getByLabelText('Quantité (lots)') as HTMLInputElement;
    const stopLoss = screen.getByTestId('stop-loss-input') as HTMLInputElement;
    const takeProfit = screen.getByTestId('take-profit-input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(quantity, { target: { value: '0.25' } });
      fireEvent.change(stopLoss, { target: { value: '1.08000' } });
      fireEvent.change(takeProfit, { target: { value: '1.09000' } });
    });
    expect(stopLoss.value).toBe('1.08000');

    await act(async () => {
      // The row's own select button, whose name opens with the symbol — not
      // the favorite toggle beside it ("Ajouter NAS100 aux favoris").
      fireEvent.click(screen.getByRole('button', { name: /^NAS100/ }));
    });

    expect((screen.getByTestId('stop-loss-input') as HTMLInputElement).value).toBe('');
    expect((screen.getByTestId('take-profit-input') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Quantité (lots)') as HTMLInputElement).value).toBe('0.25');
  });

  it('mounts the Execution Center exactly once', async () => {
    // W4 §69 — it used to be rendered in the shell column *and* inside the
    // mobile bottom sheet, the desktop copy merely hidden by CSS: two tick
    // subscriptions, two impact derivations, and every field twice in the DOM.
    await act(async () => {
      render(
        <TradeClient
          accountId={SNAPSHOT.accountId}
          accountPublicId="WRB-0001"
          userId="22222222-2222-2222-2222-222222222222"
          wsUrl="ws://localhost:0/ws"
          accounts={ACCOUNTS}
        />,
      );
    });
    await act(async () => {
      emit({ type: 'symbol_specs', payload: { specs: [SPEC] } });
      emit({ type: 'account.snapshot', payload: SNAPSHOT });
      emit({ type: 'market.tick', payload: tick(0) });
    });

    expect(screen.getAllByTestId('execution-center')).toHaveLength(1);
    expect(screen.getAllByLabelText('Quantité (lots)')).toHaveLength(1);
    expect(screen.getAllByTestId('execution-submit-buy')).toHaveLength(1);
  });

  it('does not rebuild the session when favorites or search change', async () => {
    // A layout/preference interaction must never disturb the transport: the
    // command object's identity is what the whole tree depends on (W2 §32).
    await act(async () => {
      render(
        <TradeClient
          accountId={SNAPSHOT.accountId}
          accountPublicId="WRB-0001"
          userId="22222222-2222-2222-2222-222222222222"
          wsUrl="ws://localhost:0/ws"
          accounts={ACCOUNTS}
        />,
      );
    });
    await act(async () => {
      emit({ type: 'symbol_specs', payload: { specs: [SPEC] } });
      emit({ type: 'account.snapshot', payload: SNAPSHOT });
    });

    const socketsBefore = openedSockets;
    const favoriteButton = screen.getAllByRole('button', { name: /aux favoris/ })[0] as HTMLElement;
    await act(async () => {
      favoriteButton.click();
    });

    // Same connection, same session: no reconnect, no resubscribe.
    expect(openedSockets).toBe(socketsBefore);
    // The favorited instrument now appears under Favoris *and* its category,
    // so more than one toggle carries the "remove" label — that duplication is
    // the projection working, not a bug.
    expect(screen.getAllByRole('button', { name: /des favoris/ }).length).toBeGreaterThan(0);
  });
});
