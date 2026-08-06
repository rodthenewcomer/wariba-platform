import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LevelSyncState } from '../app/(trade)/trade/ChartPositionOverlay';
import { AlertLine, PendingOrderLine } from '../app/(trade)/trade/ChartPendingOverlay';

/**
 * Appendix 07-D acceptance gate 4 — before this gate, PendingOrderLine and
 * AlertLine accepted a `syncState` prop but never rendered anything derived
 * from it besides an optional focus ring; there was no dot at all, so
 * `pending_server` and the (previously nonexistent) `rejected` state were
 * visually indistinguishable from `confirmed`. This locks in that each
 * state now renders its own, distinct dot color.
 */

const ORDER_PROPS = {
  y: 10,
  orderType: 'buy_limit' as const,
  quantityFormatted: '0.10',
  priceFormatted: '1.08400',
  distancePointsFormatted: '12',
  disabled: false,
  onPointerDown: vi.fn(),
  onActivate: vi.fn(),
  onRemove: vi.fn(),
  onKeyboardAdjust: vi.fn(),
};

const ALERT_PROPS = {
  y: 10,
  direction: 'cross_above' as const,
  priceFormatted: '1.09000',
  disabled: false,
  onPointerDown: vi.fn(),
  onActivate: vi.fn(),
  onRemove: vi.fn(),
  onKeyboardAdjust: vi.fn(),
};

function dotClassName(container: HTMLElement): string {
  const dot = container.querySelector('[aria-hidden="true"]');
  if (!dot) throw new Error('expected a sync-state dot to render');
  return dot.className;
}

const STATES: LevelSyncState[] = [
  'confirmed',
  'dragging_preview',
  'pending_server',
  'stale_disabled',
  'rejected',
];

describe('PendingOrderLine sync-state dot', () => {
  it.each(STATES)('renders a visible dot for syncState=%s', (syncState) => {
    const { container } = render(<PendingOrderLine {...ORDER_PROPS} syncState={syncState} />);
    expect(dotClassName(container)).toContain('rounded-full');
  });

  it('gives pending_server, rejected, and confirmed each a visually distinct color', () => {
    const confirmed = dotClassName(
      render(<PendingOrderLine {...ORDER_PROPS} syncState="confirmed" />).container,
    );
    const pending = dotClassName(
      render(<PendingOrderLine {...ORDER_PROPS} syncState="pending_server" />).container,
    );
    const rejected = dotClassName(
      render(<PendingOrderLine {...ORDER_PROPS} syncState="rejected" />).container,
    );
    expect(new Set([confirmed, pending, rejected]).size).toBe(3);
  });

  it('marks a rejected trigger-price drag with a danger-toned ring around the whole line', () => {
    const { container } = render(<PendingOrderLine {...ORDER_PROPS} syncState="rejected" />);
    expect(container.querySelector('.ring-1')?.className).toContain('danger');
  });
});

describe('AlertLine sync-state dot', () => {
  it.each(STATES)('renders a visible dot for syncState=%s', (syncState) => {
    const { container } = render(<AlertLine {...ALERT_PROPS} syncState={syncState} />);
    expect(dotClassName(container)).toContain('rounded-full');
  });

  it('gives pending_server, rejected, and confirmed each a visually distinct color', () => {
    const confirmed = dotClassName(
      render(<AlertLine {...ALERT_PROPS} syncState="confirmed" />).container,
    );
    const pending = dotClassName(
      render(<AlertLine {...ALERT_PROPS} syncState="pending_server" />).container,
    );
    const rejected = dotClassName(
      render(<AlertLine {...ALERT_PROPS} syncState="rejected" />).container,
    );
    expect(new Set([confirmed, pending, rejected]).size).toBe(3);
  });
});
