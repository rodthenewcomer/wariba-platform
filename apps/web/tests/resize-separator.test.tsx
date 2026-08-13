import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResizeSeparator } from '../app/(trade)/trade/workstation/ResizeSeparator';

function renderSeparator(overrides: Partial<ComponentProps<typeof ResizeSeparator>> = {}) {
  const onCommit = vi.fn();
  const onReset = vi.fn();
  render(
    <div data-workspace-root="">
      <ResizeSeparator
        orientation="vertical"
        label="Largeur du centre d’exécution"
        value={248}
        min={224}
        max={300}
        onCommit={onCommit}
        onReset={onReset}
        direction={-1}
        cssVariable="--warix-execution-width"
        testId="separator"
        {...overrides}
      />
    </div>,
  );
  return { separator: screen.getByTestId('separator'), onCommit, onReset };
}

describe('ResizeSeparator keyboard geometry', () => {
  it('moves the right-dock seam in the physical arrow direction', () => {
    const { separator, onCommit } = renderSeparator();

    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    expect(onCommit).toHaveBeenLastCalledWith(256);

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenLastCalledWith(240);
  });

  it('uses a 24px coarse step with Shift+Arrow', () => {
    const { separator, onCommit } = renderSeparator();

    fireEvent.keyDown(separator, { key: 'ArrowLeft', shiftKey: true });
    expect(onCommit).toHaveBeenCalledWith(272);
  });

  it('keeps Home, End and double-click reset deterministic', () => {
    const { separator, onCommit, onReset } = renderSeparator();

    fireEvent.keyDown(separator, { key: 'Home' });
    expect(onCommit).toHaveBeenLastCalledWith(224);

    fireEvent.keyDown(separator, { key: 'End' });
    expect(onCommit).toHaveBeenLastCalledWith(300);

    fireEvent.doubleClick(separator);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('maps ArrowUp to growth for the bottom dock', () => {
    const { separator, onCommit } = renderSeparator({
      orientation: 'horizontal',
      label: 'Hauteur du dock',
      direction: -1,
      cssVariable: '--warix-dock-height',
    });

    fireEvent.keyDown(separator, { key: 'ArrowUp' });
    expect(onCommit).toHaveBeenCalledWith(256);
  });
});
