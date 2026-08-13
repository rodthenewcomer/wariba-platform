import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigatorOverlay } from '../app/(trade)/trade/workstation/NavigatorOverlay';
import { WorkstationShell } from '../app/(trade)/trade/workstation/WorkstationShell';

/**
 * Final closure §24 — the 1024–1279 hybrid contract, asserted rather than
 * asserted-about.
 *
 * The visual half of the decision (chart authority at 1024) is evidence; this
 * file covers the behavioural half: the overlay dismisses the way a floating
 * desktop panel must, and — the part that actually matters for the chart — it
 * never becomes a grid track, so the plot cannot reflow when it opens.
 */

function slots(overrides: Partial<Parameters<typeof WorkstationShell>[0]> = {}) {
  return {
    navigatorWidth: 244,
    navigatorCollapsed: false,
    dockHeight: 220,
    dockCollapsed: false,
    navigatorResizeHandle: null,
    navigatorRestore: <button type="button">Marchés</button>,
    rail: <nav aria-label="rail" />,
    statusBar: <header>status</header>,
    mobileMarketTrigger: null,
    navigator: (
      <div data-testid="navigator-content">
        <input aria-label="Rechercher un instrument" />
      </div>
    ),
    chart: <div data-testid="chart">chart</div>,
    mobileExecutionAction: null,
    execution: <div>execution</div>,
    dock: <div>dock</div>,
    ...overrides,
  };
}

describe('hybrid Navigator placement (§24)', () => {
  it('never contributes a grid track while overlaid, so the chart column cannot change', () => {
    const { rerender, container } = render(
      <WorkstationShell
        {...slots({ navigatorOverlay: true, onNavigatorOverlayDismiss: vi.fn() })}
      />,
    );

    const shell = container.querySelector('[data-testid="workstation-shell"]') as HTMLElement;
    const columnsWhileOpen = shell.style.gridTemplateColumns;
    expect(screen.getByTestId('market-navigator-overlay')).toBeInTheDocument();
    // The overlay is *not* the track — the track must be absent entirely.
    expect(screen.queryByTestId('market-navigator-track')).not.toBeInTheDocument();

    rerender(
      <WorkstationShell
        {...slots({
          navigatorOverlay: true,
          navigatorCollapsed: true,
          onNavigatorOverlayDismiss: vi.fn(),
        })}
      />,
    );

    expect(screen.queryByTestId('market-navigator-overlay')).not.toBeInTheDocument();
    // Identical column template open and closed: the chart cell is handed the
    // same space either way, which is the whole point of the overlay.
    expect(
      (container.querySelector('[data-testid="workstation-shell"]') as HTMLElement).style
        .gridTemplateColumns,
    ).toBe(columnsWhileOpen);
    expect(columnsWhileOpen).toContain('0px');
  });

  it('keeps exactly one Navigator tree in the document', () => {
    render(
      <WorkstationShell
        {...slots({ navigatorOverlay: true, onNavigatorOverlayDismiss: vi.fn() })}
      />,
    );
    expect(screen.getAllByTestId('navigator-content')).toHaveLength(1);
  });

  it('renders the track, not an overlay, outside the hybrid band', () => {
    render(<WorkstationShell {...slots()} />);
    expect(screen.getByTestId('market-navigator-track')).toBeInTheDocument();
    expect(screen.queryByTestId('market-navigator-overlay')).not.toBeInTheDocument();
  });
});

describe('hybrid Navigator overlay behaviour (§24)', () => {
  function overlay(onDismiss = vi.fn()) {
    const utils = render(
      <div>
        <button type="button" data-testid="outside">
          chart
        </button>
        <NavigatorOverlay width={244} onDismiss={onDismiss}>
          <input aria-label="Rechercher un instrument" />
        </NavigatorOverlay>
      </div>,
    );
    return { ...utils, onDismiss };
  }

  it('moves focus into the panel when it opens', () => {
    overlay();
    expect(screen.getByLabelText('Rechercher un instrument')).toHaveFocus();
  });

  it('dismisses on Escape', async () => {
    const { onDismiss } = overlay();
    await userEvent.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on a pointer outside, and not on one inside', () => {
    const { onDismiss } = overlay();

    fireEvent.pointerDown(screen.getByLabelText('Rechercher un instrument'));
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('returns focus to whatever opened it, by every dismissal path', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    expect(opener).toHaveFocus();

    const { unmount } = render(
      <NavigatorOverlay width={244} onDismiss={vi.fn()}>
        <input aria-label="Rechercher un instrument" />
      </NavigatorOverlay>,
    );
    expect(screen.getByLabelText('Rechercher un instrument')).toHaveFocus();

    // Unmount is the single path every dismissal funnels through — Escape, an
    // outside pointer, the collapse control and choosing a symbol all end here.
    act(() => unmount());
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('stops listening once dismissed, so it cannot swallow a later chart gesture', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <NavigatorOverlay width={244} onDismiss={onDismiss}>
        <input aria-label="Rechercher un instrument" />
      </NavigatorOverlay>,
    );
    act(() => unmount());

    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not trap focus — the chart and Execution Center stay reachable', async () => {
    overlay();
    // A modal would keep Tab inside the panel. This is a desktop panel beside a
    // live market: Tab must be able to leave it.
    await userEvent.tab();
    expect(screen.getByLabelText('Rechercher un instrument')).not.toHaveFocus();
  });
});

describe('reduced motion (§9)', () => {
  it('neutralises every decorative duration at the stylesheet level', async () => {
    // The workstation's motion is CSS transitions and one keyframe animation,
    // so the guarantee has to live in the stylesheet rather than in each
    // component — otherwise every new transition would be a new place to forget.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('animation-duration: var(--wariba-motion-duration-reduced, 1ms)');
    expect(block).toContain('transition-duration: var(--wariba-motion-duration-reduced, 1ms)');
    expect(block).toContain('animation-iteration-count: 1');
    // Applied to every element and both pseudo-elements: the Buy/Sell key's
    // travel, the sheet's entrance and the popover fade are all covered.
    expect(block).toMatch(/\*,\s*\*::before,\s*\*::after/);
  });
});
