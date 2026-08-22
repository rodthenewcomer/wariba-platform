'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Input } from '@wariba/ui';
import { AuthFooterLink, AuthShell } from '../AuthShell';
import { PasswordField } from '../PasswordField';
import { CountryField } from '../CountryField';
import { productCopy } from '../../../lib/product-copy';
import { signUpAction, type ActionResult } from '../actions';

const copy = productCopy.auth.signup;
const initialState: ActionResult = {};

function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const searchParams = useSearchParams();
  /*
   * A visitor who picked an offer and then discovered they needed an account
   * should land back on that offer, not on a generic hub. The value is carried
   * as a hidden field and validated server-side; anything unsafe falls back.
   */
  const returnTo = searchParams.get('returnTo') ?? searchParams.get('next') ?? '';

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      footer={<AuthFooterLink prompt={copy.haveAccount} href="/login" label={copy.signIn} />}
    >
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="language" value="fr" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input label={copy.firstName} name="firstName" autoComplete="given-name" required />
          <Input label={copy.lastName} name="lastName" autoComplete="family-name" required />
        </div>

        <Input
          label={copy.email}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
        />

        <CountryField />

        <PasswordField
          label={copy.password}
          name="password"
          autoComplete="new-password"
          helperText={copy.passwordHint}
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh" aria-label="Chargement de l’inscription" role="status" />
      }
    >
      <SignupForm />
    </Suspense>
  );
}
