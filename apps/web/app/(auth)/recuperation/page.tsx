'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Alert, Button } from '@wariba/ui';
import { AuthFooterLink, AuthShell } from '../AuthShell';
import { PasswordField } from '../PasswordField';
import { productCopy } from '../../../lib/product-copy';
import { updatePasswordAction, type UpdatePasswordActionResult } from '../actions';

const copy = productCopy.auth.resetPassword;
const initialState: UpdatePasswordActionResult = {};

/**
 * Completes a password recovery.
 *
 * The link the provider mailed establishes a recovery session when it is
 * opened; this page then changes the password against that session. There is
 * deliberately no second token mechanism of our own — an expired, invalid or
 * already-used link simply has no session, the update fails, and the page says
 * so instead of appearing to succeed.
 *
 * No automatic sign-in afterwards. Someone who has just changed a credential
 * should present it once.
 */
export default function RecoveryPage() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  if (state.updated) {
    return (
      <AuthShell title={copy.successTitle} subtitle={copy.successBody}>
        <Link
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-[var(--wariba-component-input-radius)] bg-[color:var(--wariba-color-cobalt-600)] px-4 text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-color-white)] transition-[filter,transform] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] active:translate-y-px"
        >
          {copy.signIn}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      footer={<AuthFooterLink href="/mot-de-passe-oublie" label={copy.requestNew} />}
    >
      <form action={formAction} className="flex flex-col gap-5">
        <PasswordField
          label={copy.newPassword}
          name="password"
          autoComplete="new-password"
          helperText={productCopy.auth.signup.passwordHint}
          required
        />
        <PasswordField
          label={copy.confirmPassword}
          name="passwordConfirmation"
          autoComplete="new-password"
          required
        />

        {state.error ? (
          <Alert level="danger" title={copy.errorTitle}>
            {state.error}
          </Alert>
        ) : null}

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {pending ? copy.submitting : copy.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
