import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PositionBadge, LevelChip, LevelHandle } from '../app/(trade)/trade/ChartPositionOverlay';

describe('PositionBadge', () => {
  it('shows the position label, price and PnL, and exposes Manage/Close actions', async () => {
    const user = userEvent.setup();
    const onManage = vi.fn();
    const onClose = vi.fn();
    render(
      <PositionBadge
        y={40}
        label="ACHAT 0.50 EURUSD"
        priceFormatted="1.08452"
        pnlFormatted="+42.30 USD"
        pnlTone="positive"
        syncState="confirmed"
        syncLabel={null}
        onManage={onManage}
        onClose={onClose}
        closeDisabled={false}
        showCloseButton
      />,
    );
    expect(screen.getByText('ACHAT 0.50 EURUSD · 1.08452')).toBeInTheDocument();
    expect(screen.getByText('+42.30 USD')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    expect(onManage).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides the Close button when showCloseButton is false (narrow layout)', () => {
    render(
      <PositionBadge
        y={40}
        label="ACHAT 0.50 EURUSD"
        priceFormatted="1.08452"
        pnlFormatted="+42.30 USD"
        pnlTone="positive"
        syncState="confirmed"
        syncLabel={null}
        onManage={() => {}}
        onClose={() => {}}
        closeDisabled={false}
        showCloseButton={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();
  });
});

describe('LevelChip', () => {
  it('is disabled with a title explaining why when stale', () => {
    render(
      <LevelChip
        y={20}
        kind="stop_loss"
        disabled
        disabledReason="Prix obsolète."
        onPointerDown={() => {}}
        onActivate={() => {}}
      />,
    );
    const chip = screen.getByRole('button', { name: 'Activer un Stop Loss' });
    expect(chip).toBeDisabled();
    expect(chip).toHaveAttribute('title', 'Prix obsolète.');
  });

  it('calls onActivate on click (the non-drag, keyboard-accessible path)', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <LevelChip
        y={20}
        kind="take_profit"
        disabled={false}
        disabledReason={null}
        onPointerDown={() => {}}
        onActivate={onActivate}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Activer un Take Profit' }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

describe('LevelHandle', () => {
  const renderHandle = (overrides: Partial<Parameters<typeof LevelHandle>[0]> = {}) => {
    const onKeyboardAdjust = vi.fn();
    const onActivate = vi.fn();
    const onRemove = vi.fn();
    render(
      <LevelHandle
        y={60}
        kind="stop_loss"
        priceFormatted="1.08290"
        pnlFormatted="-81.00 USD"
        syncState="confirmed"
        disabled={false}
        onPointerDown={() => {}}
        onActivate={onActivate}
        onRemove={onRemove}
        onKeyboardAdjust={onKeyboardAdjust}
        {...overrides}
      />,
    );
    return { onKeyboardAdjust, onActivate, onRemove };
  };

  it('shows the level kind, price and estimated PnL', () => {
    renderHandle();
    expect(screen.getByText('SL · 1.08290 · -81.00 USD')).toBeInTheDocument();
  });

  it('ArrowUp/ArrowDown call onKeyboardAdjust with the correct direction — the non-drag alternative', async () => {
    const user = userEvent.setup();
    const { onKeyboardAdjust } = renderHandle();
    const handle = screen.getByRole('button', { name: /Modifier le Stop Loss/ });
    handle.focus();
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{ArrowDown}');
    expect(onKeyboardAdjust).toHaveBeenNthCalledWith(1, 1);
    expect(onKeyboardAdjust).toHaveBeenNthCalledWith(2, -1);
  });

  it('does not adjust when disabled', async () => {
    const user = userEvent.setup();
    const { onKeyboardAdjust } = renderHandle({ disabled: true });
    const handle = screen.getByRole('button', { name: /Modifier le Stop Loss/ });
    handle.focus();
    await user.keyboard('{ArrowUp}');
    expect(onKeyboardAdjust).not.toHaveBeenCalled();
  });

  it('calls onRemove when the × control is clicked', async () => {
    const user = userEvent.setup();
    const { onRemove } = renderHandle();
    await user.click(screen.getByRole('button', { name: 'Retirer le Stop Loss' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('calls onActivate on click — opens exact-price entry', async () => {
    const user = userEvent.setup();
    const { onActivate } = renderHandle();
    await user.click(screen.getByRole('button', { name: /Modifier le Stop Loss/ }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
