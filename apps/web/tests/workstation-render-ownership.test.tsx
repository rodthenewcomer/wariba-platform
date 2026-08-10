import { memo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
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

vi.mock('../lib/realtime-client', () => ({
  RealtimeClient: class {
    onStateChange(cb: (state: string) => void) {
      cb('open');
      return () => {};
    }
    onMessage(cb: MessageHandler) {
      emit = cb;
      return () => {};
    }
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
  pricePrecision: 5,
  contractSize: '100000',
  leverage: 30,
  minimumQuantity: '0.01',
  maximumQuantity: '10',
  quantityStep: '0.01',
  commissionPerLot: '0.00',
};

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
  });
});
