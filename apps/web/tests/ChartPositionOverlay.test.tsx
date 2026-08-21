import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  PositionProtectionControls,
  PositionChip,
  TradeLevelChip,
} from '../app/(trade)/trade/ChartPositionOverlay';

/**
 * VX1 §12-§18 — the live trade objects.
 *
 * These assert the two things a chart chip must never lose in a visual pass:
 * the money is stated and named for assistive technology, and every drag has a
 * non-drag equivalent (click for exact entry, arrows for one tick). Colour,
 * material and motion are judged from the rendered evidence, not from here.
 */

describe('PositionChip', () => {
  const renderChip = (overrides: Partial<Parameters<typeof PositionChip>[0]> = {}) => {
    const onManage = vi.fn();
    const onClose = vi.fn();
    render(
      <PositionChip
        y={40}
        side="buy"
        quantityFormatted=".10"
        pnlFormatted="+$7.80"
        pnlTone="positive"
        syncState="confirmed"
        syncLabel={null}
        entryPriceFormatted="1.08420"
        symbol="EURUSD"
        onManage={onManage}
        onClose={onClose}
        closeDisabled={false}
        showCloseButton
        {...overrides}
      />,
    );
    return { onManage, onClose };
  };

  it('states side, size and live money on the chip itself', () => {
    renderChip();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('.10')).toBeInTheDocument();
    expect(screen.getByTestId('chart-position-chip-pnl')).toHaveTextContent('+$7.80');
  });

  it('keeps the instrument and the entry price in the accessible name rather than on the face', () => {
    renderChip();
    const chip = screen.getByTestId('chart-position-chip');
    expect(chip).toHaveAccessibleName(/EURUSD/);
    expect(chip).toHaveAccessibleName(/1\.08420/);
  });

  it('opens management from the chip and closes the position from the × segment', async () => {
    const user = userEvent.setup();
    const { onManage, onClose } = renderChip();
    await user.click(screen.getByTestId('chart-position-chip'));
    expect(onManage).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Fermer la position EURUSD' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides the close segment where the layout cannot carry it', () => {
    renderChip({ showCloseButton: false });
    expect(
      screen.queryByRole('button', { name: 'Fermer la position EURUSD' }),
    ).not.toBeInTheDocument();
  });
});

describe('TradeLevelChip', () => {
  const renderLevel = (overrides: Partial<Parameters<typeof TradeLevelChip>[0]> = {}) => {
    const onKeyboardAdjust = vi.fn();
    const onActivate = vi.fn();
    const onRemove = vi.fn();
    render(
      <TradeLevelChip
        y={60}
        kind="stop_loss"
        priceFormatted="1.08270"
        pnlFormatted="−$63.00"
        quantityFormatted=".10"
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

  /** §14/§15 — the consequence in money is the headline, not the price. */
  it('leads with the money the level is worth', () => {
    renderLevel();
    expect(screen.getByTestId('chart-level-chip-stop_loss-pnl')).toHaveTextContent('−$63.00');
    expect(screen.getByText('SL')).toBeInTheDocument();
    expect(screen.getByText('.10')).toBeInTheDocument();
  });

  it('names the level, its price and its size for assistive technology', () => {
    renderLevel({ kind: 'take_profit', pnlFormatted: '+$95.70', priceFormatted: '1.08650' });
    expect(screen.getByTestId('chart-level-chip-take_profit')).toHaveAccessibleName(
      /Take Profit à 1\.08650, \+\$95\.70 sur \.10/,
    );
  });

  it('ArrowUp/ArrowDown adjust by one tick — the non-drag alternative', async () => {
    const user = userEvent.setup();
    const { onKeyboardAdjust } = renderLevel();
    screen.getByTestId('chart-level-chip-stop_loss').focus();
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{ArrowDown}');
    expect(onKeyboardAdjust).toHaveBeenNthCalledWith(1, 1);
    expect(onKeyboardAdjust).toHaveBeenNthCalledWith(2, -1);
  });

  it('does not adjust when the level is disabled', async () => {
    const user = userEvent.setup();
    const { onKeyboardAdjust } = renderLevel({ disabled: true });
    screen.getByTestId('chart-level-chip-stop_loss').focus();
    await user.keyboard('{ArrowUp}');
    expect(onKeyboardAdjust).not.toHaveBeenCalled();
  });

  it('removes the level from its × segment and opens exact entry from the value', async () => {
    const user = userEvent.setup();
    const { onRemove, onActivate } = renderLevel();
    await user.click(screen.getByRole('button', { name: 'Retirer le Stop Loss' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId('chart-level-chip-stop_loss'));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  /** §36 — a phone carries the money and the label, and nothing else. */
  it('drops the size and remove segments in the compact presentation', () => {
    renderLevel({ compact: true });
    expect(screen.getByTestId('chart-level-chip-stop_loss-pnl')).toHaveTextContent('−$63.00');
    expect(screen.queryByText('.10')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retirer le Stop Loss' })).not.toBeInTheDocument();
  });
});

/**
 * VX1-D.1 §5 — the protection controls are *actions*, not levels.
 *
 * `AddLevelChip` used to render two independently anchored pseudo-levels
 * stacked under the entry chip at fixed pixel offsets, which put a long's take
 * profit *below* its entry and made two actions look like two prices the
 * position already had. One cluster replaces both, and these tests pin the
 * things that must survive the change: both actions reachable, the drag
 * gesture intact, and a stale market explaining itself.
 */
describe('PositionProtectionControls', () => {
  function renderControls(over: Partial<Parameters<typeof PositionProtectionControls>[0]> = {}) {
    return render(
      <PositionProtectionControls
        y={20}
        disabled={false}
        disabledReason={null}
        onStopPointerDown={() => {}}
        onTargetPointerDown={() => {}}
        onActivate={() => {}}
        {...over}
      />,
    );
  }

  it('offers both protections as one cluster, in a single row', () => {
    renderControls();
    expect(screen.getByTestId('chart-protection-controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Placer un Stop Loss' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Placer un Take Profit' })).toBeInTheDocument();
  });

  it('is disabled with a title explaining why when the price is stale', () => {
    renderControls({ disabled: true, disabledReason: 'Prix obsolète.' });
    const stop = screen.getByRole('button', { name: 'Placer un Stop Loss' });
    expect(stop).toBeDisabled();
    expect(stop).toHaveAttribute('title', 'Prix obsolète.');
    expect(screen.getByRole('button', { name: 'Placer un Take Profit' })).toBeDisabled();
  });

  it('calls onActivate on click — the non-drag, keyboard-accessible path', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderControls({ onActivate });
    await user.click(screen.getByRole('button', { name: 'Placer un Take Profit' }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('starts each side’s own drag — the gesture that turns an action into a level', () => {
    const onStopPointerDown = vi.fn();
    const onTargetPointerDown = vi.fn();
    renderControls({ onStopPointerDown, onTargetPointerDown });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Placer un Stop Loss' }));
    expect(onStopPointerDown).toHaveBeenCalledTimes(1);
    expect(onTargetPointerDown).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Placer un Take Profit' }));
    expect(onTargetPointerDown).toHaveBeenCalledTimes(1);
  });
});
