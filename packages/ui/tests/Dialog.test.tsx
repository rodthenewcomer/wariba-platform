import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { Dialog } from '../src/components/Dialog.js';

// jsdom does not implement HTMLDialogElement.showModal()/close() (why this
// component had zero tests before) — polyfill just enough real <dialog>
// semantics for the onClose-dismissal contract under test: showModal/close
// toggle `open` and close() dispatches a real 'close' event, exactly like a
// browser, so the component's actual event wiring — not a mock of it — is
// what gets exercised.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

function Example() {
  const [open, setOpen] = useState(true);
  const [closeCount, setCloseCount] = useState(0);
  return (
    <>
      <Dialog
        open={open}
        onClose={() => {
          setCloseCount((c) => c + 1);
          setOpen(false);
        }}
        title="Confirmer"
      >
        Contenu
      </Dialog>
      <span data-testid="close-count">{closeCount}</span>
    </>
  );
}

describe('Dialog', () => {
  it('calls onClose exactly once when the × button is clicked', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(screen.getByTestId('close-count').textContent).toBe('1');
  });

  it('calls onClose exactly once for the Escape/cancel dismissal path', () => {
    // jsdom doesn't implement <dialog>'s real Escape-key behavior, but the
    // browser's actual sequence is: a 'cancel' event fires first (with no
    // app-level handler attached — that's the regression this guards:
    // Dialog must NOT wire an onCancel handler, since the 'cancel' event's
    // own default action is what closes the dialog and fires 'close' right
    // after; wiring onClose to both was the double-fire bug), then its
    // unprevented default action closes the dialog, firing exactly one
    // 'close' event.
    render(<Example />);
    const dialog = screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;

    act(() => {
      // No app-level 'cancel' listener is attached (that's the regression
      // guard), so this is a no-op other than proving it doesn't itself
      // call onClose. The browser's real unprevented default action for
      // 'cancel' is exactly dialog.close() — atomically flips `open` and
      // fires one real 'close' event, same as the polyfill below.
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      dialog.close();
    });

    expect(screen.getByTestId('close-count').textContent).toBe('1');
  });

  it('calls onClose exactly once when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const dialog = screen.getByRole('dialog', { hidden: true });

    // A real backdrop click targets the <dialog> element itself (the
    // content lives in an inner <div>), which is what the component's
    // `event.target === ref.current` check relies on.
    await user.click(dialog);

    expect(screen.getByTestId('close-count').textContent).toBe('1');
  });
});
