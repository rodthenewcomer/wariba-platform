'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Input } from '@wariba/ui';
import { AuthFooterLink, AuthShell } from '../AuthShell';
import { PasswordField } from '../PasswordField';
import { productCopy } from '../../../lib/product-copy';
import { signInAction, type ActionResult } from '../actions';

const copy = productCopy.auth.login;
const initialState: ActionResult = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const searchParams = useSearchParams();
  /*
   * Carried through the form rather than read again after submit: the value is
   * validated server-side by `safeInternalPath`, and a hidden field keeps the
   * intent attached to the submission instead of depending on the URL
   * surviving a redirect. An unsafe value falls back to /hub there.
   */
  const next = searchParams.get('next') ?? searchParams.get('returnTo') ?? '';
  const expired = searchParams.get('raison') === 'session-expiree';

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <AuthFooterLink prompt={copy.noAccount} href="/inscription" label={copy.createAccount} />
      }
    >
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />

        {expired ? (
          <Alert level="information" title={productCopy.auth.sessionExpired.title}>
            {productCopy.auth.sessionExpired.body}
          </Alert>
        ) : null}

        <Input
          label={copy.email}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
        />

        <div className="flex flex-col gap-2">
          <PasswordField
            label={copy.password}
            name="password"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <AuthFooterLink href="/mot-de-passe-oublie" label={copy.forgot} />
          </div>
        </div>

        {state.error ? (
          /* One message for a wrong address and a wrong password alike — see
             the note on `productCopy.auth.login.invalidCredentials`. */
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-dvh" aria-label="Chargement de la connexion" role="status" />}
    >
      <LoginForm />
    </Suspense>
  );
}
