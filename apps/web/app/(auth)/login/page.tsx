'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, Card, Input, Text } from '@wariba/ui';
import { signInAction, type ActionResult } from '../actions';

const initialState: ActionResult = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const searchParams = useSearchParams();

  return (
    <main>
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Connexion
          </Text>
          <Text variant="body-sm" color="secondary">
            Accédez à votre compte WARIBA.
          </Text>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={searchParams.get('next') ?? '/hub'} />
          <Input label="Adresse email" type="email" name="email" autoComplete="email" required />
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />

          {state.error && (
            <Alert level="danger" title="Connexion impossible">
              {state.error}
            </Alert>
          )}

          <Button type="submit" size="lg" loading={pending} className="w-full">
            Se connecter
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <Text variant="body-sm" color="secondary">
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="underline">
              Créer un compte
            </Link>
          </Text>
          <Text variant="body-sm" color="secondary">
            <Link href="/mot-de-passe-oublie" className="underline">
              Mot de passe oublié ?
            </Link>
          </Text>
        </div>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-96" aria-label="Chargement de la connexion" />}>
      <LoginForm />
    </Suspense>
  );
}
