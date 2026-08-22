'use client';

import { useActionState } from 'react';
import { Alert, Button, Input } from '@wariba/ui';
import { AuthFooterLink, AuthShell } from '../AuthShell';
import { productCopy } from '../../../lib/product-copy';
import { requestPasswordResetAction, type PasswordResetActionResult } from '../actions';

const copy = productCopy.auth.forgotPassword;
const initialState: PasswordResetActionResult = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  /*
   * The success screen says the same thing whether or not the address is
   * registered. Confirming "we found your account" would turn this form into
   * an account-existence oracle for anyone with a list of e-mails.
   */
  if (state.submitted) {
    return (
      <AuthShell title={copy.sentTitle} subtitle={copy.sentBody}>
        <AuthFooterLink href="/login" label={copy.backToLogin} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      footer={<AuthFooterLink href="/login" label={copy.backToLogin} />}
    >
      <form action={formAction} className="flex flex-col gap-5">
        <Input
          label={copy.email}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
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
