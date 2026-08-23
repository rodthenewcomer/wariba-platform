'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@wariba/ui';
import { AuthNotice } from '../AuthNotice';
import { productCopy } from '../../../lib/product-copy';
import { resendVerificationAction, type ResendVerificationResult } from '../actions';

const copy = productCopy.auth.emailVerification;
const initialState: ResendVerificationResult = {};
const COOLDOWN_SECONDS = 60;

/**
 * Re-sends the verification e-mail, then refuses to do it again for a minute.
 *
 * The cooldown is stated as a countdown rather than by disabling a silent
 * button: a control that stops working without saying why reads as broken, and
 * the person's next move is to click it repeatedly.
 *
 * The address is never taken from this component — the action reads it from
 * the session, so this cannot be used to send mail to an arbitrary address.
 */
export function ResendControl() {
  const [state, formAction, pending] = useActionState(resendVerificationAction, initialState);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!state.sent) return;
    setRemaining(COOLDOWN_SECONDS);
  }, [state.sent]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1_000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return (
    <div className="flex flex-col gap-4">
      {state.sent && remaining > 0 ? (
        <AuthNotice tone="success" title={copy.resentBody}>
          {copy.resendCooldown(remaining)}
        </AuthNotice>
      ) : null}

      {state.error ? (
        <AuthNotice title={productCopy.auth.login.errorTitle}>{state.error}</AuthNotice>
      ) : null}

      <form action={formAction}>
        <Button
          type="submit"
          size="lg"
          variant="secondary"
          loading={pending}
          disabled={remaining > 0}
          className="w-full"
          data-testid="resend-verification"
        >
          {pending ? copy.resending : remaining > 0 ? copy.resendCooldown(remaining) : copy.resend}
        </Button>
      </form>
    </div>
  );
}
