import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BottomSheet } from '../src/components/BottomSheet';

/**
 * W4 visual closure §2/§16 — the sheet's surface, and the one CSS rule that
 * makes a closed one dangerous.
 *
 * jsdom does not implement `HTMLDialogElement.showModal()`/`close()` — same
 * polyfill `Dialog.test.tsx` uses. It also does not apply the UA stylesheet's
 * `dialog:not([open]) { display: none }`, so the "closed sheet is hidden" case
 * below asserts the *class contract* rather than a computed style: what matters
 * is that no unconditional `display` utility is present to override the UA
 * rule.
 */
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

function sheet(): HTMLDialogElement {
  return document.querySelector('dialog') as HTMLDialogElement;
}

describe('BottomSheet', () => {
  it('never sets an unconditional display, so a closed sheet stays hidden', () => {
    /*
     * The regression this exists for, in full.
     *
     * A `<dialog>` is hidden by the UA rule `dialog:not([open]) { display: none }`,
     * and *any* explicit `display` in a class beats it. Giving the sheet a bare
     * `flex` (to lay out a pinned header and footer) therefore turned every
     * closed sheet into a full-width, invisible, page-covering click blocker.
     *
     * It is not a hypothetical: `TradeRiskDetail` mounts its sheet permanently
     * and merely closes it, so a single `flex` here made the workstation's
     * quantity stepper unclickable — the E2E timed out with the closed risk
     * sheet "intercepting pointer events".
     *
     * `open:flex` gives the same layout only while the dialog is open.
     */
    render(
      <BottomSheet open={false} onClose={() => {}} title="Fermé">
        <p>contenu</p>
      </BottomSheet>,
    );

    const classes = sheet().className.split(/\s+/);
    expect(classes).toContain('open:flex');
    for (const forbidden of ['flex', 'block', 'grid', 'inline-flex', 'inline-block']) {
      expect(classes).not.toContain(forbidden);
    }
  });

  it('paints the workspace theme surface rather than the UA white canvas', () => {
    // §2 — the dark Execution Center used to render inside a white iOS-looking
    // modal shell, with a white-on-white title.
    render(
      <BottomSheet open onClose={() => {}} title="Trader EURUSD">
        <p>contenu</p>
      </BottomSheet>,
    );

    const classes = sheet().className;
    expect(classes).toContain('bg-[color:var(--wariba-theme-surface)]');
    expect(classes).toContain('text-[color:var(--wariba-theme-text)]');
    // Theme tokens, not a hard-coded dark palette: that is what keeps one fix
    // correct in `(trade)`, `(control)` and `(marketing)` alike.
    expect(classes).not.toMatch(/bg-\[#|bg-black|bg-slate|bg-gray/);
  });

  it('titles the sheet accessibly and readably', () => {
    render(
      <BottomSheet open onClose={() => {}} title="Trader EURUSD">
        <p>contenu</p>
      </BottomSheet>,
    );

    const heading = screen.getByRole('heading', { name: 'Trader EURUSD' });
    expect(heading.className).toContain('text-[color:var(--wariba-theme-text)]');
    expect(sheet().getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('opens to a working height when asked, and hugs its content otherwise', () => {
    // §3 — the execution sheet must open to a useful trading height rather than
    // to the height of whatever happens to be in it.
    const { rerender } = render(
      <BottomSheet open onClose={() => {}} title="A">
        <p>contenu</p>
      </BottomSheet>,
    );
    expect(sheet().className).toContain('max-h-[85dvh]');
    expect(sheet().className).not.toContain('h-[90dvh]');

    rerender(
      <BottomSheet open onClose={() => {}} title="A" size="tall">
        <p>contenu</p>
      </BottomSheet>,
    );
    expect(sheet().className).toContain('h-[90dvh]');
  });

  it('hands the box to its content when flush, and keeps padding otherwise', () => {
    const { rerender } = render(
      <BottomSheet open onClose={() => {}} title="A">
        <p data-testid="body">contenu</p>
      </BottomSheet>,
    );
    const padded = screen.getByTestId('body').parentElement as HTMLElement;
    expect(padded.className).toContain('p-[var(--wariba-component-bottom-sheet-padding)]');

    rerender(
      <BottomSheet open onClose={() => {}} title="A" flush>
        <p data-testid="body">contenu</p>
      </BottomSheet>,
    );
    const flush = screen.getByTestId('body').parentElement as HTMLElement;
    expect(flush.className).not.toContain('p-[var(--wariba-component-bottom-sheet-padding)]');
  });

  it('closes through the native close event only, never twice', () => {
    // Unchanged behaviour, asserted because the surface work touched this file:
    // Escape and backdrop dismissal both settle through `close`.
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="A">
        <p>contenu</p>
      </BottomSheet>,
    );

    sheet().close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
