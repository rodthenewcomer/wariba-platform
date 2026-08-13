import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AccountRisk, AccountSnapshot } from '@wariba/contracts';
import { NavRail } from '../app/(trade)/trade/workstation/NavRail';
import { WorkstationDock } from '../app/(trade)/trade/workstation/WorkstationDock';
import { WorkstationStatusBar } from '../app/(trade)/trade/workstation/WorkstationStatusBar';
import { WorkstationAccountSwitcher } from '../app/(trade)/trade/workstation/WorkstationAccountSwitcher';
import { createTickStore } from '../app/(trade)/trade/tick-store';

const EVALUATION = {
  id: 'acc-eval',
  href: '/trade?account=acc-eval',
  programLabel: 'WARIBA ONE',
  programShortLabel: 'ONE',
  phaseLabel: 'Évaluation',
  nominalFormatted: '10 000 USD',
  publicId: 'WRB-EVAL-01',
  statusLabel: 'Actif',
  statusVariant: 'success' as const,
};

const PERFORMANCE = {
  id: 'acc-perf',
  href: '/trade?account=acc-perf',
  programLabel: 'WARIBA Performance',
  programShortLabel: 'PERF',
  phaseLabel: 'Performance',
  nominalFormatted: '50 000 USD',
  publicId: 'WRB-PERF-01',
  statusLabel: 'Actif',
  statusVariant: 'success' as const,
};

const RISK: AccountRisk = {
  status: 'active',
  programEligibleBalance: '10000.00',
  programEligibleEquity: '10000.00',
  target: { required: '1000.00', current: '250.00', reached: false },
  dailyLoss: {
    reference: '10000.00',
    floor: '9500.00',
    used: '100.00',
    remaining: '400.00',
    softLockTriggered: false,
  },
  maximumLoss: { floor: '9000.00', remaining: '1000.00', breached: false },
  bestDay: { ratio: '0.30', compliant: true },
  eligibility: { passEligible: false, blockingReasons: [] },
  concentration: [],
  shortDurationMonitoring: { status: 'normal', count24h: 0 },
} as AccountRisk;

function statusBar(props: Partial<React.ComponentProps<typeof WorkstationStatusBar>> = {}) {
  return render(
    <WorkstationStatusBar
      accounts={[EVALUATION, PERFORMANCE]}
      activeAccountId={EVALUATION.id}
      balanceFormatted="10 000.00 USD"
      equityFormatted="10 050.00 USD"
      risk={RISK}
      connectionOk
      isResyncing={false}
      unreadCount={0}
      onOpenNotifications={() => {}}
      {...props}
    />,
  );
}

describe('NavRail', () => {
  it('exposes an accessible name for every icon destination', () => {
    render(<NavRail currentPath="/trade" />);
    const rail = screen.getByRole('navigation', { name: 'Navigation WariX' });
    for (const label of ['Trade', 'Hub', 'Comptes', 'Payouts', 'Plus']) {
      expect(within(rail).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the current route and only that route', () => {
    render(<NavRail currentPath="/trade" />);
    expect(screen.getByRole('link', { name: 'Trade' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Hub' })).not.toHaveAttribute('aria-current');
  });

  it('links only to routes that exist, and never to Control', () => {
    // W1 §10 — the W0 diagram named Performance/Risk/Settings; none of those
    // routes exist, so the rail must not invent them.
    render(<NavRail currentPath="/trade" />);
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/trade', '/hub', '/comptes', '/payouts', '/plus']);
    expect(hrefs.some((href) => href?.startsWith('/control'))).toBe(false);
  });
});

describe('WorkstationAccountSwitcher', () => {
  it('distinguishes Evaluation from Performance', async () => {
    render(
      <WorkstationAccountSwitcher
        accounts={[EVALUATION, PERFORMANCE]}
        activeAccountId={EVALUATION.id}
      />,
    );
    await userEvent.click(screen.getByRole('group').querySelector('summary') as HTMLElement);
    const menu = screen.getByRole('navigation', { name: 'Changer de compte' });
    expect(within(menu).getByText('Évaluation')).toBeInTheDocument();
    expect(within(menu).getByText('Performance')).toBeInTheDocument();
    expect(within(menu).getByText('WARIBA ONE')).toBeInTheDocument();
    expect(within(menu).getByText('WARIBA Performance')).toBeInTheDocument();
  });

  it('switches via ordinary anchors, one per account (UX-NAV-001)', async () => {
    render(
      <WorkstationAccountSwitcher
        accounts={[EVALUATION, PERFORMANCE]}
        activeAccountId={EVALUATION.id}
      />,
    );
    await userEvent.click(screen.getByRole('group').querySelector('summary') as HTMLElement);
    const menu = screen.getByRole('navigation', { name: 'Changer de compte' });
    const links = within(menu).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/trade?account=acc-eval',
      '/trade?account=acc-perf',
    ]);
    // Real anchors: middle-click / open-in-new-tab keep working, and no
    // client-side router can preserve stale account context.
    for (const link of links) expect(link.tagName).toBe('A');
    expect(links[0]).toHaveAttribute('aria-current', 'page');
  });

  it('shows the canonical public id, never an internal identifier', () => {
    render(<WorkstationAccountSwitcher accounts={[EVALUATION]} activeAccountId={EVALUATION.id} />);
    expect(screen.getByText('WRB-EVAL-01')).toBeInTheDocument();
    expect(screen.queryByText(/acc-eval/i)).not.toBeInTheDocument();
  });

  it('renders identity without a disclosure when there is nothing to switch to', () => {
    render(<WorkstationAccountSwitcher accounts={[EVALUATION]} activeAccountId={EVALUATION.id} />);
    expect(screen.queryByRole('navigation', { name: 'Changer de compte' })).not.toBeInTheDocument();
    expect(screen.getByTestId('workstation-account-identity')).toBeInTheDocument();
  });
});

describe('WorkstationStatusBar', () => {
  it('labels every value it shows', () => {
    statusBar();
    // Scoped to the metric list: the risk-detail sheet renders the same
    // figures in its (closed) body, which is not what this asserts.
    // Each metric renders its label three ways — an always-present accessible
    // name plus a short and a full visible variant that CSS swaps at `sm`
    // (W2 §25). All three are in the DOM, so assert presence, not uniqueness.
    const metrics = within(screen.getByTestId('workstation-metrics'));
    expect(metrics.getAllByText('Equity').length).toBeGreaterThan(0);
    expect(metrics.getAllByText('DLL restant').length).toBeGreaterThan(0);
    expect(metrics.getAllByText('Perte max restante').length).toBeGreaterThan(0);
    // Visual closure §6 — the currency is drawn a step below its figure, so the
    // amount and its unit are separate elements inside one `<dd>`. The announced
    // and displayed value is still "10 050.00 USD"; only the type size differs
    // between the two halves.
    expect(metrics.getAllByText('10 050.00').length).toBeGreaterThan(0);
    expect(metrics.getAllByText('400.00').length).toBeGreaterThan(0);
    expect(metrics.getAllByText('USD').length).toBeGreaterThan(0);
    const equity = metrics.getAllByRole('definition')[0] as HTMLElement;
    expect(equity.textContent).toContain('10 050.00 USD');
    // The phone-width labels stay short; no figure is dropped with them.
    expect(metrics.getAllByText('Eq').length).toBeGreaterThan(0);
    expect(metrics.getAllByText('DLL').length).toBeGreaterThan(0);
  });

  it('reports transport state exactly once, and never as account status', () => {
    // W0 §3B: the pre-W1 header rendered connection state twice, as "Actif"
    // on the account context and again as the RiskRibbon's own dot. Only the
    // transport chip carries it now; "Actif" in the switcher is the
    // *account's* status, a different fact entirely.
    statusBar();
    const bar = within(screen.getByTestId('workstation-status-bar'));
    expect(bar.queryByText('Reconnexion…')).not.toBeInTheDocument();
    // The transport chip is the only place the connection is reported, and it
    // exposes the state as data so tests never depend on French copy.
    const chip = screen.getByTestId('workstation-connection');
    expect(chip).toHaveAttribute('data-connection', 'open');
    expect(chip).toHaveTextContent('Connecté');
    // "Actif" appears only as the account's own status inside the switcher.
    const metrics = within(screen.getByTestId('workstation-metrics'));
    expect(metrics.queryByText('Actif')).not.toBeInTheDocument();
  });

  it('distinguishes resynchronising from disconnected', () => {
    const resyncing = statusBar({ connectionOk: false, isResyncing: true });
    expect(screen.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'resyncing',
    );
    resyncing.unmount();
    statusBar({ connectionOk: false, isResyncing: false });
    expect(screen.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'closed',
    );
  });

  it('does not present the selected symbol’s market status as account state', () => {
    // W1 §11 — selected-market state belongs with the chart workspace.
    statusBar();
    expect(screen.queryByText(/Marché/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Périmé/)).not.toBeInTheDocument();
  });

  it('surfaces short-duration monitoring rather than hiding it', () => {
    statusBar({
      risk: { ...RISK, shortDurationMonitoring: { status: 'entry_locked', count24h: 6 } },
    });
    expect(screen.getByText('Ouvertures suspendues')).toBeInTheDocument();
  });

  it('shows an unread notification count', () => {
    statusBar({ unreadCount: 3 });
    expect(screen.getByTestId('workstation-notifications')).toHaveTextContent('3');
  });

  it('renders placeholders, never invented numbers, before the first snapshot', () => {
    statusBar({ risk: null, balanceFormatted: '—', equityFormatted: '—' });
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});

const EMPTY_SNAPSHOT = {
  accountId: 'acc-eval',
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

function dock(snapshot: AccountSnapshot | null) {
  return render(
    <WorkstationDock
      store={createTickStore()}
      snapshot={snapshot}
      symbolSpecs={{}}
      tab="positions"
      onTabChange={vi.fn()}
      collapsed={false}
      onToggleCollapsed={vi.fn()}
      pending={false}
      onClosePosition={vi.fn()}
      onModifyPosition={vi.fn()}
      onPartialClosePosition={vi.fn()}
      onOpenCloseAll={vi.fn()}
      onManagePendingOrder={vi.fn()}
      onCancelPendingOrder={vi.fn()}
      alerts={[]}
      notifications={[]}
      onEnableAlert={vi.fn()}
      onDisableAlert={vi.fn()}
      onDeleteAlert={vi.fn()}
      onManageAlerts={vi.fn()}
      account={{
        accountId: 'acc-eval',
        accountPublicId: 'WRB-EVAL-01',
        programLabel: 'WARIBA ONE',
        phaseLabel: 'Évaluation',
        accountStatusLabel: 'Actif',
        nominalFormatted: '10 000 USD',
      }}
    />,
  );
}

describe('WorkstationDock', () => {
  it('contains its tab strip inside its own horizontal scroll box', () => {
    // W1 §19 — the W0 audit measured scrollWidth 425 > clientWidth 390 at a
    // 390px viewport, caused by this six-button strip widening the document.
    dock(EMPTY_SNAPSHOT);
    const strip = screen.getByTestId('workstation-dock-tabs');
    expect(strip.className).toContain('overflow-x-auto');
    expect(strip.className).toContain('min-w-0');
  });

  it('has exactly the final W2 membership', () => {
    dock(EMPTY_SNAPSHOT);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Positions',
      'Orders',
      'Trades',
      'Alerts',
      'Account',
    ]);
  });

  it('no longer offers Payout — it lives on its canonical /payouts route', () => {
    // Asserted on a Performance account, the only program that ever had the tab.
    dock({ ...EMPTY_SNAPSHOT, programType: 'WARIBA_PERFORMANCE' });
    expect(screen.queryByRole('tab', { name: 'Payout' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Positions',
      'Orders',
      'Trades',
      'Alerts',
      'Account',
    ]);
  });

  it('has no Journal placeholder — deleted, not replaced by another "coming soon"', () => {
    dock(EMPTY_SNAPSHOT);
    expect(screen.queryByRole('tab', { name: 'Journal' })).not.toBeInTheDocument();
    expect(screen.queryByText(/arrive dans un prompt/i)).not.toBeInTheDocument();
  });

  it('counts only what is unambiguous', () => {
    // Positions/Orders/Alerts each describe a complete current set; Trades is
    // a bounded recent window and must not carry a number that reads as a
    // lifetime total (W2 §28).
    dock(EMPTY_SNAPSHOT);
    expect(screen.getByRole('tab', { name: /^Trades$/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Account$/ })).toBeInTheDocument();
  });
});
