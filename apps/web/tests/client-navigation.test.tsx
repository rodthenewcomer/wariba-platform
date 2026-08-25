import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlDocumentLink } from '../app/(control)/ControlDocumentLink';
import { PerformanceAcknowledgementForm } from '../app/(platform)/comptes/[publicId]/PerformanceAcknowledgementForm';
import { IdentityReviewRequestForm } from '../app/(platform)/verification-identite/IdentityReviewRequestForm';

const actions = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  requestIdentity: vi.fn(),
}));

vi.mock('../app/(platform)/comptes/[publicId]/actions', () => ({
  acknowledgePerformanceRulesAction: actions.acknowledge,
}));

vi.mock('../app/(platform)/verification-identite/actions', () => ({
  requestIdentityReviewAction: actions.requestIdentity,
}));

describe('critical document navigation', () => {
  beforeEach(() => {
    actions.acknowledge.mockReset();
    actions.requestIdentity.mockReset();
  });

  it('leaves Control link navigation to the browser', () => {
    render(<ControlDocumentLink href="/control/support/WRB-01017">WRB-01017</ControlDocumentLink>);
    const link = screen.getByRole('link', { name: 'WRB-01017' });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    let intercepted = true;

    /* Prevent jsdom's unimplemented document load after observing ownership. */
    link.addEventListener(
      'click',
      (event) => {
        intercepted = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    fireEvent(link, click);

    expect(link).toHaveAttribute('href', '/control/support/WRB-01017');
    expect(link.tagName).toBe('A');
    expect(intercepted).toBe(false);
  });

  it('locks acknowledgement after one submit and exposes human pending copy', async () => {
    let finish: ((result: { error: string }) => void) | undefined;
    actions.acknowledge.mockImplementation(
      () =>
        new Promise<{ error: string }>((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<PerformanceAcknowledgementForm accountPublicId="PERF-01017" />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByTestId('performance-rules-submit'));

    const submit = screen.getByTestId('performance-rules-submit');
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent('Ouverture de votre compte…');
    expect(actions.acknowledge).toHaveBeenCalledTimes(1);

    fireEvent.submit(screen.getByTestId('performance-rules-acknowledgement'));
    expect(actions.acknowledge).toHaveBeenCalledTimes(1);

    finish?.({ error: 'Impossible de continuer pour le moment. Réessayez.' });
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de continuer');
  });

  it('locks an identity request while the authoritative command is pending', async () => {
    let reject: ((reason: Error) => void) | undefined;
    actions.requestIdentity.mockImplementation(
      () =>
        new Promise((_resolve, rejectPromise) => {
          reject = rejectPromise;
        }),
    );
    const user = userEvent.setup();
    render(<IdentityReviewRequestForm accountId="account-identity" />);

    await user.click(screen.getByTestId('kyc-action'));
    const submit = screen.getByTestId('kyc-action');
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent('Envoi de la demande…');
    expect(actions.requestIdentity).toHaveBeenCalledTimes(1);

    fireEvent.submit(submit.closest('form') as HTMLFormElement);
    expect(actions.requestIdentity).toHaveBeenCalledTimes(1);

    reject?.(new Error('test-only failure'));
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible d’envoyer la demande');
  });
});
